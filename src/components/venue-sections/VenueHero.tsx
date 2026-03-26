import Image from 'next/image';
import Link from 'next/link';
import type { Venue, City } from '@/lib/supabase';
import { photoUrl, displayName, cityName, localized } from '@/lib/helpers';
import FollowButton from '@/components/FollowButton';
import ClaimButton from '@/components/ClaimButton';
import ShareButton from '@/components/ShareButton';
import MessageVenueButton from '@/components/MessageVenueButton';
import VerifiedBadge from '@/components/VerifiedBadge';
import TierGate from '@/components/TierGate';
import SocialIcons from '@/components/SocialIcons';

interface VenueHeroProps {
  venue: { id: string; fields: Venue };
  locale: string;
  cityFields: City | null;
  followerCount: number;
  jazzFreqLabel: Record<string, string>;
  t: (key: string) => string;
}

export default function VenueHero({
  venue,
  locale,
  cityFields,
  followerCount,
  jazzFreqLabel,
  t,
}: VenueHeroProps) {
  const f = venue.fields;
  const name = displayName(f);
  const photo = photoUrl(f.photo_url);
  const city = cityFields ? cityName(cityFields, locale) : '';
  const freq = f.jazz_frequency;
  const freqLabel = freq && freq !== 'none' ? jazzFreqLabel[freq] : '';
  const subtitle = f.name_en && f.name_local && f.name_en !== f.name_local
    ? f.name_en
    : '';

  const quickInfoParts = [city, freqLabel].filter(Boolean);

  return (
    <section className="relative -mx-4 sm:-mx-6 lg:-mx-8">
      {/* Background Image */}
      <div className="relative h-[340px] sm:h-[420px] lg:h-[480px] overflow-hidden">
        {photo ? (
          <>
            <Image
              src={photo}
              alt={name}
              fill
              className="object-cover"
              sizes="100vw"
              priority
            />
            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] via-[var(--background)]/60 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--background)]/80 to-transparent" />
          </>
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--card)] to-[var(--background)]">
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <svg className="w-32 h-32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="0.5">
                <path d="M9 18V5l12-2v13" />
                <circle cx="6" cy="18" r="3" />
                <circle cx="18" cy="16" r="3" />
              </svg>
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--background)] to-transparent" />
          </div>
        )}

        {/* Content overlay */}
        <div className="absolute inset-0 flex flex-col justify-end px-4 sm:px-6 lg:px-8 pb-8 max-w-7xl mx-auto">
          {/* Venue Name */}
          <div className="space-y-3">
            <div className="inline-flex items-start gap-2">
              <h1 className="font-serif text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] drop-shadow-lg">
                {name}
              </h1>
              {f.tier != null && f.tier >= 1 && (
                <VerifiedBadge
                  label={t('claimed')}
                  className={`!top-0 !ml-0 ${/[a-z]$/.test(name) ? 'mt-2 sm:mt-3' : 'mt-1'}`}
                />
              )}
            </div>

            {subtitle && (
              <p className="text-lg sm:text-xl text-[var(--foreground)]/70 drop-shadow">
                {subtitle}
              </p>
            )}

            {/* Quick info line */}
            {quickInfoParts.length > 0 && (
              <p className="text-sm text-[var(--foreground)]/60 tracking-wide flex items-center gap-2">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 0C4.7 0 2 2.7 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.5c-1.4 0-2.5-1.1-2.5-2.5S6.6 3.5 8 3.5s2.5 1.1 2.5 2.5S9.4 8.5 8 8.5z" />
                </svg>
                {quickInfoParts.join(' · ')}
              </p>
            )}

            {/* CTA Row */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <FollowButton
                itemType="venue"
                itemId={venue.id}
                variant="full"
                followerCount={followerCount}
              />
              <TierGate entityType="venue" featureKey="inbox" currentTier={f.tier ?? 0}
                fallback={<MessageVenueButton venueId={venue.id} claimed={false} />}>
                <MessageVenueButton venueId={venue.id} claimed={!!f.tier && f.tier >= 1} />
              </TierGate>
              <ShareButton
                title={name}
                url={`/${locale}/venues/${venue.id}`}
                text={[
                  `📍 ${city ? `${city}｜` : ''}${name}`,
                  (localized(f as Record<string, unknown>, 'description', locale) as string)?.slice(0, 100) || '',
                  'via JazzNode — The Jazz Scene, Connected.',
                ].filter(Boolean).join('\n')}
                variant="compact"
                label={t('share')}
              />
              <ClaimButton targetType="venue" targetId={venue.id} targetName={name} />
            </div>
          </div>
        </div>
      </div>

      {/* Thin info bar below hero */}
      <div className="px-4 sm:px-6 lg:px-8 py-3 border-b border-[var(--border)] flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--muted-foreground)]">
        <div className="flex items-center gap-4">
          {f.business_hour && (
            <span className="flex items-center gap-1.5">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z" />
              </svg>
              {f.business_hour!.split('\n')[0]}
            </span>
          )}
          {(f.address_local || f.address_en) && (
            <span className="hidden sm:flex items-center gap-1.5">
              <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C4.7 0 2 2.7 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.5c-1.4 0-2.5-1.1-2.5-2.5S6.6 3.5 8 3.5s2.5 1.1 2.5 2.5S9.4 8.5 8 8.5z" />
              </svg>
              {f.address_local || f.address_en}
            </span>
          )}
        </div>
        <TierGate entityType="venue" featureKey="edit_profile" currentTier={f.tier ?? 0}>
          <SocialIcons
            websiteUrl={f.website_url}
            instagram={f.instagram}
            facebookUrl={f.facebook_url}
          />
        </TierGate>
      </div>
    </section>
  );
}
