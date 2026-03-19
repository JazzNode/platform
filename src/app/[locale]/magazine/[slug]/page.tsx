import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Image from 'next/image';
import { getMagazineBySlug, getArtists, getVenues, getCities, buildMap, getMagazineArticles } from '@/lib/supabase';
import { localized, artistDisplayName, displayName, cityName } from '@/lib/helpers';
import type { Metadata } from 'next';

export const revalidate = 3600;

const CATEGORY_KEYS: Record<string, string> = {
  'artist-feature': 'magazineCatArtist',
  'venue-spotlight': 'magazineCatVenue',
  'scene-report': 'magazineCatScene',
  'culture': 'magazineCatCulture',
};

// Dynamic metadata for SEO
export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getMagazineBySlug(slug);
  if (!article) return {};

  const title = localized(article as unknown as Record<string, unknown>, 'title', locale) || article.slug;
  const description = localized(article as unknown as Record<string, unknown>, 'excerpt', locale) || '';

  return {
    title: `${title} | JazzNode Magazine`,
    description,
    openGraph: {
      title,
      description,
      images: article.cover_image_url ? [{ url: article.cover_image_url, width: 1600, height: 900 }] : [],
      type: 'article',
      publishedTime: article.published_at || undefined,
      authors: article.author_name ? [article.author_name] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: article.cover_image_url ? [article.cover_image_url] : [],
    },
  };
}

// Simple Markdown renderer — converts basic markdown to HTML
function renderMarkdown(md: string): string {
  return md
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="font-serif text-xl font-bold mt-10 mb-4">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="font-serif text-2xl font-bold mt-12 mb-4">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="font-serif text-3xl font-bold mt-12 mb-6">$1</h1>')
    // Bold & italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Links
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--color-gold)] hover:underline" target="_blank" rel="noopener">$1</a>')
    // Images
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<figure class="my-8"><img src="$2" alt="$1" class="w-full rounded-xl" /><figcaption class="text-xs text-center text-[var(--muted-foreground)] mt-2">$1</figcaption></figure>')
    // Horizontal rules
    .replace(/^---$/gm, '<hr class="my-10 border-[var(--border)]" />')
    // Blockquotes
    .replace(/^> (.+)$/gm, '<blockquote class="border-l-2 border-[var(--color-gold)] pl-4 my-6 italic text-[var(--muted-foreground)]">$1</blockquote>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p class="mb-4 leading-relaxed">')
    // Wrap in paragraph
    .replace(/^/, '<p class="mb-4 leading-relaxed">')
    .replace(/$/, '</p>');
}

