'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useFilterParams } from '@/hooks/useFilterParams';
import Image from 'next/image';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import FollowButton from '@/components/FollowButton';
import ShareButton from '@/components/ShareButton';
import { useFollows } from '@/components/FollowsProvider';
import { useRegion } from '@/components/RegionProvider';
import VerifiedBadge from '@/components/VerifiedBadge';
import { BADGE_ICONS } from '@/components/BadgeCard';

interface SerializedVenue {
  id: string;
  displayName: string;
  photoUrl: string | null;
  cityRecordId: string | null;
  cityLabel: string;
  eventCount: number;
  jazzFrequency: string | null;
  jazzFrequencyLabel: string | null;
  description: string | null;
  hasUpcomingJam?: boolean;
  jamBadgeLabel?: string;
  tier: number;
  badgeList?: string[];
  galleryPhotos?: string[];
}

interface CityOption {
  recordId: string;
  citySlug: string;
  label: string;
  countryCode: string;
}

interface InitialFilters {
  region?: string;   // country code
  city?: string;     // city record ID
}

interface Props {
  venues: SerializedVenue[];
  cities: CityOption[];
  locale: string;
  regionLabels: Record<string, string>;
  worldMapLabel: string;
  badgeNameMap?: Record<string, string>;
  initialFilters?: InitialFilters;
  labels: {
    venues: string;
    allCities: string;
    noVenues: string;
  };
}

/* ── Card image carousel (fade transition, auto-rotate) ── */

