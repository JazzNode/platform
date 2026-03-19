export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getVenues, getEvents, getArtists, getBadges, getCities, getLineups, resolveLinks, buildVenueEventCounts, venueEventCount, getFollowerCount } from '@/lib/supabase';
import { displayName, artistDisplayName, formatDate, formatTime, photoUrl, localized, cityName, eventTitle, normalizeInstrumentKey } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import SocialIcons from '@/components/SocialIcons';
import CollapsibleSection from '@/components/CollapsibleSection';
import FollowButton from '@/components/FollowButton';
import ClaimButton from '@/components/ClaimButton';
import FavoriteHighlight from '@/components/FavoriteHighlight';
import EditableContent from '@/components/EditableContent';
import RecordNav from '@/components/RecordNav';
import AdminEditedByBadge from '@/components/AdminEditedByBadge';
import BadgeDock from '@/components/BadgeDock';
import BadgeCategorySection from '@/components/BadgeCategorySection';
import type { BadgeProgress } from '@/lib/badges';
import MessageVenueButton from '@/components/MessageVenueButton';
import TierGate from '@/components/TierGate';
import VenueReviewsSection from '@/components/VenueReviewsSection';
import VerifiedBadge from '@/components/VerifiedBadge';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const [venues, cities] = await Promise.all([getVenues().catch(() => []), getCities().catch(() => [])]);
  const venue = venues.find((v) => v.id === slug);
  if (!venue) return { title: 'Venue' };
  const f = venue.fields;
  const name = displayName(f);
  const city = f.city_id?.[0] ? cities.find((c) => c.id === f.city_id![0]) : null;
  const cityLabel = city ? cityName(city.fields, locale) : '';
  const desc = localized(f as Record<string, unknown>, 'description', locale);
  const description = desc || (cityLabel ? `${name} — ${cityLabel}` : name);
  const photo = photoUrl(f.photo_url);
  return {
    title: name,
    description,
    ...(photo && { openGraph: { images: [{ url: photo }] } }),
    alternates: {
      canonical: `/${locale}/venues/${slug}`,
      languages: {
        'x-default': `/en/venues/${slug}`,
        en: `/en/venues/${slug}`,
        'zh-Hant': `/zh/venues/${slug}`,
        ja: `/ja/venues/${slug}`,
        ko: `/ko/venues/${slug}`,
        th: `/th/venues/${slug}`,
        id: `/id/venues/${slug}`,
      },
    },
  };
}

