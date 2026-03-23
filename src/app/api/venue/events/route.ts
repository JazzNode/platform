import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { revalidateTag } from 'next/cache';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

// ─── Helpers ───

function sha1Hex(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function generateVenueEventId(venueId: string, startAt: string, title: string, userId: string) {
  const date = startAt.slice(0, 10);
  const hhmm = startAt.slice(11, 16).replace(':', '');
  const hash = sha1Hex(`venue-dashboard|${userId}|${startAt}|${title}|${venueId}`).slice(0, 8);
  return `vm-${date}_${venueId}_${hhmm}_${hash}`;
}

function slugify(s: string) {
  return s
    .toLowerCase()
    .normalize('NFKC')
    .replace(/['']/g, '')
    .replace(/[^a-z0-9\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function generateArtistId(name: string) {
  const canonical = name.trim().toLowerCase().normalize('NFKC');
  const slug = slugify(name) || 'artist';
  const h6 = sha1Hex(canonical).slice(0, 6);
  return `auto-${slug}-${h6}`;
}

function generateLineupId(eventId: string, artistName: string, order: number) {
  const orderStr = String(order).padStart(2, '0');
  const canonical = artistName.trim().toLowerCase().normalize('NFKC');
  const hashed = sha1Hex(`${canonical}|${orderStr}`).slice(0, 8);
  return `auto-${eventId}-${hashed}-${orderStr}`;
}

// ─── Interfaces ───

interface LineupMemberInput {
  artist_id: string | null;
  new_artist?: {
    name_local: string;
    name_en?: string;
    primary_instrument?: string;
  };
  instrument_list?: string[];
  role?: string;
  sort_order: number;
}

interface CreateEventBody {
  venueId: string;
  title_local: string;
  start_at: string;
  end_at?: string;
  subtype?: string;
  price_info?: string;
  description_raw?: string;
  lifecycle_status?: 'draft' | 'confirmed';
  lineup?: LineupMemberInput[];
  poster_url?: string;
}

// ─── GET: List venue events ───

export async function GET(req: NextRequest) {
  const venueId = req.nextUrl.searchParams.get('venueId');
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
  }

  const { isAuthorized } = await verifyVenueClaimToken(
    req.headers.get('authorization'),
    venueId,
  );
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();

    // Fetch events for this venue
    const { data: events, error } = await supabase
      .from('events')
      .select('event_id, title_local, title_en, start_at, end_at, subtype, lifecycle_status, poster_url, price_info, data_source, description_raw, created_at')
      .eq('venue_id', venueId)
      .not('lifecycle_status', 'eq', 'cancelled')
      .order('start_at', { ascending: false })
      .limit(100);

    if (error) throw error;

    // Fetch lineups + artists for all events
    const eventIds = (events || []).map((e) => e.event_id);
    let lineupMap: Record<string, Array<{ artist_id: string; display_name: string; name_local: string; name_en: string; photo_url: string; instrument_list: string[]; role: string; sort_order: number }>> = {};

    if (eventIds.length > 0) {
      const { data: lineups } = await supabase
        .from('lineups')
        .select('event_id, artist_id, instrument_list, role, sort_order')
        .in('event_id', eventIds)
        .order('sort_order', { ascending: true });

      if (lineups && lineups.length > 0) {
        const artistIds = [...new Set(lineups.map((l) => l.artist_id).filter(Boolean))];
        const { data: artists } = await supabase
          .from('artists')
          .select('artist_id, display_name, name_local, name_en, photo_url')
          .in('artist_id', artistIds);

        const artistMap = Object.fromEntries((artists || []).map((a) => [a.artist_id, a]));

        for (const l of lineups) {
          if (!l.event_id || !l.artist_id) continue;
          const artist = artistMap[l.artist_id];
          if (!lineupMap[l.event_id]) lineupMap[l.event_id] = [];
          lineupMap[l.event_id].push({
            artist_id: l.artist_id,
            display_name: artist?.display_name || artist?.name_local || artist?.name_en || '',
            name_local: artist?.name_local || '',
            name_en: artist?.name_en || '',
            photo_url: artist?.photo_url || '',
            instrument_list: l.instrument_list || [],
            role: l.role || '',
            sort_order: l.sort_order,
          });
        }
      }
    }

    const result = (events || []).map((e) => ({
      ...e,
      is_editable: e.data_source === 'venue-owner',
      lineup: lineupMap[e.event_id] || [],
    }));

    return NextResponse.json({ events: result });
  } catch (err) {
    console.error('Venue events list error:', err);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

// ─── POST: Create event ───

export async function POST(req: NextRequest) {
  try {
    const body: CreateEventBody = await req.json();
    const { venueId, title_local, start_at, lineup } = body;

    if (!venueId || !title_local?.trim() || !start_at) {
      return NextResponse.json({ error: 'Missing required fields: venueId, title_local, start_at' }, { status: 400 });
    }

    const { isAuthorized, userId } = await verifyVenueClaimToken(
      req.headers.get('authorization'),
      venueId,
    );
    if (!isAuthorized || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate subtype
    const validSubtypes = ['standard_show', 'jam_session', 'showcase'];
    const subtype = body.subtype && validSubtypes.includes(body.subtype) ? body.subtype : null;

    const supabase = createAdminClient();

    // Look up venue timezone
    const { data: venue } = await supabase
      .from('venues')
      .select('timezone, city_id')
      .eq('venue_id', venueId)
      .single();

    let timezone = venue?.timezone || null;
    if (!timezone && venue?.city_id) {
      const { data: city } = await supabase
        .from('cities')
        .select('timezone')
        .eq('city_id', venue.city_id)
        .single();
      timezone = city?.timezone || null;
    }

    // Generate event ID
    const eventId = generateVenueEventId(venueId, start_at, title_local.trim(), userId);

    // Check for duplicate event ID (extremely unlikely but safe)
    const { data: existing } = await supabase
      .from('events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'An event with the same details already exists' }, { status: 409 });
    }

    const lifecycleStatus = body.lifecycle_status === 'confirmed' ? 'upcoming' : 'draft';

    // Process lineup: create new artists if needed
    const lineupEntries: Array<{ artist_id: string; instrument_list: string[]; role: string; sort_order: number; artist_name: string }> = [];

    if (lineup && lineup.length > 0) {
      for (const member of lineup) {
        let artistId = member.artist_id;
        let artistName = '';

        if (!artistId && member.new_artist?.name_local) {
          // Create new artist
          const newArtist = member.new_artist;
          artistId = generateArtistId(newArtist.name_local);
          artistName = newArtist.name_local;

          // Check if artist already exists (by ID)
          const { data: existingArtist } = await supabase
            .from('artists')
            .select('artist_id')
            .eq('artist_id', artistId)
            .maybeSingle();

          if (!existingArtist) {
            const isCJK = /[\u4e00-\u9fff\u30A0-\u30FF\u3040-\u309F\uAC00-\uD7AF]/.test(newArtist.name_local);
            await supabase.from('artists').insert({
              artist_id: artistId,
              name_local: isCJK ? newArtist.name_local : null,
              name_en: !isCJK ? newArtist.name_local : (newArtist.name_en || null),
              display_name: newArtist.name_local,
              primary_instrument: newArtist.primary_instrument || null,
              instrument_list: newArtist.primary_instrument ? [newArtist.primary_instrument] : null,
              type: 'person',
              verification_status: 'unverified',
              data_source: 'venue-owner',
              updated_by: userId,
            });
          }
        } else if (artistId) {
          // Look up existing artist name for lineup ID generation
          const { data: a } = await supabase
            .from('artists')
            .select('name_local, name_en, display_name')
            .eq('artist_id', artistId)
            .maybeSingle();
          artistName = a?.display_name || a?.name_local || a?.name_en || artistId;
        }

        if (artistId) {
          lineupEntries.push({
            artist_id: artistId,
            instrument_list: member.instrument_list || [],
            role: member.role || 'sideman',
            sort_order: member.sort_order,
            artist_name: artistName,
          });
        }
      }
    }

    // Insert event
    const eventRow: Record<string, unknown> = {
      event_id: eventId,
      title_local: title_local.trim(),
      start_at,
      end_at: body.end_at || null,
      venue_id: venueId,
      timezone,
      subtype,
      price_info: body.price_info?.trim() || null,
      description_raw: body.description_raw?.trim() || null,
      poster_url: body.poster_url || null,
      lifecycle_status: lifecycleStatus,
      source_id: 'venue-dashboard',
      data_source: 'venue-owner',
      created_by: userId,
      updated_by: userId,
      primary_artist_id: lineupEntries.length > 0 ? lineupEntries[0].artist_id : null,
      created_at: new Date().toISOString(),
    };

    const { error: eventError } = await supabase.from('events').insert(eventRow);
    if (eventError) throw new Error(`Event insert failed: ${eventError.message}`);

    // Insert lineups
    const lineupIds: string[] = [];
    if (lineupEntries.length > 0) {
      const lineupRows = lineupEntries.map((l) => {
        const lineupId = generateLineupId(eventId, l.artist_name, l.sort_order);
        lineupIds.push(lineupId);
        return {
          lineup_id: lineupId,
          event_id: eventId,
          artist_id: l.artist_id,
          sort_order: l.sort_order,
          instrument_list: l.instrument_list.length > 0 ? l.instrument_list : null,
          role: l.role,
        };
      });

      const { error: lineupError } = await supabase.from('lineups').insert(lineupRows);
      if (lineupError) {
        console.error('Lineup insert error:', lineupError);
        // Don't fail the whole operation — event is created, lineup is secondary
      }
    }

    revalidateTag('events', { expire: 0 });

    writeAuditLog({
      adminUserId: userId,
      action: 'venue_create_event',
      entityType: 'event',
      entityId: eventId,
      details: { venueId, lifecycleStatus, lineupCount: lineupEntries.length },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    // Trigger content generation for confirmed events (fire-and-forget)
    let contentGenerationQueued = false;
    if (lifecycleStatus === 'upcoming') {
      try {
        const baseUrl = req.nextUrl.origin;
        fetch(`${baseUrl}/api/venue/events/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.get('authorization') || '',
          },
          body: JSON.stringify({ eventId, venueId }),
        }).catch(() => {}); // Fire-and-forget
        contentGenerationQueued = true;
      } catch {
        // Content generation failure is non-blocking
      }
    }

    return NextResponse.json({
      success: true,
      event_id: eventId,
      lineup_ids: lineupIds,
      content_generation_queued: contentGenerationQueued,
    });
  } catch (err) {
    console.error('Venue event create error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Create failed' },
      { status: 500 },
    );
  }
}