export default async function MagazineArticlePage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const article = await getMagazineBySlug(slug);
  if (!article) notFound();

  const t = await getTranslations('common');
  const [artists, venues, cities, allArticles] = await Promise.all([
    getArtists(), getVenues(), getCities(), getMagazineArticles(),
  ]);
  const artistMap = buildMap(artists);
  const venueMap = buildMap(venues);
  const cityMap = buildMap(cities);

  const title = localized(article as unknown as Record<string, unknown>, 'title', locale) || article.slug;
  const body = localized(article as unknown as Record<string, unknown>, 'body', locale) || '';
  const excerpt = localized(article as unknown as Record<string, unknown>, 'excerpt', locale);

  // Resolve linked entities
  const linkedArtists = (article.linked_artist_ids || []).map((id) => artistMap.get(id)).filter(Boolean);
  const linkedVenues = (article.linked_venue_ids || []).map((id) => venueMap.get(id)).filter(Boolean);

  // Related articles (same category, different article)
  const related = allArticles
    .filter((a) => a.category === article.category && a.id !== article.id)
    .slice(0, 3);

  // JSON-LD for SEO
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: excerpt,
    image: article.cover_image_url,
    datePublished: article.published_at,
    author: article.author_name ? { '@type': 'Person', name: article.author_name } : undefined,
    publisher: { '@type': 'Organization', name: 'JazzNode', url: 'https://jazznode.com' },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <article className="max-w-4xl mx-auto px-4 sm:px-6 pb-24">
        {/* Hero */}
        {article.cover_image_url && (
          <div className="relative w-full aspect-[16/8] sm:aspect-[16/7] rounded-2xl overflow-hidden mt-8 bg-[var(--muted)]">
            <Image
              src={article.cover_image_url}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 900px"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        {/* Article Header */}
        <header className="mt-8 sm:mt-12 space-y-4">
          <div className="flex items-center gap-3">
            <Link href={`/${locale}/magazine`} className="text-[10px] uppercase tracking-[0.2em] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
              {t('magazineTitle')}
            </Link>
            <span className="text-[var(--muted-foreground)]">/</span>
            <span className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-gold)]">
              {t(CATEGORY_KEYS[article.category] || 'magazineCatCulture')}
            </span>
          </div>

          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[var(--foreground)] leading-tight">
            {title}
          </h1>

          {excerpt && (
            <p className="text-lg text-[var(--muted-foreground)] leading-relaxed max-w-2xl">
              {excerpt}
            </p>
          )}

          <div className="flex items-center gap-4 text-sm text-[var(--muted-foreground)] pt-2 border-t border-[var(--border)]">
            {article.author_name && <span>{article.author_name}</span>}
            {article.published_at && (
              <time>{new Date(article.published_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale, { year: 'numeric', month: 'long', day: 'numeric' })}</time>
            )}
          </div>
        </header>

        {/* Article Body */}
        <div
          className="mt-10 text-base sm:text-lg text-[var(--foreground)] leading-relaxed max-w-none prose-invert"
          dangerouslySetInnerHTML={{ __html: renderMarkdown(body) }}
        />

        {/* Gallery */}
        {article.gallery_urls && article.gallery_urls.length > 0 && (
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {article.gallery_urls.map((url, i) => (
              <div key={i} className="relative aspect-[4/3] rounded-xl overflow-hidden bg-[var(--muted)]">
                <Image src={url} alt={`${title} - ${i + 1}`} fill className="object-cover" sizes="(max-width: 768px) 100vw, 450px" />
              </div>
            ))}
          </div>
        )}

        {/* Linked Entities */}
        {(linkedArtists.length > 0 || linkedVenues.length > 0) && (
          <div className="mt-16 pt-8 border-t border-[var(--border)] space-y-6">
            {linkedArtists.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)] font-semibold mb-4">{t('magazineRelatedArtists')}</h3>
                <div className="flex flex-wrap gap-3">
                  {linkedArtists.map((a) => (
                    <Link
                      key={a!.id}
                      href={`/${locale}/artists/${encodeURIComponent(a!.id)}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/30 transition-all group"
                    >
                      {a!.fields.photo_url && (
                        <Image src={a!.fields.photo_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover" sizes="40px" />
                      )}
                      <div>
                        <p className="text-sm font-medium group-hover:text-[var(--color-gold)] transition-colors">{artistDisplayName(a!.fields, locale)}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">{a!.fields.primary_instrument}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {linkedVenues.length > 0 && (
              <div>
                <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)] font-semibold mb-4">{t('magazineRelatedVenues')}</h3>
                <div className="flex flex-wrap gap-3">
                  {linkedVenues.map((v) => (
                    <Link
                      key={v!.id}
                      href={`/${locale}/venues/${encodeURIComponent(v!.id)}`}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/30 transition-all group"
                    >
                      <div>
                        <p className="text-sm font-medium group-hover:text-[var(--color-gold)] transition-colors">{displayName(v!.fields)}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Related Articles */}
        {related.length > 0 && (
          <div className="mt-16 pt-8 border-t border-[var(--border)]">
            <h3 className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)] font-semibold mb-6">{t('magazineRelated')}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((r) => (
                <Link
                  key={r.id}
                  href={`/${locale}/magazine/${r.slug}`}
                  className="group block rounded-xl overflow-hidden border border-[var(--border)] hover:border-[var(--color-gold)]/30 transition-all"
                >
                  <div className="relative aspect-[3/2] bg-[var(--muted)]">
                    {r.cover_image_url && (
                      <Image src={r.cover_image_url} alt="" fill className="object-cover transition-transform duration-500 group-hover:scale-105" sizes="320px" />
                    )}
                  </div>
                  <div className="p-3">
                    <p className="font-serif text-sm font-bold group-hover:text-[var(--color-gold)] transition-colors line-clamp-2">
                      {localized(r as unknown as Record<string, unknown>, 'title', locale)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </>
  );
}
