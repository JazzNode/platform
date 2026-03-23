import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { revalidateTag } from 'next/cache';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

function sha1Hex(s: string) {
  return crypto.createHash('sha1').update(s).digest('hex');
}

function generateLineupId(eventId: string, artistName: string, order: number) {
  const orderStr = String(order).padStart(2, '0');
  const canonical = artistName.trim().toLowerCase().normalize('NFKC');
  const hashed = sha1Hex(`${canonical}|${orderStr}`).slice(0, 8);
  return `auto-${eventId}-${hashed}-${orderStr}`;
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

// ─── GET: Single event with lineup ───

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;
  const supabase = createAdminClient();

  const { data: event, error } = await supabase
    .from('events')
    .select('*')
    .eq('event_id', eventId)
    .maybeSingle();

  if (error || !event) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  // Auth check
  const { isAuthorized } = await verifyVenueClaimToken(
    req.headers.get('authorization'),
    event.venue_id,
  );
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch lineup with artist info
  const { data: lineups } = await supabase
    .from('lineups')
    .select('lineup_id, artist_id, instrument_list, role, sort_order')
    .eq('event_id', eventId)
    .order('sort_order', { ascending: true });

  let lineupWithArtists: Array<Record<string, unknown>> = [];
  if (lineups && lineups.length > 0) {
    const artistIds = [...new Set(lineups.map((l) => l.artist_id).filter(Boolean))];
    const { data: artists } = await supabase
      .from('artists')
      .select('artist_id, name_local, name_en, display_name, photo_url, primary_instrument, instrument_list, type')
      .in('artist_id', artistIds);

    const artistMap = Object.fromEntries((artists || []).map((a) => [a.artist_id, a]));

    lineupWithArtists = lineups.map((l) => ({
      ...l,
      artist: artistMap[l.artist_id] || null,
    }));
  }

  return NextResponse.json({
    event: {
      ...event,
      is_editable: event.data_source === 'venue-owner',
    },
    lineup: lineupWithArtists,
  });
}

// ─── PUT: Update event ───

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  try {
    const body = await req.json();
    const supabase = createAdminClient();

    // Fetch existing event
    const { data: event } = await supabase
      .from('events')
      .select('event_id, venue_id, data_source, title_local, description_raw, lifecycle_status')
      .eq('event_id', eventId)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.data_source !== 'venue-owner') {
      return NextResponse.json({ error: 'Cannot edit scraper-managed events' }, { status: 403 });
    }

    const { isAuthorized, userId } = await verifyVenueClaimToken(
      req.headers.get('authorization'),
      event.venue_id,
    );
    if (!isAuthorized || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Build update patch
    const validSubtypes = ['standard_show', 'jam_session', 'showcase'];
    const patch: Record<string, unknown> = { updated_by: userId };

    if (body.title_local !== undefined) patch.title_local = body.title_local?.trim() || null;
    if (body.start_at !== undefined) patch.start_at = body.start_at;
    if (body.end_at !== undefined) patch.end_at = body.end_at || null;
    if (body.subtype !== undefined) patch.subtype = validSubtypes.includes(body.subtype) ? body.subtype : null;
    if (body.price_info !== undefined) patch.price_info = body.price_info?.trim() || null;
    if (body.description_raw !== undefined) patch.description_raw = body.description_raw?.trim() || null;
    if (body.poster_url !== undefined) patch.poster_url = body.poster_url || null;

    // Handle lifecycle_status transitions
    if (body.lifecycle_status !== undefined) {
      if (body.lifecycle_status === 'confirmed') {
        patch.lifecycle_status = 'upcoming';
      } else if (['draft', 'cancelled'].includes(body.lifecycle_status)) {
        patch.lifecycle_status = body.lifecycle_status;
      }
    }

    const { error: updateError } = await supabase
      .from('events')
      .update(patch)
      .eq('event_id', eventId);

    if (updateError) throw new Error(`Event update failed: ${updateError.message}`);

    // Handle lineup update
    if (body.lineup !== undefined) {
      const lineup: LineupMemberInput[] = body.lineup;

      // Delete existing lineups
      await supabase.from('lineups').delete().eq('event_id', eventId);

      // Create new lineup entries
      if (lineup.length > 0) {
        const lineupRows: Array<Record<string, unknown>> = [];

        for (const member of lineup) {
          let artistId = member.artist_id;
          let artistName = '';

          if (!artistId && member.new_artist?.name_local) {
            const newArtist = member.new_artist;
            artistId = generateArtistId(newArtist.name_local);
            artistName = newArtist.name_local;

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
            const { data: a } = await supabase
              .from('artists')
              .select('display_name, name_local, name_en')
              .eq('artist_id', artistId)
              .maybeSingle();
            artistName = a?.display_name || a?.name_local || a?.name_en || artistId;
          }

          if (artistId) {
            lineupRows.push({
              lineup_id: generateLineupId(eventId, artistName, member.sort_order),
              event_id: eventId,
              artist_id: artistId,
              sort_order: member.sort_order,
              instrument_list: member.instrument_list?.length ? member.instrument_list : null,
              role: member.role || 'sideman',
            });
          }
        }

        if (lineupRows.length > 0) {
          await supabase.from('lineups').insert(lineupRows);

          // Update primary_artist to first lineup member
          await supabase
            .from('events')
            .update({ primary_artist_id: lineupRows[0].artist_id as string })
            .eq('event_id', eventId);
        }
      }
    }

    revalidateTag('events', { expire: 0 });

    writeAuditLog({
      adminUserId: userId,
      action: 'venue_update_event',
      entityType: 'event',
      entityId: eventId,
      details: { venueId: event.venue_id, fieldsUpdated: Object.keys(patch) },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    // Re-trigger content generation if title/description changed on confirmed event
    const needsRegen =
      (patch.lifecycle_status === 'upcoming' && event.lifecycle_status === 'draft') ||
      (event.lifecycle_status === 'upcoming' && (patch.title_local || patch.description_raw));

    if (needsRegen) {
      try {
        const baseUrl = req.nextUrl.origin;
        fetch(`${baseUrl}/api/venue/events/generate-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: req.headers.get('authorization') || '',
          },
          body: JSON.stringify({ eventId, venueId: event.venue_id }),
        }).catch(() => {});
      } catch {
        // Non-blocking
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Venue event update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}

// ─── DELETE: Soft delete (cancel) ───

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  const { eventId } = await params;

  try {
    const supabase = createAdminClient();

    const { data: event } = await supabase
      .from('events')
      .select('event_id, venue_id, data_source')
      .eq('event_id', eventId)
      .maybeSingle();

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (event.data_source !== 'venue-owner') {
      return NextResponse.json({ error: 'Cannot delete scraper-managed events' }, { status: 403 });
    }

    const { isAuthorized, userId } = await verifyVenueClaimToken(
      req.headers.get('authorization'),
      event.venue_id,
    );
    if (!isAuthorized || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error: updateError } = await supabase
      .from('events')
      .update({ lifecycle_status: 'cancelled', updated_by: userId })
      .eq('event_id', eventId);

    if (updateError) throw new Error(`Delete failed: ${updateError.message}`);

    revalidateTag('events', { expire: 0 });

    writeAuditLog({
      adminUserId: userId,
      action: 'venue_cancel_event',
      entityType: 'event',
      entityId: eventId,
      details: { venueId: event.venue_id },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Venue event delete error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Delete failed' },
      { status: 500 },
    );
  }
}