export default async function VenueDetailPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const t = await getTranslations('common');
  const tInst = await getTranslations('instruments');
  const instLabel = (key: string) => { const k = normalizeInstrumentKey(key); try { return tInst(k as never); } catch { return k; } };

  const [venues, events, artists, badges, cities, lineups] = await Promise.all([getVenues(), getEvents(), getArtists(), getBadges(), getCities(), getLineups()]);
  const cityMap = new Map(cities.map((c) => [c.id, c.fields]));
  const venue = venues.find((v) => v.id === slug);

  if (!venue) {
    notFound();
  }

  const followerCount = await getFollowerCount('venue', slug);

  // Compute prev/next venue — sorted alphabetically, same as list page
  const venueCountsFallback = buildVenueEventCounts(events);
  const venuesWithEvents = venues.filter((v) => v.fields.event_list && v.fields.event_list.length > 0);
  const allSorted = [...venuesWithEvents].sort((a, b) => displayName(a.fields).localeCompare(displayName(b.fields)));
  const currentIdx = allSorted.findIndex((v) => v.id === venue.id);
  const prevVenue = currentIdx > 0 ? allSorted[currentIdx - 1] : null;
  const nextVenue = currentIdx >= 0 && currentIdx < allSorted.length - 1 ? allSorted[currentIdx + 1] : null;

  const f = venue.fields;
  const desc = localized(f as Record<string, unknown>, 'description', locale);

  // Lookup maps for localized labels
  const jazzFreqLabel: Record<string, string> = {
    nightly: t('jazzNightly'), weekends: t('jazzWeekends'), occasional: t('jazzOccasional'),
  };
  const paymentLabel: Record<string, string> = {
    cash: t('payCash'), credit_card: t('payCreditCard'), bank_transfer: t('payBankTransfer'),
    line_pay: 'Line Pay', apple_pay: 'Apple Pay', jkopay: 'JKOPay',
  };

  const venueEvents = resolveLinks(f.event_list, events)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));
  const venueBadges = resolveLinks(f.badge_list, badges);

  // Compute frequent performers from all lineup roles
  const venueEventIds = new Set(venueEvents.map(e => e.id));
  const artistCounts = new Map<string, number>();
  for (const l of lineups) {
    if (!l.fields.event_id?.some(eid => venueEventIds.has(eid))) continue;
    for (const aid of l.fields.artist_id || []) {
      artistCounts.set(aid, (artistCounts.get(aid) || 0) + 1);
    }
  }
  const artistMap = new Map(artists.map(a => [a.id, a]));

  // ── Venue badge progress (all venue badges, earned + unearned) ──
  const earnedVenueBadgeIds = new Set(venueBadges.map((b) => b.fields.badge_id));
  const allVenueBadgeDefs = badges
    .filter((b) => b.fields.target_type === 'venue')
    .sort((a, b) => (a.fields.sort_order || 0) - (b.fields.sort_order || 0));

  // Stats for venue badge progress
  const totalVenueEvents = venueEvents.length;
  const distinctArtistIds = new Set<string>();
  const distinctArtistCountries = new Set<string>();
  for (const l of lineups) {
    if (!l.fields.event_id?.some(eid => venueEventIds.has(eid))) continue;
    for (const aid of l.fields.artist_id || []) {
      distinctArtistIds.add(aid);
      const art = artistMap.get(aid);
      if (art?.fields.country_code) distinctArtistCountries.add(art.fields.country_code);
    }
  }
  const friendlyLangCount = [f.friendly_en, f.friendly_ja, f.friendly_ko, f.friendly_th, f.friendly_id]
    .filter(Boolean).length;

  // Compute unique genre tags across venue events
  let uniqueTagCount = 0;
  if (venueEvents.length > 0) {
    const tagSet = new Set<string>();
    for (const ev of venueEvents) {
      for (const tid of ev.fields.tag_list || []) tagSet.add(tid);
    }
    uniqueTagCount = tagSet.size;
  }

  const venueBadgeProgress: BadgeProgress[] = allVenueBadgeDefs.map((b) => {
    const bid = b.fields.badge_id || b.id;
    const target = b.fields.criteria_target as number | null;
    const isEarned = earnedVenueBadgeIds.has(bid);

    let progress: { current: number; target: number } | null = null;
    switch (bid) {
      case 'ven_genre_explorer':
        progress = { current: uniqueTagCount, target: target || 5 }; break;
      case 'ven_artist_magnet':
        progress = { current: distinctArtistIds.size, target: target || 10 }; break;
      case 'ven_world_stage':
        progress = { current: distinctArtistCountries.size, target: target || 3 }; break;
      case 'ven_multilingual':
        progress = { current: friendlyLangCount, target: target || 2 }; break;
      case 'ven_marathon':
        progress = { current: totalVenueEvents, target: target || 20 }; break;
    }

    const computedEarned = isEarned || (progress ? progress.current >= progress.target : false);
    return {
      badge_id: bid,
      category: (b.fields.category || 'venue_excellence') as BadgeProgress['category'],
      name: localized(b.fields as Record<string, unknown>, 'name', locale) || b.fields.name_en || '',
      description: localized(b.fields as Record<string, unknown>, 'description', locale) || b.fields.description_en || '',
      earned: computedEarned,
      earned_at: f.badge_earned_at?.[bid] ?? (computedEarned ? new Date().toISOString() : null),
      progress,
      sort_order: b.fields.sort_order || 0,
    } as BadgeProgress;
  });
  const topPerformers = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => artistMap.get(id))
    .filter(Boolean) as { id: string; fields: typeof artists[number]['fields'] }[];

  // JSON-LD structured data for SEO
  const localeToInLanguage: Record<string, string> = {
    en: 'en', zh: 'zh-Hant', ja: 'ja', ko: 'ko', th: 'th', id: 'id',
  };
  const city = f.city_id?.[0] ? cityMap.get(f.city_id[0]) : null;
  const venueSameAs = [
    f.website_url, f.facebook_url,
    f.instagram ? `https://www.instagram.com/${f.instagram.replace(/^@/, '')}` : undefined,
  ].filter(Boolean) as string[];
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'MusicVenue',
    name: displayName(f),
    ...(desc && { description: desc }),
    ...(photoUrl(f.photo_url) && { image: photoUrl(f.photo_url) }),
    url: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}/venues/${slug}`,
    ...(f.phone && { telephone: f.phone }),
    ...(f.contact_email && { email: f.contact_email }),
    ...(localeToInLanguage[locale] && { inLanguage: localeToInLanguage[locale] }),
    ...(venueSameAs.length > 0 && { sameAs: venueSameAs }),
    ...((f.address_local || f.address_en) && {
      address: {
        '@type': 'PostalAddress',
        ...(f.address_en && { streetAddress: f.address_en }),
        ...(f.address_local && { streetAddress: f.address_local }),
        ...(city && { addressLocality: cityName(city, 'en') }),
        ...(city?.country_code && { addressCountry: city.country_code }),
      },
    }),
    ...((f.lat && f.lng) && {
      geo: { '@type': 'GeoCoordinates', latitude: f.lat, longitude: f.lng },
    }),
    ...(f.capacity && { maximumAttendeeCapacity: f.capacity }),
  };

  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'JazzNode', item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}` },
      { '@type': 'ListItem', position: 2, name: t('venues'), item: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com'}/${locale}/venues` },
      { '@type': 'ListItem', position: 3, name: displayName(f) },
    ],
  };

  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <Link href={`/${locale}/venues`} className="mb-8 inline-block text-sm text-[#8A8578] hover:text-gold transition-colors link-lift">
        {t('backToList')}
      </Link>

      <FavoriteHighlight itemType="venue" itemId={venue.id}>
      <div className="space-y-12">

      {/* Status Banner */}
      {f.status === 'inactive' && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-amber-900/20 border border-amber-700/30 text-amber-400">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          <span className="text-sm font-medium">{t('venueInactive')}</span>
        </div>
      )}
      {f.status === 'closed' && (
        <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-900/20 border border-red-700/30 text-red-400">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
          <span className="text-sm font-medium">{t('venueClosed')}</span>
        </div>
      )}

      {/* Hero */}
      <FadeUp>
      <div className="flex flex-col lg:flex-row gap-10">
        {photoUrl(f.photo_url) ? (
          <div className="w-full lg:w-[400px] shrink-0 overflow-hidden rounded-2xl">
            <Image src={photoUrl(f.photo_url)!} alt={displayName(f)} width={800} height={600} className="w-full h-auto object-cover" sizes="(min-width: 1024px) 400px, 100vw" />
          </div>
        ) : (
          <div className="w-full lg:w-[400px] h-[260px] shrink-0 rounded-2xl bg-[var(--card)] flex items-center justify-center border border-[var(--border)]">
            <svg className="w-16 h-16 text-[#8A8578]/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
          </div>
        )}

        <div className="flex-1 space-y-6">
          <div>
            <div className="inline-flex items-start gap-1">
              <h1 className="font-serif text-4xl sm:text-5xl font-bold">
                {displayName(f)}
              </h1>
              {f.tier != null && f.tier >= 1 && <VerifiedBadge label={t('claimed')} className={`!top-0 !ml-0 ${/[a-z]$/.test(displayName(f)) ? 'mt-1 sm:mt-1.5' : 'mt-0'}`} />}
            </div>
          </div>
          {f.name_en && f.name_local && f.name_en !== f.name_local && (
            <p className="text-xl text-[#8A8578]">{f.name_en}</p>
          )}

          {/* Tags + Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {f.city_id?.[0] && cityMap.get(f.city_id[0]) && (
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                <svg className="w-3 h-3" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C4.7 0 2 2.7 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.5c-1.4 0-2.5-1.1-2.5-2.5S6.6 3.5 8 3.5s2.5 1.1 2.5 2.5S9.4 8.5 8 8.5z"/></svg>
                {cityName(cityMap.get(f.city_id[0])!, locale)}
              </span>
            )}
            {f.jazz_frequency && f.jazz_frequency !== 'none' && (
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                {jazzFreqLabel[f.jazz_frequency] || f.jazz_frequency}
              </span>
            )}
            {f.capacity != null && f.capacity > 0 && (
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                {f.capacity} {t('capacitySeats')}
              </span>
            )}
            {f.currency && (
              <span className="inline-flex items-center gap-1.5 text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2"/><path d="M12 6v12M9 9.5c0-1 .9-1.5 3-1.5s3 .5 3 1.5-1 1.5-3 2-3 1-3 2 .9 1.5 3 1.5 3-.5 3-1.5"/></svg>
                {f.currency}
              </span>
            )}
            {f.is_gold_partner && (
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-500 text-[#0A0A0A] font-bold">
                ★ {t('goldPartner')}
              </span>
            )}
            <TierGate entityType="venue" featureKey="verified_badge" currentTier={f.tier ?? 0}>
              {f.verification_status === 'Verified' && (
                <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl bg-gold text-[#0A0A0A] font-bold">
                  ✓ {t('verified')}
                </span>
              )}
            </TierGate>
              <span className="text-[#8A8578]/30 select-none">|</span>
              <TierGate entityType="venue" featureKey="inbox" currentTier={f.tier ?? 0}
                fallback={<MessageVenueButton venueId={venue.id} claimed={false} />}>
                <MessageVenueButton venueId={venue.id} claimed={!!f.tier && f.tier >= 1} />
              </TierGate>
              <ClaimButton targetType="venue" targetId={venue.id} targetName={displayName(f)} />
              <FollowButton itemType="venue" itemId={venue.id} variant="full" followerCount={followerCount} />
          </div>

          {/* Unclaimed notice */}
          {(!f.tier || f.tier === 0) && f.verification_status !== 'Verified' && (
            <p className="text-xs text-[#8A8578] italic">
              {t('unclaimedVenueNotice')}
            </p>
          )}
          {f.data_source === 'admin' && f.updated_by && (
            <AdminEditedByBadge updatedBy={f.updated_by} />
          )}

          {/* Vibe Check / Practical Info */}
          <div className="flex flex-wrap gap-2 text-xs uppercase tracking-widest text-[#8A8578]">
            {f.payment_method?.map((pm) => (
              <span key={pm} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)]">
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.11 0-2 .89-2 2v12c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z"/></svg>
                {paymentLabel[pm] || pm}
              </span>
            ))}
            {f.friendly_zh && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)]"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> 中文友善</span>}
            {f.friendly_en && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)]"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> English Friendly</span>}
            {f.friendly_ja && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)]"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> 日本語OK</span>}
            {f.friendly_ko && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)]"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> 한국어 가능</span>}
            {f.friendly_th && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)]"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> ภาษาไทย</span>}
            {f.friendly_id && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--border)]"><svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/></svg> Bahasa Indonesia</span>}
          </div>