function CardCarousel({ images, alt }: { images: string[]; alt: string }) {
  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<'visible' | 'fading'>('visible');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [hovered, setHovered] = useState(false);

  const advance = useCallback(() => {
    if (images.length <= 1) return;
    setPhase('fading');
    setTimeout(() => {
      setCurrent((i) => (i + 1) % images.length);
      setPhase('visible');
    }, 500);
  }, [images.length]);

  useEffect(() => {
    if (images.length <= 1 || hovered) return;
    intervalRef.current = setInterval(advance, 6000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [images.length, advance, hovered]);

  return (
    <div
      className="h-44 overflow-hidden mb-5 -mx-6 -mt-6 rounded-t-2xl relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Image
        src={images[current]}
        alt={alt}
        fill
        className="object-cover opacity-70 group-hover:opacity-100 transition-all duration-500"
        style={{ opacity: phase === 'fading' ? 0.3 : undefined }}
        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
      />
      {/* Dot indicators */}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1 z-10">
          {images.map((_, i) => (
            <span
              key={i}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-3 h-1.5 bg-[var(--color-gold)]' : 'w-1.5 h-1.5 bg-white/40'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Shared pill base: visual stays compact, but an invisible ::after pseudo-element
// extends the touch target to 44px minimum (Apple/Google HIG recommendation).
const pillHitArea = 'relative after:absolute after:inset-x-0 after:inset-y-[-6px] after:content-[\'\'] after:min-h-[44px] after:top-1/2 after:-translate-y-1/2';

export default function VenuesClient({ venues, cities, locale, regionLabels, worldMapLabel, badgeNameMap = {}, initialFilters, labels }: Props) {
  const { isFollowing } = useFollows();
  const { region: globalRegion } = useRegion();
  const [hasInteracted, setHasInteracted] = useState(!!initialFilters);
  const [userRegion, setUserRegion] = useState<string | null>(() => {
    if (initialFilters?.city) {
      const c = cities.find((x) => x.recordId === initialFilters.city);
      return c?.countryCode || null;
    }
    return initialFilters?.region || null;
  });
  const [selectedCity, setSelectedCity] = useState<string | null>(
    initialFilters?.city || null
  );

  // Group cities by country code
  const regionGroups = useMemo(() => {
    const map: Record<string, CityOption[]> = {};
    for (const c of cities) {
      const code = c.countryCode;
      if (!code) continue;
      if (!map[code]) map[code] = [];
      map[code].push(c);
    }
    return map;
  }, [cities]);

  // Stable region order
  const regionOrder = useMemo(() => Object.keys(regionGroups).sort(), [regionGroups]);

  // Sync filter state back to URL for back-button restoration
  const filterParams = useMemo(() => ({
    region: userRegion,
    city: selectedCity,
  }), [userRegion, selectedCity]);
  useFilterParams(filterParams);

  // Derive effective region: prefer user/initial selection, fall back to global
  const activeRegion = (hasInteracted || initialFilters)
    ? userRegion
    : (globalRegion && regionGroups[globalRegion] ? globalRegion : null);

  // Derive selectedCities set for filtering
  const selectedCities = useMemo(() => {
    if (selectedCity) return new Set([selectedCity]);
    if (activeRegion && regionGroups[activeRegion]) {
      return new Set(regionGroups[activeRegion].map((c) => c.recordId));
    }
    return new Set<string>();
  }, [selectedCity, activeRegion, regionGroups]);

  const handleRegionClick = useCallback((code: string) => {
    setHasInteracted(true);
    if (activeRegion === code) {
      setUserRegion(null);
      setSelectedCity(null);
      return;
    }
    setUserRegion(code);
    setSelectedCity(null);
  }, [activeRegion]);

  const handleCityClick = useCallback((recordId: string) => {
    setSelectedCity((prev) => prev === recordId ? null : recordId);
  }, []);

  const handleWorldMapClick = useCallback(() => {
    setHasInteracted(true);
    setUserRegion(null);
    setSelectedCity(null);
  }, []);

  const filteredVenues = useMemo(() => {
    if (selectedCities.size === 0) return venues;
    return venues.filter((v) => v.cityRecordId && selectedCities.has(v.cityRecordId));
  }, [venues, selectedCities]);

  const filterKey = useMemo(() => {
    return `${activeRegion}_${selectedCity}`;
  }, [activeRegion, selectedCity]);

  return (
    <div className="space-y-12">
      <FadeUp>
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{labels.venues}</h1>
          <p className="text-[var(--muted-foreground)] mt-2 text-sm uppercase tracking-widest">
            {filteredVenues.length} venues
          </p>
        </div>
      </FadeUp>

      {/* Geographic hierarchy: World Map │ Region › Cities */}
      <div className="space-y-3">
        <FadeUpItem delay={100}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {/* World Map pill */}
          <button
            onClick={handleWorldMapClick}
            className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light ${
              !activeRegion
                ? 'bg-gold/20 border-gold text-gold'
                : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[var(--muted-foreground)] hover:border-[rgba(240,237,230,0.3)]'
            }`}
          >
            {worldMapLabel}
          </button>

          {/* Region pills */}
          {regionOrder.map((code, regionIdx) => {
            const isActive = activeRegion === code;
            const citiesInRegion = regionGroups[code] || [];

            // Hide non-active regions when a region is drilled into
            if (activeRegion && !isActive) return null;

            return (
              <span key={`${code}-${activeRegion || 'w'}`} className="contents">
                {/* Separator */}
                {isActive && (
                  <span
                    className="text-gold/40 text-xs select-none mx-0.5"
                    style={{ animation: 'geo-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                  >│</span>
                )}

                {/* Region pill */}
                <button
                  onClick={() => handleRegionClick(code)}
                  style={{ animation: `geo-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${regionIdx * 0.04}s both` }}
                  className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light ${
                    isActive
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[var(--muted-foreground)] hover:border-[rgba(240,237,230,0.3)]'
                  }`}
                >
                  {regionLabels[code] || code}
                </button>

                {/* City sub-pills — show when region is active (skip if single city with same name as region) */}
                {isActive && !(citiesInRegion.length === 1 && citiesInRegion[0].label === (regionLabels[code] || code)) && (
                  <>
                    <span
                      className="text-gold/40 text-xs select-none mx-0.5"
                      style={{ animation: 'geo-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) 0.06s both' }}
                    >›</span>
                    {citiesInRegion.map((city, i) => (
                      <button
                        key={city.recordId}
                        onClick={() => handleCityClick(city.recordId)}
                        style={{ animation: `geo-pill-in 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${(i + 1) * 0.07}s both` }}
                        className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border font-serif font-light ${
                          selectedCity === city.recordId
                            ? 'bg-gold/15 border-gold/70 text-gold'
                            : 'bg-transparent border-[rgba(240,237,230,0.08)] text-[var(--muted-foreground)]/80 hover:border-[rgba(240,237,230,0.25)] hover:text-[var(--muted-foreground)]'
                        }`}
                      >
                        {city.label}
                      </button>
                    ))}
                  </>
                )}
              </span>
            );
          })}
        </div>
        </FadeUpItem>
      </div>

      <div key={filterKey}>
        {filteredVenues.length === 0 && (
          <FadeUp>
            <p className="text-[var(--muted-foreground)]">{labels.noVenues}</p>
          </FadeUp>
        )}

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredVenues.map((venue, i) => {
              const followed = isFollowing('venue', venue.id);
              return (
              <FadeUpItem key={venue.id} delay={(i % 3) * 60}>
              <Link
                href={`/${locale}/venues/${venue.id}`}
                className="block p-6 rounded-2xl border card-hover group relative h-full"
                style={{
                  backgroundColor: followed ? 'rgba(var(--theme-glow-rgb), 0.14)' : 'var(--card)',
                  borderColor: followed ? 'rgba(var(--theme-glow-rgb), 0.22)' : 'var(--border)',
                  transition: 'background-color 0.6s ease, border-color 0.6s ease, box-shadow 0.4s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
                }}
              >
                <div className="absolute top-3 right-3 z-10 flex items-center gap-0" onClick={(e) => e.preventDefault()}>
                  <ShareButton
                    title={venue.displayName}
                    url={`/${locale}/venues/${venue.id}`}
                    text={[
                      `📍 ${venue.cityLabel}｜${venue.displayName}`,
                      venue.description?.slice(0, 100) || '',
                      'via JazzNode — The Jazz Scene, Connected.',
                    ].filter(Boolean).join('\n')}
                    variant="icon"
                    glass
                  />
                  <FollowButton itemType="venue" itemId={venue.id} glass />
                </div>
                {venue.photoUrl && (() => {
                  const allImages = [venue.photoUrl, ...(venue.galleryPhotos || [])].slice(0, 5);
                  return allImages.length > 1 ? (
                    <div className="relative">
                      <CardCarousel images={allImages} alt={venue.displayName} />
                      {venue.hasUpcomingJam && (
                        <span className="absolute bottom-2 right-2 z-10 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gold/90 text-[#1a1a18] backdrop-blur-sm shadow-lg">
                          ♪ {venue.jamBadgeLabel}
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="h-44 overflow-hidden mb-5 -mx-6 -mt-6 rounded-t-2xl relative">
                      <Image
                        src={venue.photoUrl}
                        alt={venue.displayName}
                        fill
                        className="object-cover opacity-70 group-hover:opacity-100 transition-opacity duration-500"
                        sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                      />
                      {venue.hasUpcomingJam && (
                        <span className="absolute bottom-2 right-2 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gold/90 text-[#1a1a18] backdrop-blur-sm shadow-lg">
                          ♪ {venue.jamBadgeLabel}
                        </span>
                      )}
                    </div>
                  );
                })()}
                {!venue.photoUrl && venue.hasUpcomingJam && (
                  <span className="inline-block mb-3 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-gold/90 text-[#1a1a18]">
                    ♪ {venue.jamBadgeLabel}
                  </span>
                )}
                <h3 className="font-serif text-xl font-bold group-hover:text-gold transition-colors duration-300">
                  {venue.displayName}{venue.tier >= 1 && <VerifiedBadge size="sm" className={/[a-z]$/.test(venue.displayName) ? '' : '!top-0'} />}
                </h3>
                <div className="flex items-center gap-1.5 mt-2 text-xs uppercase tracking-widest text-[var(--muted-foreground)]">
                  {venue.cityLabel && <><span>{venue.cityLabel}</span><span className="text-[var(--muted-foreground)]/30">·</span></>}
                  <span>{venue.eventCount} events</span>
                  {venue.jazzFrequencyLabel && <><span className="text-[var(--muted-foreground)]/30">·</span><span>{venue.jazzFrequencyLabel}</span></>}
                </div>
                {venue.description && (
                  <p className="text-xs text-[var(--muted-foreground)] mt-3 line-clamp-2 leading-relaxed">
                    {venue.description}
                  </p>
                )}
                {venue.badgeList && venue.badgeList.length > 0 && (
                  <div className="flex items-center gap-1 mt-3 flex-wrap">
                    {venue.badgeList.slice(0, 5).map((badgeId) => (
                      <span
                        key={badgeId}
                        className="group/badge relative inline-flex items-center justify-center w-6 h-6 rounded-md bg-gold/10 text-gold/80 shrink-0 hover:bg-gold/25 hover:text-gold transition-all duration-200 cursor-default"
                      >
                        <span className="[&_svg]:!w-3.5 [&_svg]:!h-3.5">{BADGE_ICONS[badgeId] || BADGE_ICONS.ven_jazz_hub}</span>
                        <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[#1a1a18] px-2 py-1 text-[10px] text-gold/90 opacity-0 group-hover/badge:opacity-100 transition-opacity duration-200 shadow-lg border border-gold/10 z-20">
                          {badgeNameMap[badgeId] || badgeId.replace(/^ven_/, '').replace(/_/g, ' ')}
                        </span>
                      </span>
                    ))}
                    {venue.badgeList.length > 5 && (
                      <span className="text-[10px] text-gold/60 ml-0.5">+{venue.badgeList.length - 5}</span>
                    )}
                  </div>
                )}
              </Link>
              </FadeUpItem>
              );
            })}
          </div>
      </div>
    </div>
  );
}
