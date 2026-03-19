'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';

interface MagazineSlide {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  cover_image_url: string | null;
  category: string;
  categoryLabel: string;
  author_name: string | null;
  published_at: string | null;
}

const ROTATION_INTERVAL = 6000; // 6 seconds

/**
 * Homepage Magazine carousel — displays featured articles.
 * Auto-rotates with fade transition.
 * Hidden when no articles are available.
 */
export default function MagazineCarousel({
  articles,
  locale,
  labels,
}: {
  articles: MagazineSlide[];
  locale: string;
  labels: {
    magazine: string;
    viewAll: string;
  };
}) {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'fading'>('visible');

  const advance = useCallback(() => {
    if (articles.length <= 1) return;
    setPhase('fading');
    setTimeout(() => {
      setCurrent((i) => (i + 1) % articles.length);
      setPhase('visible');
    }, 500);
  }, [articles.length]);

  useEffect(() => {
    if (articles.length <= 1) return;
    const timer = setInterval(advance, ROTATION_INTERVAL);
    return () => clearInterval(timer);
  }, [articles.length, advance]);

  if (articles.length === 0) return null;

  const article = articles[current];

  return (
    <section className="relative">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xs uppercase tracking-[0.2em] text-[var(--color-gold)] font-semibold">
          {labels.magazine}
        </h2>
        <Link
          href={`/${locale}/magazine`}
          className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          {labels.viewAll} →
        </Link>
      </div>

      {/* Carousel */}
      <Link
        href={`/${locale}/magazine/${article.slug}`}
        className="group block relative rounded-2xl overflow-hidden"
      >
        {/* Desktop: side-by-side layout */}
        <div className="hidden sm:grid grid-cols-5 min-h-[280px]">
          {/* Image area */}
          <div
            className="col-span-3 relative bg-[var(--muted)] overflow-hidden transition-opacity duration-500"
            style={{ opacity: phase === 'visible' ? 1 : 0 }}
          >
            {article.cover_image_url ? (
              <Image
                src={article.cover_image_url}
                alt={article.title}
                fill
                className="object-cover transition-transform duration-700 group-hover:scale-105"
                sizes="600px"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-[var(--muted-foreground)]">JazzNode Magazine</div>
            )}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent to-black/30" />
          </div>

          {/* Text area */}
          <div
            className="col-span-2 flex flex-col justify-center p-8 bg-[var(--card)] border-t border-r border-b border-[var(--border)] rounded-r-2xl transition-opacity duration-500"
            style={{ opacity: phase === 'visible' ? 1 : 0 }}
          >
            <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-gold)] font-semibold">
              {article.categoryLabel}
            </span>
            <h3 className="font-serif text-xl lg:text-2xl font-bold text-[var(--foreground)] mt-3 group-hover:text-[var(--color-gold)] transition-colors duration-300 line-clamp-3">
              {article.title}
            </h3>
            {article.excerpt && (
              <p className="text-sm text-[var(--muted-foreground)] mt-3 line-clamp-2 leading-relaxed">
                {article.excerpt}
              </p>
            )}
            <div className="mt-auto pt-4">
              <p className="text-[10px] text-[var(--muted-foreground)]">
                {article.author_name}
                {article.published_at && ` · ${new Date(article.published_at).toLocaleDateString(locale === 'zh' ? 'zh-TW' : locale)}`}
              </p>
            </div>
          </div>
        </div>

        {/* Mobile: stacked layout */}
        <div
          className="sm:hidden relative rounded-2xl overflow-hidden transition-opacity duration-500"
          style={{ opacity: phase === 'visible' ? 1 : 0 }}
        >
          <div className="relative aspect-[16/10] bg-[var(--muted)]">
            {article.cover_image_url && (
              <Image
                src={article.cover_image_url}
                alt={article.title}
                fill
                className="object-cover"
                sizes="100vw"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <span className="text-[10px] uppercase tracking-[0.15em] text-[var(--color-gold)] font-semibold">
                {article.categoryLabel}
              </span>
              <h3 className="font-serif text-lg font-bold text-white mt-1.5 line-clamp-2">
                {article.title}
              </h3>
              {article.excerpt && (
                <p className="text-xs text-white/70 mt-1.5 line-clamp-2">{article.excerpt}</p>
              )}
            </div>
          </div>
        </div>
      </Link>

      {/* Dots indicator */}
      {articles.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {articles.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setCurrent(i); setPhase('visible'); }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                i === current ? 'bg-[var(--color-gold)] w-4' : 'bg-[var(--muted-foreground)]/30 hover:bg-[var(--muted-foreground)]/60'
              }`}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
