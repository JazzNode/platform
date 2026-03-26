export const revalidate = 3600;
import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import { redirect, notFound } from 'next/navigation';
import { getVenues, getEvents, getArtists, getBadges, getCities, getLineups, resolveLinks, getFollowerCount } from '@/lib/supabase';
import { displayName, artistDisplayName, photoUrl, localized, cityName, eventTitle, normalizeInstrumentKey, isEventTonight } from '@/lib/helpers';
import FadeUp from '@/components/animations/FadeUp';
import FavoriteHighlight from '@/components/FavoriteHighlight';
import AdminEditedByBadge from '@/components/AdminEditedByBadge';
import type { BadgeProgress } from '@/lib/badges';
import VenueCommentsSection from '@/components/VenueCommentsSection';

import {
  VenueHero,
  VenueFeaturedEvent,
  VenueUpcomingEvents,
  VenueAbout,
  VenueGallery,
  VenueArtists,
  VenuePracticalInfo,
  VenueStayConnected,
  VenuePastEvents,
} from '@/components/venue-sections';

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
  const ogParams = new URLSearchParams({ name });
  if (cityLabel) ogParams.set('city', cityLabel);
  if (photo) ogParams.set('photo', photo);
  const ogUrl = `/api/og/venue?${ogParams.toString()}`;
  return {
    title: name,
    description,
    openGraph: {
      images: [{ url: ogUrl, width: 1200, height: 630 }],
      description,
    },
    twitter: { card: 'summary_large_image' },
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

  const f = venue.fields;
  const desc = localized(f as Record<string, unknown>, 'description', locale);

  // Lookup maps
  const jazzFreqLabel: Record<string, string> = {
    nightly: t('jazzNightly'), weekends: t('jazzWeekends'), occasional: t('jazzOccasional'),
  };
  const paymentLabel: Record<string, string> = {
    cash: t('payCash'), credit_card: t('payCreditCard'), bank_transfer: t('payBankTransfer'),
    line_pay: 'Line Pay', apple_pay: 'Apple Pay', jkopay: 'JKOPay',
  };

  // Events & badges
  const venueEvents = resolveLinks(f.event_list, events)
    .sort((a, b) => (b.fields.start_at || '').localeCompare(a.fields.start_at || ''));
  const venueBadges = resolveLinks(f.badge_list, badges);

  // Artist counts
  const venueEventIds = new Set(venueEvents.map(e => e.id));
  const artistCounts = new Map<string, number>();
  for (const l of lineups) {
    if (!l.fields.event_id?.some(eid => venueEventIds.has(eid))) continue;
    for (const aid of l.fields.artist_id || []) {
      artistCounts.set(aid, (artistCounts.get(aid) || 0) + 1);
    }
  }
  const artistMap = new Map(artists.map(a => [a.id, a]));

  // Badge progress
  const earnedVenueBadgeIds = new Set(venueBadges.map((b) => b.fields.badge_id));
  const allVenueBadgeDefs = badges
    .filter((b) => b.fields.target_type === 'venue')
    .sort((a, b) => (a.fields.sort_order || 0) - (b.fields.sort_order || 0));

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
      case 'ven_genre_explorer': progress = { current: uniqueTagCount, target: target || 5 }; break;
      case 'ven_artist_magnet': progress = { current: distinctArtistIds.size, target: target || 10 }; break;
      case 'ven_world_stage': progress = { current: distinctArtistCountries.size, target: target || 3 }; break;
      case 'ven_multilingual': progress = { current: friendlyLangCount, target: target || 2 }; break;
      case 'ven_marathon': progress = { current: totalVenueEvents, target: target || 20 }; break;
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

  // Top performers
  const topPerformers = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([id]) => artistMap.get(id))
    .filter((a): a is { id: string; fields: typeof artists[number]['fields'] } => !!a && a.fields.type === 'person')
    .slice(0, 12);

  // Event splits: Today → Upcoming (after today) → Past
  const now = new Date().toISOString();

  // Today's events: happening today in the venue's timezone
  const todayEvents = venueEvents
    .filter((e) => e.fields.start_at && isEventTonight(e.fields.start_at, e.fields.timezone || 'Asia/Taipei'))
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));

  // Upcoming: strictly AFTER today (exclude today's events since they're shown above)
  const todayEventIds = new Set(todayEvents.map((e) => e.id));
  const upcomingEvents = venueEvents
    .filter((e) => {
      if (todayEventIds.has(e.id)) return false; // already shown in today
      const isUpcoming = e.fields.lifecycle_status === 'upcoming' || (!e.fields.lifecycle_status && (e.fields.start_at || '') >= now);
      if (!isUpcoming) return false;
      // Exclude events that are actually today (double-check)
      if (e.fields.start_at && isEventTonight(e.fields.start_at, e.fields.timezone || 'Asia/Taipei')) return false;
      return true;
    })
    .sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));

  const pastEvents = venueEvents
    .filter((e) => {
      if (todayEventIds.has(e.id)) return false;
      return e.fields.lifecycle_status === 'past' || (e.fields.lifecycle_status !== 'upcoming' && (e.fields.start_at || '') < now);
    });

  // Featured = first today event, or first upcoming
  const featuredEvent = todayEvents[0] || upcomingEvents[0] || null;
  const isFeaturedToday = todayEvents.length > 0;
  const remainingToday = todayEvents.slice(1);
  const remainingUpcoming = isFeaturedToday ? upcomingEvents : upcomingEvents.slice(1);

  // Stats
  const sortedByDate = [...venueEvents].filter(e => e.fields.start_at).sort((a, b) => (a.fields.start_at || '').localeCompare(b.fields.start_at || ''));
  const firstYear = sortedByDate[0]?.fields.start_at ? new Date(sortedByDate[0].fields.start_at).getFullYear() : null;
  const yearsActive = firstYear ? new Date().getFullYear() - firstYear + 1 : null;

  // City
  const cityFields = f.city_id?.[0] ? cityMap.get(f.city_id[0]) ?? null : null;
  const cityLabel = cityFields ? cityName(cityFields, locale) : '';

  // JSON-LD
  const localeToInLanguage: Record<string, string> = {
    en: 'en', zh: 'zh-Hant', ja: 'ja', ko: 'ko', th: 'th', id: 'id',
  };
  const venueSameAs = [
    f.website_url, f.facebook_url,
    f.instagram ? `https://www.instagram.com/${(f.instagram as string).replace(/^@/, '')}` : undefined,
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
        ...(cityFields && { addressLocality: cityName(cityFields, 'en') }),
        ...(cityFields?.country_code && { addressCountry: cityFields.country_code }),
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
    <div className="overflow-x-clip">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <FavoriteHighlight itemType="venue" itemId={venue.id}>

      {/* Status Banners */}
      {f.status === 'inactive' && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl bg-amber-900/20 border border-amber-700/30 text-amber-400">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>
          <span className="text-sm font-medium">{t('venueInactive')}</span>
        </div>
      )}
      {f.status === 'closed' && (
        <div className="mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl bg-red-900/20 border border-red-700/30 text-red-400">
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8 0-1.85.63-3.55 1.69-4.9L16.9 18.31C15.55 19.37 13.85 20 12 20zm6.31-3.1L7.1 5.69C8.45 4.63 10.15 4 12 4c4.42 0 8 3.58 8 8 0 1.85-.63 3.55-1.69 4.9z"/></svg>
          <span className="text-sm font-medium">{t('venueClosed')}</span>
        </div>
      )}

      {/* Unclaimed notice */}
      {(!f.tier || f.tier === 0) && f.verification_status !== 'Verified' && (
        <p className="mb-4 text-xs text-[var(--muted-foreground)] italic px-1">
          {t('unclaimedVenueNotice')}
        </p>
      )}
      {f.data_source === 'admin' && f.updated_by && (
        <div className="mb-4"><AdminEditedByBadge updatedBy={f.updated_by as string} /></div>
      )}

      <div className="space-y-12">

        {/* ═══ 1. CINEMATIC HERO ═══ */}
        <VenueHero
          venue={venue}
          locale={locale}
          cityFields={cityFields}
          followerCount={followerCount}
          jazzFreqLabel={jazzFreqLabel}
          t={t}
        />

        {/* ═══ 2. FEATURED EVENT (Today or Next Show) ═══ */}
        {featuredEvent && (
          <FadeUp>
            <VenueFeaturedEvent
              event={featuredEvent}
              artist={resolveLinks(featuredEvent.fields.primary_artist, artists)[0] || null}
              locale={locale}
              t={t}
              isToday={isFeaturedToday}
            />
          </FadeUp>
        )}

        {/* ═══ 2b. MORE TODAY EVENTS ═══ */}
        {remainingToday.length > 0 && (
          <FadeUp stagger={0.1}>
            <VenueUpcomingEvents
              events={remainingToday}
              artists={artists}
              venueId={venue.id}
              locale={locale}
              t={t}
              resolveLinks={resolveLinks}
              sectionTitle={t('tonightEvents').replace('\n', ' ')}
            />
          </FadeUp>
        )}

        {/* ═══ 3. UPCOMING EVENTS (after today) ═══ */}
        {remainingUpcoming.length > 0 && (
          <FadeUp stagger={0.1}>
            <VenueUpcomingEvents
              events={remainingUpcoming}
              artists={artists}
              venueId={venue.id}
              locale={locale}
              t={t}
              resolveLinks={resolveLinks}
            />
          </FadeUp>
        )}

        {/* No events at all */}
        {todayEvents.length === 0 && upcomingEvents.length === 0 && (
          <FadeUp>
            <section>
              <div className="flex items-center gap-3 mb-4">
                <span className="pulse-dot" />
                <h2 className="font-serif text-xl sm:text-2xl font-bold">{t('upcomingGigs')}</h2>
              </div>
              <p className="text-[var(--muted-foreground)]">
                {t('noEvents')}
                {pastEvents.length > 0 && (
                  <>
                    {' '}
                    <a href="#past-events" className="text-[var(--muted-foreground)] hover:text-gold transition-colors underline underline-offset-4 decoration-[var(--border)]">
                      {t('pastHighlights')} ({pastEvents.length})
                    </a>
                  </>
                )}
              </p>
            </section>
          </FadeUp>
        )}

        {/* ═══ 4. ABOUT + STATS + BADGES ═══ */}
        <FadeUp>
          <VenueAbout
            venue={venue}
            locale={locale}
            description={desc}
            stats={{
              totalEvents: totalVenueEvents,
              uniqueArtists: artistCounts.size,
              yearsActive,
              capacity: (f.capacity as number) ?? null,
            }}
            badges={venueBadgeProgress}
            t={t}
          />
        </FadeUp>

        {/* ═══ 5. PHOTO GALLERY (Bento Grid) ═══ */}
        <FadeUp>
          <VenueGallery venueId={slug} label={t('photoGallery')} />
        </FadeUp>

        {/* ═══ 6. RESIDENT ARTISTS ═══ */}
        {topPerformers.length > 0 && (
          <FadeUp stagger={0.08}>
            <VenueArtists
              artists={topPerformers}
              artistCounts={artistCounts}
              locale={locale}
              t={t}
              instLabel={instLabel}
            />
          </FadeUp>
        )}

        {/* ═══ 7. PRACTICAL INFO ═══ */}
        <FadeUp>
          <VenuePracticalInfo
            venue={venue}
            locale={locale}
            t={t}
            paymentLabel={paymentLabel}
          />
        </FadeUp>

        {/* ═══ 8. COMMUNITY BOARD ═══ */}
        <FadeUp>
          <VenueCommentsSection venueId={venue.id} />
        </FadeUp>

        {/* ═══ 9. PAST EVENTS ═══ */}
        {pastEvents.length > 0 && (
          <FadeUp>
            <div id="past-events" />
            <VenuePastEvents
              events={pastEvents}
              artists={artists}
              locale={locale}
              t={t}
              resolveLinks={resolveLinks}
            />
          </FadeUp>
        )}

        {/* ═══ 10. STAY CONNECTED ═══ */}
        <FadeUp>
          <VenueStayConnected
            venue={venue}
            locale={locale}
            cityLabel={cityLabel}
            followerCount={followerCount}
            t={t}
          />
        </FadeUp>

      </div>
      </FavoriteHighlight>
    </div>
  );
}
