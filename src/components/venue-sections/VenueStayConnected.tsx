import type { Venue } from '@/lib/supabase';
import { displayName, localized } from '@/lib/helpers';
import FollowButton from '@/components/FollowButton';
import ShareButton from '@/components/ShareButton';
import MessageVenueButton from '@/components/MessageVenueButton';
import SocialIcons from '@/components/SocialIcons';
import TierGate from '@/components/TierGate';

interface VenueStayConnectedProps {
  venue: { id: string; fields: Venue };
  locale: string;
  cityLabel: string;
  followerCount: number;
  t: (key: string) => string;
}

export default function VenueStayConnected({
  venue,
  locale,
  cityLabel,
  followerCount,
  t,
}: VenueStayConnectedProps) {
  const f = venue.fields;
  const name = displayName(f);

  return (
    <section className="border-t border-[var(--border)] pt-12">
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-8 sm:p-12 text-center space-y-6">
        {/* Headline */}
        <div className="space-y-2">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold">
            {t('stayConnected')}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] max-w-md mx-auto">
            {t('stayConnectedDesc')}
          </p>
        </div>

        {/* Primary CTA: Follow */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <FollowButton
            itemType="venue"
            itemId={venue.id}
            variant="full"
            followerCount={followerCount}
          />
          <TierGate entityType="venue" featureKey="inbox" currentTier={f.tier ?? 0}
            fallback={null}>
            <MessageVenueButton venueId={venue.id} claimed={!!f.tier && f.tier >= 1} />
          </TierGate>
          <ShareButton
            title={name}
            url={`/${locale}/venues/${venue.id}`}
            text={[
              `📍 ${cityLabel ? `${cityLabel}｜` : ''}${name}`,
              (localized(f as Record<string, unknown>, 'description', locale))?.slice(0, 100) || '',
              'via JazzNode — The Jazz Scene, Connected.',
            ].filter(Boolean).join('\n')}
            variant="compact"
            label={t('share')}
          />
        </div>

        {/* Social Links */}
        <TierGate entityType="venue" featureKey="edit_profile" currentTier={f.tier ?? 0}>
          <div className="flex justify-center">
            <SocialIcons
              websiteUrl={f.website_url}
              instagram={f.instagram}
              facebookUrl={f.facebook_url}
            />
          </div>
        </TierGate>
      </div>
    </section>
  );
}
