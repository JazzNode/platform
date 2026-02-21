import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues } from '@/lib/airtable';
import { displayName, photoUrl } from '@/lib/helpers';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const t = await getTranslations('common');
  return { title: t('venues') };
}

export default async function VenuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const venues = await getVenues();

  // Group by city
  const byCity = new Map<string, typeof venues>();
  for (const v of venues) {
    const city = v.fields.city || 'Other';
    if (!byCity.has(city)) byCity.set(city, []);
    byCity.get(city)!.push(v);
  }

  // Sort cities by venue count
  const cities = [...byCity.entries()].sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-bold">{t('venues')}</h1>
        <p className="text-muted-foreground mt-1">{venues.length} venues worldwide</p>
      </div>

      {cities.map(([city, cityVenues]) => (
        <section key={city}>
          <h2 className="text-xl font-semibold mb-4">{city}</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cityVenues.map((venue) => (
              <Link key={venue.id} href={`/${locale}/venues/${venue.id}`}>
                <Card className="hover:shadow-md transition-shadow h-full">
                  {photoUrl(venue.fields.photo_url, venue.fields.photo_file) && (
                    <div className="h-36 overflow-hidden rounded-t-lg">
                      <img
                        src={photoUrl(venue.fields.photo_url, venue.fields.photo_file)!}
                        alt={displayName(venue.fields)}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle className="text-base">{displayName(venue.fields)}</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {venue.fields.jazz_frequency && `${venue.fields.jazz_frequency} · `}
                      {venue.fields.event_list?.length || 0} events
                    </p>
                    {venue.fields.verification_status === 'Verified' && (
                      <Badge variant="secondary" className="w-fit text-xs">{t('verified')} ✓</Badge>
                    )}
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
