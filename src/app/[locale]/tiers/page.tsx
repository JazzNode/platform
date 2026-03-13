import { Fragment } from 'react';
import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tiers' });
  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
  };
}

/* ─── Feature row type ─── */
interface Feature {
  name: string;
  tiers: (boolean | string)[];
}

/* ─── Reusable comparison table ─── */
function TierTable({
  columns,
  columnColors,
  features,
  highlight,
}: {
  columns: string[];
  columnColors: string[];
  features: { category: string; items: Feature[] }[];
  highlight: number; // which column to highlight (0-indexed)
}) {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <table className="w-full min-w-[600px] border-collapse">
        {/* Header */}
        <thead>
          <tr>
            <th className="text-left py-4 px-4 text-sm text-[var(--muted)] font-normal w-[40%]" />
            {columns.map((col, i) => (
              <th
                key={col}
                className={`py-4 px-3 text-center text-sm font-semibold ${
                  i === highlight
                    ? 'text-gold bg-gold/5 rounded-t-xl'
                    : 'text-[var(--foreground)]'
                }`}
              >
                <span className={`inline-block px-3 py-1 rounded-full text-xs tracking-wider uppercase ${columnColors[i]}`}>
                  {col}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {features.map((group) => (
            <Fragment key={group.category}>
              {/* Category header */}
              <tr>
                <td
                  colSpan={columns.length + 1}
                  className="pt-6 pb-2 px-4 text-xs uppercase tracking-widest text-zinc-400 font-semibold border-b border-[var(--border)]"
                >
                  {group.category}
                </td>
              </tr>
              {group.items.map((feat, fi) => (
                <tr
                  key={feat.name}
                  className={`${fi % 2 === 0 ? 'bg-[var(--card)]/30' : ''} hover:bg-[var(--card)]/60 transition-colors`}
                >
                  <td className="py-3 px-4 text-sm text-[var(--foreground)]">{feat.name}</td>
                  {feat.tiers.map((val, ti) => (
                    <td
                      key={ti}
                      className={`py-3 px-3 text-center text-sm ${
                        ti === highlight ? 'bg-gold/5' : ''
                      }`}
                    >
                      {val === true ? (
                        <span className="text-emerald-400">&#10003;</span>
                      ) : val === false ? (
                        <span className="text-zinc-600">—</span>
                      ) : (
                        <span className="text-[var(--foreground)]">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function TiersPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'tiers' });

  /* ─── Artist tiers data ─── */
  const artistColumns = [t('free'), t('claimed'), t('premium'), t('elite')];
  const artistColors = [
    'bg-zinc-500/20 text-zinc-400',
    'bg-blue-500/20 text-blue-400',
    'bg-amber-500/20 text-amber-400',
    'bg-purple-500/20 text-purple-400',
  ];
  const artistFeatures = [
    {
      category: t('artistCatProfile'),
      items: [
        { name: t('artistPublicProfile'), tiers: [true, true, true, true] },
        { name: t('artistEditProfile'), tiers: [false, true, true, true] },
        { name: t('artistVerifiedBadge'), tiers: [false, true, true, true] },
        { name: t('artistCustomBio'), tiers: [false, true, true, true] },
        { name: t('artistSocialLinks'), tiers: [false, true, true, true] },
      ],
    },
    {
      category: t('artistCatDiscovery'),
      items: [
        { name: t('artistSearchListing'), tiers: [true, true, true, true] },
        { name: t('artistEventAssociation'), tiers: [true, true, true, true] },
        { name: t('artistPrioritySearch'), tiers: [false, false, true, true] },
      ],
    },
    {
      category: t('artistCatTools'),
      items: [
        { name: t('artistGearShowcase'), tiers: [false, false, t('artistGearLimit'), t('artistGearUnlimited')] },
        { name: t('artistEPK'), tiers: [false, t('artistEPKBasic'), t('artistEPKFull'), t('artistEPKFull')] },
        { name: t('artistAnalyticsBasic'), tiers: [false, false, true, true] },
        { name: t('artistAnalyticsAdvanced'), tiers: [false, false, true, true] },
        { name: t('artistBroadcasts'), tiers: [false, false, false, true] },
        { name: t('artistInbox'), tiers: [false, false, true, true] },
      ],
    },
    {
      category: t('artistCatBusiness'),
      items: [
        { name: t('artistAvailableForHire'), tiers: [false, false, true, true] },
        { name: t('artistBookingRequests'), tiers: [false, false, false, true] },
      ],
    },
  ];

  /* ─── Venue tiers data ─── */
  const venueColumns = [t('free'), t('claimed'), t('premium')];
  const venueColors = [
    'bg-zinc-500/20 text-zinc-400',
    'bg-blue-500/20 text-blue-400',
    'bg-amber-500/20 text-amber-400',
  ];
  const venueFeatures = [
    {
      category: t('venueCatProfile'),
      items: [
        { name: t('venuePublicListing'), tiers: [true, true, true] },
        { name: t('venueEditProfile'), tiers: [false, true, true] },
        { name: t('venueVerifiedBadge'), tiers: [false, true, true] },
        { name: t('venuePhotos'), tiers: [false, true, true] },
        { name: t('venueDescription'), tiers: [false, true, true] },
      ],
    },
    {
      category: t('venueCatDiscovery'),
      items: [
        { name: t('venueSearchListing'), tiers: [true, true, true] },
        { name: t('venueMapPin'), tiers: [true, true, true] },
        { name: t('venuePrioritySearch'), tiers: [false, false, true] },
        { name: t('venueEventShowcase'), tiers: [true, true, true] },
      ],
    },
    {
      category: t('venueCatTools'),
      items: [
        { name: t('venueBackline'), tiers: [false, false, true] },
        { name: t('venueAnalyticsBasic'), tiers: [false, false, true] },
        { name: t('venueAnalyticsAdvanced'), tiers: [false, false, true] },
        { name: t('venueBroadcasts'), tiers: [false, false, true] },
        { name: t('venueInbox'), tiers: [false, false, true] },
      ],
    },
    {
      category: t('venueCatBusiness'),
      items: [
        { name: t('venueBookingManagement'), tiers: [false, false, true] },
        { name: t('venueArtistDiscovery'), tiers: [false, false, true] },
      ],
    },
  ];

  return (
    <div className="space-y-20">
      {/* ─── Hero ─── */}
      <FadeUp>
        <section className="pt-16 pb-8 text-center max-w-3xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-[var(--foreground)] leading-tight">
            {t('heroTitle')}
          </h1>
          <p className="mt-4 text-lg text-zinc-300 max-w-xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </section>
      </FadeUp>

      {/* ─── Artist Tiers ─── */}
      <FadeUpItem>
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full bg-gold" />
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
              {t('artistSectionTitle')}
            </h2>
          </div>
          <p className="text-zinc-400 mb-8 max-w-2xl">
            {t('artistSectionDesc')}
          </p>

          {/* Tier summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-10">
            {[
              { label: t('free'), sub: t('artistTier0Desc'), color: 'border-zinc-600 bg-zinc-800/50', tagColor: 'text-zinc-400', tag: 'Tier 0' },
              { label: t('claimed'), sub: t('artistTier1Desc'), color: 'border-blue-600 bg-blue-900/30', tagColor: 'text-blue-400', tag: 'Tier 1' },
              { label: t('premium'), sub: t('artistTier2Desc'), color: 'border-amber-500 bg-amber-900/25 ring-1 ring-amber-500/30', tagColor: 'text-amber-400', tag: 'Tier 2' },
              { label: t('elite'), sub: t('artistTier3Desc'), color: 'border-purple-600 bg-purple-900/25', tagColor: 'text-purple-400', tag: 'Tier 3' },
            ].map((c) => (
              <div key={c.tag} className={`rounded-xl border p-4 ${c.color} transition-colors`}>
                <div className={`text-xs mb-1 tracking-wider uppercase ${c.tagColor}`}>{c.tag}</div>
                <div className="font-semibold text-white text-lg">{c.label}</div>
                <div className="text-sm text-zinc-300 mt-1 leading-relaxed">{c.sub}</div>
              </div>
            ))}
          </div>

          <TierTable
            columns={artistColumns}
            columnColors={artistColors}
            features={artistFeatures}
            highlight={2}
          />
        </section>
      </FadeUpItem>

      {/* ─── Venue Tiers ─── */}
      <FadeUpItem delay={100}>
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-8 rounded-full bg-gold" />
            <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
              {t('venueSectionTitle')}
            </h2>
          </div>
          <p className="text-zinc-400 mb-8 max-w-2xl">
            {t('venueSectionDesc')}
          </p>

          {/* Tier summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-10">
            {[
              { label: t('free'), sub: t('venueTier0Desc'), color: 'border-zinc-600 bg-zinc-800/50', tagColor: 'text-zinc-400', tag: 'Tier 0' },
              { label: t('claimed'), sub: t('venueTier1Desc'), color: 'border-blue-600 bg-blue-900/30', tagColor: 'text-blue-400', tag: 'Tier 1' },
              { label: t('premium'), sub: t('venueTier2Desc'), color: 'border-amber-500 bg-amber-900/25 ring-1 ring-amber-500/30', tagColor: 'text-amber-400', tag: 'Tier 2' },
            ].map((c) => (
              <div key={c.tag} className={`rounded-xl border p-4 ${c.color} transition-colors`}>
                <div className={`text-xs mb-1 tracking-wider uppercase ${c.tagColor}`}>{c.tag}</div>
                <div className="font-semibold text-white text-lg">{c.label}</div>
                <div className="text-sm text-zinc-300 mt-1 leading-relaxed">{c.sub}</div>
              </div>
            ))}
          </div>

          <TierTable
            columns={venueColumns}
            columnColors={venueColors}
            features={venueFeatures}
            highlight={2}
          />
        </section>
      </FadeUpItem>

      {/* ─── CTA ─── */}
      <FadeUpItem delay={200}>
        <section className="text-center py-12 border-t border-[var(--border)]">
          <h3 className="text-2xl font-bold text-[var(--foreground)] mb-3">
            {t('ctaTitle')}
          </h3>
          <p className="text-zinc-400 mb-6 max-w-lg mx-auto">
            {t('ctaDesc')}
          </p>
          <a
            href={`/${locale}/artists`}
            className="inline-block px-6 py-3 rounded-lg bg-gold text-black font-semibold text-sm hover:bg-gold/90 transition-colors"
          >
            {t('ctaButton')}
          </a>
        </section>
      </FadeUpItem>
    </div>
  );
}
