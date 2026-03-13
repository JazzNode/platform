import { NextRequest, NextResponse } from 'next/server';
import { getEvents, getArtists, getVenues, getCities, resolveLinks, buildMap } from '@/lib/supabase';
import { displayName, artistDisplayName, localized, cityName, eventTitle, eventTitleField } from '@/lib/helpers';
import { getSearchableProfiles } from '@/lib/profile';

export const revalidate = 3600;

export async function GET(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get('locale') || 'en';

  const [events, artists, venues, cities, profiles] = await Promise.all([
    getEvents(), getArtists(), getVenues(), getCities(), getSearchableProfiles(),
  ]);

  const now = new Date().toISOString();
  const venueMap = buildMap(venues);
  const artistMap = buildMap(artists);
  const cityMap = buildMap(cities);

  const data = {
    events: events
      .filter((e) => e.fields.start_at && e.fields.start_at >= now)
      .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''))
      .map((e) => {
        const tz = e.fields.timezone || 'Asia/Taipei';
        const venue = resolveLinks(e.fields.venue_id, venueMap)[0];
        const artist = resolveLinks(e.fields.primary_artist, artistMap)[0];
        const d = e.fields.start_at ? new Date(e.fields.start_at) : null;
        return {
          id: e.id,
          title: eventTitle(e.fields, locale),
          title_alt: e.fields.title_en && e.fields.title_local && e.fields.title_en !== e.fields.title_local
            ? (eventTitleField(e.fields, locale) === 'title_local' ? e.fields.title_en : e.fields.title_local)
            : null,
          start_at: e.fields.start_at || null,
          venue_name: venue ? displayName(venue.fields) : '',
          primary_artist_name: artist ? artistDisplayName(artist.fields, locale) : null,
          description_short: localized(e.fields as Record<string, unknown>, 'description_short', locale) || null,
          date_display: d ? d.toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US', { month: 'short', day: 'numeric', timeZone: tz }) : '',
          time_display: d ? d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz }) : '',
        };
      }),
    artists: artists.map((a) => ({
      id: a.id,
      displayName: artistDisplayName(a.fields, locale),
      type: a.fields.type || null,
      primaryInstrument: a.fields.primary_instrument || null,
      countryCode: a.fields.country_code || null,
      bio: localized(a.fields as Record<string, unknown>, 'bio_short', locale) || null,
      photoUrl: a.fields.photo_url || null,
    })),
    venues: venues
      .filter((v) => v.fields.event_list && v.fields.event_list.length > 0)
      .map((v) => {
        const city = resolveLinks(v.fields.city_id, cityMap)[0];
        return {
          id: v.id,
          displayName: displayName(v.fields),
          cityName: city ? cityName(city.fields, locale) : '',
          address: v.fields.address_local || v.fields.address_en || null,
          jazz_frequency: v.fields.jazz_frequency || null,
        };
      }),
    cities: cities
      .filter((c) => venues.some((v) => v.fields.city_id?.includes(c.id) && v.fields.event_list && v.fields.event_list.length > 0))
      .map((c) => ({
        id: c.id,
        citySlug: c.fields.city_id || '',
        name: cityName(c.fields, locale),
        venueCount: venues.filter((v) => v.fields.city_id?.includes(c.id) && v.fields.event_list && v.fields.event_list.length > 0).length,
      })),
    members: profiles.map((p) => ({
      id: p.id,
      username: p.username,
      displayName: p.display_name,
      avatarUrl: p.avatar_url,
      bio: p.bio,
    })),
  };

  return NextResponse.json(data);
}
