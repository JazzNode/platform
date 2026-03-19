import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { getMagazineArticles, getArtists, getVenues, buildMap } from '@/lib/supabase';
import { localized, artistDisplayName, displayName } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';

export const revalidate = 3600;

const CATEGORY_KEYS: Record<string, string> = {
  'artist-feature': 'magazineCatArtist',
  'venue-spotlight': 'magazineCatVenue',
  'scene-report': 'magazineCatScene',
  'culture': 'magazineCatCulture',
};

export default async function MagazinePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('common');
  const articles = await getMagazineArticles();
  const [artists, venues] = await Promise.all([getArtists(), getVenues()]);
  const artistMap = buildMap(artists);
  const venueMap = buildMap(venues);

  // Group by category
  const categories = [...new Set(articles.map((a) => a.category))];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-16 pt-12 pb-24">
      {/* Header */}
      <FadeUp>
        <div className="space-y-4">
          <h1 className="font-serif text-5xl sm:text-7xl font-bold text-[var(--foreground)]">
            {t('magazineTitle')}
          </h1>
          <p className="text-lg text-[var(--muted-foreground)] max-w-xl leading-relaxed">
            {t('magazineSubtitle')}
          </p>
        </div>
      </FadeUp>

      {articles.length === 0 ? (
        <p className="text-center text-[var(--muted-foreground)] py-16">{t('magazineEmpty')}</p>
      ) : (
        <>
          {/* Featured hero article */}
          {articles[0] && (
            <FadeUp>
              <Link
                href={`/${locale}/magazine/${articles[0].slug}`}
                className="group block relative rounded-2xl overflow-hidden aspect-[16/7] bg-[var(--muted)]"
              >
                {articles[0].cover_image_url && (
                  <Image
                    src={articles[0].cover_image_url}
                    alt={localized(articles[0] as unknown as Record<string, unknown>, 'title', locale) || ''}
                    fill
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 1024px"
                    priority
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-10">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)] font-semibold">
                    {t(CATEGORY_KEYS[articles[0].category] || 'magazineCatCulture')}
                  </span>
                  <h2 className="font-serif text-2xl sm:text-4xl font-bold text-white mt-2 group-hover:text-[var(--color-gold)] transition-colors duration-300">
                    {localized(articles[0] as unknown as Record<string, unknown>, 'title', locale)}
                  </h2>
                  <p className="text-sm text-white/70 mt-2 max-w-lg line-clamp-2">
                    {localized(articles[0] as unknown as Record<string, unknown>, 'excerpt', locale)}
                  </p>
                  {articles[0].author_name && (
                    <p className="text-xs text-white/50 mt-3">
                      {articles[0].author_name}
                      {articles[0].published_at && ` · ${new Date(articles[0].published_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale)}`}
                    </p>
                  )}
                </div>
              </Link>
            </FadeUp>
          )}

          {/* Article grid by category */}
          {categories.map((cat) => {
            const catArticles = articles.filter((a) => a.category === cat);
            // Skip the first article if it's in this category (already shown as hero)
            const display = catArticles.filter((a) => a.id !== articles[0]?.id);
            if (display.length === 0) return null;

            return (
              <FadeUp key={cat}>
                <section>
                  <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)] font-semibold mb-6 pb-3 border-b border-[var(--border)]">
                    {t(CATEGORY_KEYS[cat] || 'magazineCatCulture')}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {display.map((article) => {
                      const title = localized(article as unknown as Record<string, unknown>, 'title', locale) || article.slug;
                      const excerpt = localized(article as unknown as Record<string, unknown>, 'excerpt', locale);

                      // Resolve linked artists
                      const linkedArtists = (article.linked_artist_ids || [])
                        .map((id) => artistMap.get(id))
                        .filter(Boolean)
                        .slice(0, 3);

                      return (
                        <Link
                          key={article.id}
                          href={`/${locale}/magazine/${article.slug}`}
                          className="fade-up-item group block rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--color-gold)]/30 transition-all duration-300"
                        >
                          {/* Cover */}
                          <div className="relative aspect-[3/2] bg-[var(--muted)] overflow-hidden">
                            {article.cover_image_url ? (
                              <Image
                                src={article.cover_image_url}
                                alt={title}
                                fill
                                className="object-cover transition-transform duration-500 group-hover:scale-105"
                                sizes="(max-width: 768px) 100vw, 320px"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)] text-sm">Magazine</div>
                            )}
                          </div>

                          {/* Content */}
                          <div className="p-4 space-y-2">
                            <span className="text-[10px] uppercase tracking-widest text-[var(--color-gold)]">
                              {t(CATEGORY_KEYS[article.category] || 'magazineCatCulture')}
                            </span>
                            <h4 className="font-serif text-lg font-bold text-[var(--foreground)] group-hover:text-[var(--color-gold)] transition-colors line-clamp-2">
                              {title}
                            </h4>
                            {excerpt && (
                              <p className="text-xs text-[var(--muted-foreground)] line-clamp-2">{excerpt}</p>
                            )}

                            {/* Linked artists chips */}
                            {linkedArtists.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {linkedArtists.map((a) => (
                                  <span key={a!.id} className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)]">
                                    {artistDisplayName(a!.fields, locale)}
                                  </span>
                                ))}
                              </div>
                            )}

                            <p className="text-[10px] text-[var(--muted-foreground)] pt-1">
                              {article.author_name || ''}
                              {article.published_at && ` · ${new Date(article.published_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale)}`}
                            </p>
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </FadeUp>
            );
          })}
        </>
      )}
    </div>
  );
}
