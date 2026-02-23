import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { getArtists } from '@/lib/airtable';
import { displayName, photoUrl, localized } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';

export async function generateMetadata() {
  const t = await getTranslations('common');
  return { title: t('artists') };
}

export default async function ArtistsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');

  const artists = await getArtists();
  const sorted = [...artists].sort((a, b) => displayName(a.fields).localeCompare(displayName(b.fields)));

  return (
    <div className="space-y-12">
      <FadeUp>
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{t('artists')}</h1>
          <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">{artists.length} artists</p>
        </div>
      </FadeUp>

      <FadeUp stagger={0.08}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sorted.map((artist) => {
            const f = artist.fields;
            const bio = localized(f as Record<string, unknown>, 'bio_short', locale);
            return (
              <Link key={artist.id} href={`/${locale}/artists/${artist.id}`} className="fade-up-item block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group">
                <div className="flex items-center gap-4 mb-3">
                  {photoUrl(f.photo_url, f.photo_file) ? (
                    <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[rgba(240,237,230,0.08)]">
                      <img src={photoUrl(f.photo_url, f.photo_file)!} alt="" className="w-full h-full object-cover" loading="lazy" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-xl shrink-0 border border-[rgba(240,237,230,0.08)]">♪</div>
                  )}
                  <div>
                    <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                      {displayName(f)}
                    </h3>
                    {f.primary_instrument && (
                      <p className="text-xs uppercase tracking-widest text-gold capitalize">{f.primary_instrument}</p>
                    )}
                  </div>
                </div>
                {bio && <p className="text-xs text-[#8A8578] line-clamp-2 leading-relaxed">{bio}</p>}
                <div className="flex gap-2 mt-3 flex-wrap">
                  {f.country_code && <span className="text-[10px] uppercase tracking-widest text-[#8A8578]">🌍 {f.country_code}</span>}
                  {f.event_list && <span className="text-[10px] uppercase tracking-widest text-[#8A8578]">{f.event_list.length} events</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </FadeUp>
    </div>
  );
}
