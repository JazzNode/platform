export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getVenues, getCities } from '@/lib/airtable';
import { displayName, photoUrl, localized } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('venues') };
}

export default async function VenuesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const [venues, cities] = await Promise.all([getVenues(), getCities()]);
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));
  const sorted = [...venues].sort((a, b) => (b.fields.event_list?.length || 0) - (a.fields.event_list?.length || 0));

  return (
    <div className="space-y-12">
      <FadeUp>
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{t('venues')}</h1>
          <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">{venues.length} venues</p>
        </div>
      </FadeUp>

      <FadeUp stagger={0.15}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sorted.map((venue) => {
            const f = venue.fields;
            const desc = localized(f as Record<string, unknown>, 'description', locale);
            return (
              <Link key={venue.id} href={`/${locale}/venues/${venue.id}`} className="fade-up-item block bg-[#111111] p-6 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                {photoUrl(f.photo_url, f.photo_file) && (
                  <div className="h-44 overflow-hidden mb-5 -mx-6 -mt-6 rounded-t-2xl">
                    <img src={photoUrl(f.photo_url, f.photo_file)!} alt={displayName(f)} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" loading="lazy" />
                  </div>
                )}
                <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors duration-300">
                  {displayName(f)}
                </h3>
                <div className="flex gap-3 mt-2 text-xs uppercase tracking-widest text-[#8A8578]">
                  {f.city_id?.[0] && cityMap.get(f.city_id[0]) && <span>📍 {locale === 'en' ? cityMap.get(f.city_id[0])!.name_en : cityMap.get(f.city_id[0])!.name_local}</span>}
                  <span>{f.event_list?.length || 0} events</span>
                  {f.jazz_frequency && <span>🎵 {f.jazz_frequency}</span>}
                </div>
                {desc && <p className="text-xs text-[#8A8578] mt-3 line-clamp-2 leading-relaxed">{desc}</p>}
              </Link>
            );
          })}
        </div>
      </FadeUp>
    </div>
  );
}