{/* Badges */}
          {venueBadgeProgress.length > 0 && (
            <BadgeCategorySection
              title={t('badgesCategoryVenueExcellence')}
              categoryKey="venue_excellence"
              badges={venueBadgeProgress}
              earnedOnly
            />
          )}

          <TierGate entityType="venue" featureKey="description" currentTier={f.tier ?? 0}>
            <EditableContent
              entityType="venue"
              entityId={venue.id}
              fieldPrefix="description"
              locale={locale}
              content={desc}
              contentClassName="text-[#C4BFB3] leading-relaxed"
            />
          </TierGate>

          {/* Links */}
          <TierGate entityType="venue" featureKey="edit_profile" currentTier={f.tier ?? 0}>
            <SocialIcons
              websiteUrl={f.website_url}
              instagram={f.instagram}
              facebookUrl={f.facebook_url}
            />
          </TierGate>

          {/* Contact Info */}
          {(f.phone || f.contact_email) && (
            <div className="flex flex-wrap gap-4 text-sm text-[#C4BFB3]">
              {f.phone && (
                <a href={`tel:${f.phone}`} className="flex items-center gap-2 hover:text-gold transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                  {f.phone}
                </a>
              )}
              {f.contact_email && (
                <a href={`mailto:${f.contact_email}`} className="flex items-center gap-2 hover:text-gold transition-colors">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/></svg>
                  {f.contact_email}
                </a>
              )}
            </div>
          )}

          {/* Business Hours */}
          {f.business_hour && (
            <div className="text-sm text-[#C4BFB3]">
              <span className="flex items-center gap-2 text-[#8A8578] mb-1">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.49 2 2 6.49 2 12s4.49 10 10 10 10-4.49 10-10S17.51 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                {t('businessHours')}
              </span>
              <p className="whitespace-pre-line ml-6">{f.business_hour}</p>
            </div>
          )}

        </div>
      </div>

      </FadeUp>


      {/* Location & Map */}
      {((f.lat && f.lng) || f.address_local || f.address_en) && (
        <FadeUp stagger={0.1}>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8 flex items-center gap-3">
              <svg className="w-5 h-5 text-gold" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C4.7 0 2 2.7 2 6c0 4.5 6 10 6 10s6-5.5 6-10c0-3.3-2.7-6-6-6zm0 8.5c-1.4 0-2.5-1.1-2.5-2.5S6.6 3.5 8 3.5s2.5 1.1 2.5 2.5S9.4 8.5 8 8.5z"/></svg>
              {t('locationMap')}
            </h2>
            {(f.address_local || f.address_en) && (
              <div className="mb-6 space-y-1">
                {f.address_local && <p className="text-sm text-[#C4BFB3]">{f.address_local}</p>}
                {f.address_en && f.address_en !== f.address_local && (
                  <p className="text-xs text-[#8A8578]">{f.address_en}</p>
                )}
              </div>
            )}
            {f.lat && f.lng && (
              <>
                <div className="rounded-2xl overflow-hidden border border-[var(--border)] h-[250px] sm:h-[350px] relative bg-[#1A1A1A]">
                  <iframe
                    width="100%"
                    height="100%"
                    style={{ border: 0, filter: "grayscale(100%) invert(92%) contrast(83%) opacity(80%)" }}
                    loading="lazy"
                    allowFullScreen
                    src={`https://www.google.com/maps/embed/v1/place?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}&q=${f.lat},${f.lng}`}
                  ></iframe>
                  {!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && (
                    <div className="absolute inset-0 flex items-center justify-center bg-[#1A1A1A]">
                      <a href={`https://maps.apple.com/?ll=${f.lat},${f.lng}&q=${encodeURIComponent(f.name_local || f.name_en || 'Venue')}`} target="_blank" rel="noreferrer" className="px-6 py-3 rounded-xl border border-gold/30 text-gold hover:bg-gold/10 transition-colors">
                        {t('openInAppleMaps')}
                      </a>
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-3 mt-4">
                  <a
                    href={f.place_id ? `https://www.google.com/maps/place/?q=place_id:${f.place_id}` : `https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lng}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs px-4 py-2 rounded-xl border border-[var(--border)] text-[#8A8578] hover:text-gold hover:border-gold/30 transition-colors"
                  >
                    {t('openInGoogleMaps')}
                  </a>
                  <a
                    href={`https://maps.apple.com/?ll=${f.lat},${f.lng}&q=${encodeURIComponent(f.name_local || f.name_en || 'Venue')}`}
                    target="_blank" rel="noreferrer"
                    className="text-xs px-4 py-2 rounded-xl border border-[var(--border)] text-[#8A8578] hover:text-gold hover:border-gold/30 transition-colors"
                  >
                    {t('openInAppleMaps')}
                  </a>
                </div>
              </>
            )}
          </section>
        </FadeUp>
      )}

      {/* Venue Stats */}
      {venueEvents.length > 0 && (() => {
        const sortedByDate = [...venueEvents].filter(e => e.fields.start_at).sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
        const firstEvent = sortedByDate[0];
        const firstYear = firstEvent?.fields.start_at ? new Date(firstEvent.fields.start_at).getFullYear() : null;
        const currentYear = new Date().getFullYear();
        const yearsActive = firstYear ? currentYear - firstYear + 1 : null;
        const uniqueArtistCount = artistCounts.size;
        return (
          <FadeUp>
            <section className="border-t border-[var(--border)] pt-12">
              <h2 className="font-serif text-2xl font-bold mb-8">{t('venueStats')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 text-center">
                  <div className="text-3xl font-bold text-gold">{venueEvents.length}</div>
                  <div className="text-xs text-[#8A8578] mt-1 uppercase tracking-widest">{t('totalGigs')}</div>
                </div>
                {uniqueArtistCount > 0 && (
                  <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 text-center">
                    <div className="text-3xl font-bold text-gold">{uniqueArtistCount}</div>
                    <div className="text-xs text-[#8A8578] mt-1 uppercase tracking-widest">{t('artists')}</div>
                  </div>
                )}
                {yearsActive && yearsActive > 0 && (
                  <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 text-center">
                    <div className="text-3xl font-bold text-gold">{yearsActive}</div>
                    <div className="text-xs text-[#8A8578] mt-1 uppercase tracking-widest">
                      {locale === 'zh' ? '年' : locale === 'ja' ? '年' : locale === 'ko' ? '년' : 'years'}
                    </div>
                  </div>
                )}
                {f.capacity != null && f.capacity > 0 && (
                  <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-5 text-center">
                    <div className="text-3xl font-bold text-gold">{f.capacity}</div>
                    <div className="text-xs text-[#8A8578] mt-1 uppercase tracking-widest">{t('capacitySeats')}</div>
                  </div>
                )}
              </div>
            </section>
          </FadeUp>
        );
      })()}

      {/* Community Reviews */}
      <FadeUp>
        <VenueReviewsSection venueId={venue.id} />
      </FadeUp>

{/* Most Frequent Performers */}
      {topPerformers.length > 0 && (
        <FadeUp stagger={0.08}>
          <section className="border-t border-[var(--border)] pt-12">
            <h2 className="font-serif text-2xl font-bold mb-8">{t('topPerformers') || '常駐樂手'}</h2>
            <div className="flex flex-wrap gap-3">
              {topPerformers.map((a) => (
                <Link key={a.id} href={`/${locale}/artists/${a.id}`}
                  className="flex items-center gap-3 bg-[var(--card)] px-4 py-3 rounded-xl border border-[var(--border)] card-hover group">
                  {photoUrl(a.fields.photo_url) && (
                    <Image src={photoUrl(a.fields.photo_url)!} alt={artistDisplayName(a.fields, locale)} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
                  )}
                  <div>
                    <span className="text-sm font-medium group-hover:text-gold transition-colors">{artistDisplayName(a.fields, locale)}</span>
                    {a.fields.primary_instrument && (
                      <span className="text-xs text-[#8A8578] ml-2">{instLabel(a.fields.primary_instrument)}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </FadeUp>
      )}

      
      {/* Jam Sessions */}
      {(() => {
        const jams = venueEvents.filter(e => e.fields.subtype === 'jam_session');
        if (jams.length === 0) return null;
        return (
          <FadeUp stagger={0.1}>
            <section className="border-t border-[var(--border)] pt-12">
              <h2 className="font-serif text-2xl font-bold mb-8">Jam Sessions</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {jams.slice(0, 3).map((event) => {
                  const tz = event.fields.timezone || 'Asia/Taipei';
                  const artist = resolveLinks(event.fields.primary_artist, artists)[0];
                  return (
                    <Link key={event.id} href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-5 rounded-2xl border border-gold/30 card-hover group">
                      <div className="text-xs uppercase tracking-widest text-gold mb-2">
                        {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                      </div>
                      <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                        {eventTitle(event.fields, locale)}
                      </h3>
                      {artist && <p className="text-xs text-[#8A8578] mt-1">Host: {artistDisplayName(artist.fields, locale)}</p>}
                    </Link>
                  );
                })}
              </div>
            </section>
          </FadeUp>
        );
      })()}

{/* Upcoming Events */}
      {(() => {
        const now = new Date().toISOString();
        const sevenDaysLater = new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const weeklyJams = venueEvents
          .filter((e) => {
            if (e.fields.subtype !== 'jam_session') return false;
            if (!e.fields.start_at || e.fields.start_at < now || e.fields.start_at > sevenDaysLater) return false;
            return true;
          })
          .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
        const upcomingEvents = venueEvents
          .filter((e) => e.fields.lifecycle_status === 'upcoming' || (!e.fields.lifecycle_status && (e.fields.start_at || '') >= now))
          .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
        const pastEvents = venueEvents
          .filter((e) => e.fields.lifecycle_status === 'past' || (e.fields.lifecycle_status !== 'upcoming' && (e.fields.start_at || '') < now));

        return (
          <>
            <FadeUp stagger={0.12}>
              <section className="border-t border-[var(--border)] pt-12">
                <div className="flex items-end justify-between mb-8 border-b border-[var(--border)] pb-6">
                  <h2 className="font-serif text-2xl font-bold flex items-center gap-3">
                    <span className="pulse-dot" />
                    {t('upcomingGigs')}
                  </h2>
                  <Link href={`/${locale}/events?venue=${venue.id}`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
                    {t('viewAll')} →
                  </Link>
                </div>
                {upcomingEvents.length === 0 ? (
                  <p className="text-[#8A8578]">{t('noEvents')}</p>
                ) : (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {upcomingEvents.slice(0, 6).map((event) => {
                      const tz = event.fields.timezone || 'Asia/Taipei';
                      const artist = resolveLinks(event.fields.primary_artist, artists)[0];
                      return (
                        <Link key={event.id} href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-5 rounded-2xl border border-[var(--border)] card-hover group">
                          {event.fields.poster_url && (
                            <div className="h-36 overflow-hidden mb-4 -mx-5 -mt-5 rounded-t-2xl relative">
                              <Image src={event.fields.poster_url} alt={eventTitle(event.fields, locale)} fill className="object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500" sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" />
                            </div>
                          )}
                          <div className="text-xs uppercase tracking-widest text-gold mb-2">
                            {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                          </div>
                          <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                            {eventTitle(event.fields, locale)}
                          </h3>
                          {artist && <p className="text-xs text-[#8A8578] mt-1">♪ {artistDisplayName(artist.fields, locale)}</p>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </section>
            </FadeUp>

            {/* Weekly Open Jam */}
            {weeklyJams.length > 0 && (
              <FadeUp stagger={0.12}>
                <section className="border-t border-[var(--border)] pt-12">
                  <div className="flex items-end justify-between mb-8 border-b border-[var(--border)] pb-6">
                    <h2 className="font-serif text-2xl font-bold">{t('weeklyJam')}</h2>
                    <Link href={`/${locale}/events?venue=${venue.id}&category=jam`} className="text-sm uppercase tracking-widest text-gold hover:text-[#E8C868] transition-colors link-lift">
                      {t('viewAll')} →
                    </Link>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {weeklyJams.map((event) => {
                      const tz = event.fields.timezone || 'Asia/Taipei';
                      const artist = resolveLinks(event.fields.primary_artist, artists)[0];
                      return (
                        <Link key={event.id} href={`/${locale}/events/${event.id}`} className="block bg-[var(--card)] p-5 rounded-2xl border border-gold/30 card-hover group">
                          <div className="text-xs uppercase tracking-widest text-gold mb-2">
                            {formatDate(event.fields.start_at, locale, tz)} · {formatTime(event.fields.start_at, tz)}
                          </div>
                          <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                            {eventTitle(event.fields, locale)}
                          </h3>
                          {artist && <p className="text-xs text-[#8A8578] mt-1">♪ {artistDisplayName(artist.fields, locale)}</p>}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              </FadeUp>
            )}

            {/* Past Events */}
            {pastEvents.length > 0 && (
              <FadeUp>
                <section className={upcomingEvents.length === 0 ? 'border-t border-[var(--border)] pt-12' : ''}>
                  <CollapsibleSection
                    title={t('pastHighlights')}
                    count={pastEvents.length}
                    countLabel={t('gigsCount')}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {pastEvents.slice(0, 12).map((event) => {
                        const tz = event.fields.timezone || 'Asia/Taipei';
                        const artist = resolveLinks(event.fields.primary_artist, artists)[0];
                        return (
                          <Link
                            key={event.id}
                            href={`/${locale}/events/${event.id}`}
                            className="block p-4 rounded-xl border border-[var(--border)] hover:border-[var(--color-gold)]/20 transition-colors group"
                          >
                            <div className="text-xs text-[#8A8578] mb-1">
                              {formatDate(event.fields.start_at, locale, tz)}
                            </div>
                            <h3 className="text-sm font-medium group-hover:text-gold transition-colors duration-300 line-clamp-1">
                              {eventTitle(event.fields, locale)}
                            </h3>
                            {artist && <p className="text-xs text-[#8A8578]/60 mt-0.5">♪ {artistDisplayName(artist.fields, locale)}</p>}
                          </Link>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                </section>
              </FadeUp>
            )}
          </>
        );
      })()}

      {/* ─── Prev / Next Navigation ─── */}
      <RecordNav
        prevHref={prevVenue ? `/${locale}/venues/${prevVenue.id}` : null}
        prevTitle={prevVenue ? displayName(prevVenue.fields) : null}
        nextHref={nextVenue ? `/${locale}/venues/${nextVenue.id}` : null}
        nextTitle={nextVenue ? displayName(nextVenue.fields) : null}
        prevLabel={t('prevVenue')}
        nextLabel={t('nextVenue')}
      />
      </div>
      </FavoriteHighlight>
    </div>
  );
}
