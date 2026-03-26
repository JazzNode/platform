'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import FadeUp from '@/components/animations/FadeUp';

interface MagazineArticle {
  id: string;
  slug: string;
  title_en: string | null;
  title_zh: string | null;
  title_ja: string | null;
  title_ko: string | null;
  title_th: string | null;
  title_id: string | null;
  excerpt_en: string | null;
  excerpt_zh: string | null;
  excerpt_ja: string | null;
  excerpt_ko: string | null;
  excerpt_th: string | null;
  excerpt_id: string | null;
  cover_image_url: string | null;
  category: string;
  author_name: string | null;
  published_at: string | null;
}

export default function ArtistMagazineSection({ artistId }: { artistId: string }) {
  const locale = useLocale();
  const t = useTranslations('artist');
  const [articles, setArticles] = useState<MagazineArticle[]>([]);

  useEffect(() => {
    fetch(`/api/magazine/by-artist?artistId=${artistId}&limit=3`)
      .then((r) => r.json())
      .then((data) => setArticles(data.articles || []))
      .catch(() => {});
  }, [artistId]);

  if (articles.length === 0) return null;

  const getTitle = (a: MagazineArticle) => {
    const key = `title_${locale}` as keyof MagazineArticle;
    return (a[key] as string) || a.title_zh || a.title_en || a.slug;
  };

  const getExcerpt = (a: MagazineArticle) => {
    const key = `excerpt_${locale}` as keyof MagazineArticle;
    return (a[key] as string) || a.excerpt_zh || a.excerpt_en || '';
  };

  return (
    <FadeUp>
      <section className="border-t border-[var(--border)] pt-12">
        <h2 className="font-serif text-2xl font-bold mb-6">{t('featuredIn')}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {articles.map((article) => (
            <Link
              key={article.id}
              href={`/${locale}/magazine/${article.slug}`}
              className="group bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden hover:border-[var(--color-gold)]/30 transition-colors"
            >
              {article.cover_image_url ? (
                <div className="aspect-[16/9] overflow-hidden">
                  <Image
                    src={article.cover_image_url}
                    alt={getTitle(article)}
                    width={400}
                    height={225}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                </div>
              ) : (
                <div className="aspect-[16/9] bg-[var(--muted)] flex items-center justify-center text-2xl">📰</div>
              )}
              <div className="p-4">
                <p className="text-sm font-semibold line-clamp-2 group-hover:text-[var(--color-gold)] transition-colors">
                  {getTitle(article)}
                </p>
                {getExcerpt(article) && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 line-clamp-2">{getExcerpt(article)}</p>
                )}
                {article.published_at && (
                  <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
                    {new Date(article.published_at).toLocaleDateString()}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </FadeUp>
  );
}
