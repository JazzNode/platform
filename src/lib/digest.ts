import { createAdminClient } from '@/utils/supabase/admin';

export interface DigestData {
  entityType: 'venue' | 'artist';
  entityId: string;
  displayName: string;
  slug: string;
  totalViews: number;
  viewsChange: number | null; // percentage change vs previous week, null if no prior data
  newFollowers: number;
  upcomingEvents: {
    title: string;
    date: string;
    artistCount: number;
  }[];
}

/**
 * Get the start of the current week (7 days ago) and previous week (14 days ago)
 * relative to the provided date.
 */
function getWeekBoundaries(now: Date) {
  const thisWeekStart = new Date(now);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  const lastWeekStart = new Date(now);
  lastWeekStart.setDate(lastWeekStart.getDate() - 14);

  return {
    thisWeekStart: thisWeekStart.toISOString(),
    lastWeekStart: lastWeekStart.toISOString(),
    now: now.toISOString(),
  };
}

export async function getVenueWeeklyDigest(
  venueId: string
): Promise<DigestData | null> {
  const supabase = createAdminClient();
  const now = new Date();
  const { thisWeekStart, lastWeekStart } = getWeekBoundaries(now);

  // Get venue info
  const { data: venue } = await supabase
    .from('venues')
    .select('venue_id, display_name, slug')
    .eq('venue_id', venueId)
    .single();

  if (!venue) return null;

  // Page views this week
  const { count: thisWeekViews } = await supabase
    .from('venue_page_views')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .gte('viewed_at', thisWeekStart);

  // Page views last week (for comparison)
  const { count: lastWeekViews } = await supabase
    .from('venue_page_views')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .gte('viewed_at', lastWeekStart)
    .lt('viewed_at', thisWeekStart);

  // New followers this week
  const { count: newFollowers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', 'venue')
    .eq('target_id', venueId)
    .gte('created_at', thisWeekStart);

  // Upcoming events in the next 7 days
  const nextWeekEnd = new Date(now);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const { data: events } = await supabase
    .from('events')
    .select('title_en, title_local, start_at, artist_id')
    .contains('venue_id', [venueId])
    .gte('start_at', now.toISOString())
    .lte('start_at', nextWeekEnd.toISOString())
    .order('start_at')
    .limit(5);

  const totalViews = thisWeekViews ?? 0;
  const prevViews = lastWeekViews ?? 0;
  const viewsChange =
    prevViews > 0
      ? Math.round(((totalViews - prevViews) / prevViews) * 100)
      : null;

  const upcomingEvents = (events ?? []).map((e) => ({
    title: e.title_en || e.title_local || 'Untitled Event',
    date: e.start_at,
    artistCount: Array.isArray(e.artist_id) ? e.artist_id.length : 0,
  }));

  return {
    entityType: 'venue',
    entityId: venue.venue_id,
    displayName: venue.display_name ?? 'Unknown Venue',
    slug: venue.slug ?? '',
    totalViews,
    viewsChange,
    newFollowers: newFollowers ?? 0,
    upcomingEvents,
  };
}

export async function getArtistWeeklyDigest(
  artistId: string
): Promise<DigestData | null> {
  const supabase = createAdminClient();
  const now = new Date();
  const { thisWeekStart, lastWeekStart } = getWeekBoundaries(now);

  // Get artist info
  const { data: artist } = await supabase
    .from('artists')
    .select('artist_id, display_name, slug')
    .eq('artist_id', artistId)
    .single();

  if (!artist) return null;

  // Page views this week
  const { count: thisWeekViews } = await supabase
    .from('artist_page_views')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .gte('viewed_at', thisWeekStart);

  // Page views last week
  const { count: lastWeekViews } = await supabase
    .from('artist_page_views')
    .select('*', { count: 'exact', head: true })
    .eq('artist_id', artistId)
    .gte('viewed_at', lastWeekStart)
    .lt('viewed_at', thisWeekStart);

  // New followers this week
  const { count: newFollowers } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('target_type', 'artist')
    .eq('target_id', artistId)
    .gte('created_at', thisWeekStart);

  // Upcoming events in the next 7 days
  const nextWeekEnd = new Date(now);
  nextWeekEnd.setDate(nextWeekEnd.getDate() + 7);

  const { data: events } = await supabase
    .from('events')
    .select('title_en, title_local, start_at, artist_id')
    .contains('artist_id', [artistId])
    .gte('start_at', now.toISOString())
    .lte('start_at', nextWeekEnd.toISOString())
    .order('start_at')
    .limit(5);

  const totalViews = thisWeekViews ?? 0;
  const prevViews = lastWeekViews ?? 0;
  const viewsChange =
    prevViews > 0
      ? Math.round(((totalViews - prevViews) / prevViews) * 100)
      : null;

  const upcomingEvents = (events ?? []).map((e) => ({
    title: e.title_en || e.title_local || 'Untitled Event',
    date: e.start_at,
    artistCount: Array.isArray(e.artist_id) ? e.artist_id.length : 0,
  }));

  return {
    entityType: 'artist',
    entityId: artist.artist_id,
    displayName: artist.display_name ?? 'Unknown Artist',
    slug: artist.slug ?? '',
    totalViews,
    viewsChange,
    newFollowers: newFollowers ?? 0,
    upcomingEvents,
  };
}
