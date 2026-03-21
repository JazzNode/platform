'use client';

import { useAuth } from './AuthProvider';
import { useVenueReviews } from './VenueReviewsProvider';
import { useTranslations } from 'next-intl';
import { useLocale } from 'next-intl';
import Image from 'next/image';

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={rating >= star ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          className={rating >= star ? 'text-gold' : 'text-[var(--muted-foreground)]/40'}
        >
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

function RelativeTime({ dateStr, locale }: { dateStr: string; locale: string }) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let label: string;
  if (diffDays === 0) {
    label = locale === 'zh' ? '今天' : locale === 'ja' ? '今日' : 'today';
  } else if (diffDays === 1) {
    label = locale === 'zh' ? '昨天' : locale === 'ja' ? '昨日' : 'yesterday';
  } else if (diffDays < 7) {
    label = locale === 'zh' ? `${diffDays} 天前` : locale === 'ja' ? `${diffDays}日前` : `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    label = locale === 'zh' ? `${weeks} 週前` : locale === 'ja' ? `${weeks}週間前` : `${weeks}w ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    label = locale === 'zh' ? `${months} 個月前` : locale === 'ja' ? `${months}ヶ月前` : `${months}mo ago`;
  }

  return <span className="text-xs text-[var(--muted-foreground)]">{label}</span>;
}

export default function VenueReviewList() {
  const { user } = useAuth();
  const { reviews, averageRating, reviewCount, loading } = useVenueReviews();
  const t = useTranslations('reviews');
  const locale = useLocale();

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[var(--muted-foreground)]">
        <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (reviewCount === 0) return null;

  return (
    <div className="space-y-4 mt-6">
      {/* Review cards */}
      {reviews.map((review) => {
        const isOwn = user?.id === review.user_id;
        const displayName = review.is_anonymous
          ? t('anonymousUser')
          : review.profile?.display_name || t('anonymousUser');

        return (
          <div
            key={review.id}
            className={`bg-[var(--card)] rounded-xl border p-4 space-y-2 ${
              isOwn ? 'border-gold/20' : 'border-[var(--border)]'
            }`}
          >
            {/* Header: avatar + name + time */}
            <div className="flex items-center gap-2.5">
              {review.is_anonymous || !review.profile?.avatar_url ? (
                <div className="w-7 h-7 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted-foreground)]">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </div>
              ) : (
                <Image
                  src={review.profile.avatar_url}
                  alt={displayName}
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full object-cover"
                />
              )}
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-sm font-medium truncate">{displayName}</span>
                {isOwn && (
                  <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full shrink-0">
                    {t('you') || 'You'}
                  </span>
                )}
              </div>
              <div className="ml-auto shrink-0">
                <RelativeTime dateStr={review.created_at} locale={locale} />
              </div>
            </div>

            {/* Stars */}
            <StarDisplay rating={review.rating} />

            {/* Text */}
            {review.text && (
              <p className="text-sm text-[#C4BFB5] leading-relaxed">{review.text}</p>
            )}
          </div>
        );
      })}
    </div>
  );
}
