import { getVenues, getEvents, getArtists, getCities } from '@/lib/supabase';
import ForVenuesClient from './ForVenuesClient';

export default async function ForVenuesPage() {
  const [venues, events, artists, cities] = await Promise.all([
    getVenues(),
    getEvents(),
    getArtists(),
    getCities(),
  ]);

  const venuesWithEvents = venues.filter(
    (v) => v.fields.event_list && v.fields.event_list.length > 0
  );
  const activeCities = cities.filter((c) =>
    venuesWithEvents.some((v) => v.fields.city_id?.includes(c.id))
  );

  return (
    <ForVenuesClient
      stats={{
        cities: activeCities.length,
        venues: venuesWithEvents.length,
        events: events.length,
        artists: artists.length,
      }}
    />
  );
}
