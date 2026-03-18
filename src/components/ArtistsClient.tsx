'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import FollowButton from '@/components/FollowButton';
import { useFollows } from '@/components/FollowsProvider';
import { useRegion } from '@/components/RegionProvider';
import { normalizeInstrumentKey } from '@/lib/helpers';

interface SerializedArtist {
  id: string;
  displayName: string;
  type: string | null;         // 'person' | 'group' | 'big band' | null
  primaryInstrument: string | null;
  instrumentList: string[];
  countryCode: string | null;
  eventCount: number;
  bio: string | null;
  photoUrl: string | null;
  cityList: string[];          // Airtable record IDs
  venueList: string[];         // Airtable record IDs
}

interface CityOption {
  recordId: string;
  label: string;
  artistCount: number;
  countryCode: string;
}

interface VenueOption {
  recordId: string;
  label: string;
  artistCount: number;
  cityRecordIds: string[];
  cityLabel: string;
}

interface Props {
  artists: SerializedArtist[];
  instruments: string[];       // sorted unique instrument list
  instrumentNames?: Record<string, string>; // i18n translated instrument names
  cityOptions: CityOption[];
  venueOptions: VenueOption[];
  locale: string;
  regionLabels: Record<string, string>;  // e.g. { TW: '台灣', JP: '日本' }
  worldMapLabel: string;                  // e.g. '世界版圖'
  labels: {
    artists: string;
    allInstruments: string;
    allTypes: string;
    musicians: string;
    groups: string;
    bigBands: string;
    noArtists: string;
    artistFootprint: string;
    allVenues: string;
  };
}

// Shared pill base: invisible ::after extends touch target to 44px minimum
const pillHitArea = 'relative after:absolute after:inset-x-0 after:inset-y-[-6px] after:content-[\'\'] after:min-h-[44px] after:top-1/2 after:-translate-y-1/2';

export default function ArtistsClient({ artists, instruments, instrumentNames = {}, cityOptions, venueOptions, locale, regionLabels, worldMapLabel, labels }: Props) {
  const { isFollowing } = useFollows();
  const { region: globalRegion } = useRegion();
  const hasInteracted = useRef(false);
  const instLabel = (key: string) => { const k = normalizeInstrumentKey(key); return instrumentNames[k] || k; };
  const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<string>('all');

  // ── Region hierarchy state (matching EventsClient) ──
  const [activeRegion, setActiveRegion] = useState<string | null>(null);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [selectedVenues, setSelectedVenues] = useState<Set<string>>(new Set());

  // Group cities by country code
  const regionGroups = useMemo(() => {
    const map: Record<string, CityOption[]> = {};
    for (const c of cityOptions) {
      const code = c.countryCode;
      if (!code || code === 'ZZ') continue;
      if (!map[code]) map[code] = [];
      map[code].push(c);
    }
    return map;
  }, [cityOptions]);

  // Sync with global region when it changes (only if user hasn't interacted)
  // Fall back to null if globalRegion has no content on this page
  useEffect(() => {
    if (!hasInteracted.current) {
      setActiveRegion(globalRegion && regionGroups[globalRegion] ? globalRegion : null);
    }
  }, [globalRegion, regionGroups]);

  const regionOrder = useMemo(() => Object.keys(regionGroups).sort(), [regionGroups]);

  // Derive effective city set for filtering
  const effectiveCities = useMemo(() => {
    if (selectedCity) return new Set([selectedCity]);
    if (activeRegion && regionGroups[activeRegion]) {
      return new Set(regionGroups[activeRegion].map((c) => c.recordId));
    }
    return new Set<string>();
  }, [selectedCity, activeRegion, regionGroups]);

  const handleRegionClick = useCallback((code: string) => {
    hasInteracted.current = true;
    if (activeRegion === code) {
      setActiveRegion(null);
      setSelectedCity(null);
      setSelectedVenues(new Set());
      return;
    }
    setActiveRegion(code);
    setSelectedCity(null);
    setSelectedVenues(new Set());
  }, [activeRegion]);

  const handleCityClick = useCallback((recordId: string) => {
    setSelectedCity((prev) => prev === recordId ? null : recordId);
    setSelectedVenues(new Set());
  }, []);

  const handleWorldMapClick = useCallback(() => {
    hasInteracted.current = true;
    setActiveRegion(null);
    setSelectedCity(null);
    setSelectedVenues(new Set());
  }, []);

  const toggleVenue = useCallback((recordId: string) => {
    setSelectedVenues((prev) => {
      const next = new Set(prev);
      if (next.has(recordId)) next.delete(recordId);
      else next.add(recordId);
      return next;
    });
    // Reverse sync: selecting a venue syncs region + city
    const venue = venueOptions.find((v) => v.recordId === recordId);
    if (venue?.cityRecordIds?.[0]) {
      const city = cityOptions.find((c) => c.recordId === venue.cityRecordIds[0]);
      if (city) {
        setActiveRegion(city.countryCode || null);
        setSelectedCity(city.recordId);
      }
    }
  }, [venueOptions, cityOptions]);

  // Filter venues by selected cities
  const visibleVenues = useMemo(() => {
    if (effectiveCities.size === 0) return venueOptions;
    return venueOptions.filter((v) => v.cityRecordIds.some((cid) => effectiveCities.has(cid)));
  }, [venueOptions, effectiveCities]);

  const toggleInstrument = useCallback((inst: string) => {
    setSelectedInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(inst)) next.delete(inst);
      else next.add(inst);
      return next;
    });
  }, []);

  const filteredArtists = useMemo(() => {
    return artists.filter((a) => {
      // Type filter
      if (selectedType === 'musicians') {
        if (a.type && a.type !== 'person') return false;
      } else if (selectedType === 'groups') {
        if (!a.type || a.type === 'person' || a.type === 'big band') return false;
      } else if (selectedType === 'bigBands') {
        if (a.type !== 'big band') return false;
      }
      // Instrument filter
      if (selectedInstruments.size > 0) {
        const hasMatch = a.instrumentList.some((i) => selectedInstruments.has(i));
        if (!hasMatch) return false;
      }
      // Venue filter
      if (selectedVenues.size > 0) {
        if (!a.venueList.some((v) => selectedVenues.has(v))) return false;
      } else if (effectiveCities.size > 0) {
        // City/region filter — artist must have at least one matching city
        if (!a.cityList.some((c) => effectiveCities.has(c))) return false;
      }
      return true;
    });
  }, [artists, selectedType, selectedInstruments, selectedVenues, effectiveCities]);

  /* Shared pill style helpers */
  const pillActive = 'bg-gold/10 border-gold/60 text-gold';
  const pillInactive = 'bg-transparent border-[var(--border)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]';

  return (
    <div className="space-y-12">
      <FadeUp>
        <div>
          <h1 className="font-serif text-4xl sm:text-5xl font-bold">{labels.artists}</h1>
          <p className="text-[#8A8578] mt-2 text-sm uppercase tracking-widest">
            {filteredArtists.length} artists
          </p>
        </div>
      </FadeUp>

      {/* Filter Bar */}
      <div className="relative z-30 space-y-3">
        {/* Type pills */}
        <FadeUpItem delay={100}>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: labels.allTypes },
            { key: 'musicians', label: labels.musicians },
            { key: 'groups', label: labels.groups },
            { key: 'bigBands', label: labels.bigBands },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setSelectedType(key); if (key !== 'musicians' && key !== 'all') setSelectedInstruments(new Set()); }}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border font-serif font-light ${
                selectedType === key
                  ? 'bg-gold/20 border-gold text-gold'
                  : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        </FadeUpItem>

        {/* Instrument pills — hidden when filtering groups */}
        <div
          className="overflow-hidden"
          style={{
            maxHeight: (selectedType === 'groups' || selectedType === 'bigBands') ? 0 : 200,
            opacity: (selectedType === 'groups' || selectedType === 'bigBands') ? 0 : 1,
            transition: 'max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
          }}
        >
        <FadeUpItem delay={220}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedInstruments(new Set())}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border font-serif font-light ${
              selectedInstruments.size === 0 ? pillActive : pillInactive
            }`}
          >
            {labels.allInstruments}
          </button>
          {instruments.map((inst) => (
            <button
              key={inst}
              onClick={() => toggleInstrument(inst)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border font-serif font-light ${
                selectedInstruments.has(inst) ? pillActive : pillInactive
              }`}
            >
              {instLabel(inst)}
            </button>
          ))}
        </div>
        </FadeUpItem>
        </div>

        {/* ── Divider ── */}
        {regionOrder.length > 0 && (
        <FadeUpItem delay={340}>
          <div className="border-t border-[var(--border)] my-1" />
        </FadeUpItem>
        )}

        {/* ── Footprint: World Map │ Region › City hierarchy ── */}
        {regionOrder.length > 0 && (
        <FadeUpItem delay={380}>
        <div className="flex flex-wrap items-center gap-x-2 gap-y-3">
          {/* Section label */}
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#8A8578] font-medium mr-1 shrink-0">
            {labels.artistFootprint}
          </span>

          {/* World Map pill */}
          <button
            onClick={handleWorldMapClick}
            className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light ${
              !activeRegion
                ? 'bg-gold/20 border-gold text-gold'
                : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
            }`}
          >
            {worldMapLabel}
          </button>

          {/* Region pills with drill-down */}
          {regionOrder.map((code, regionIdx) => {
            const isActive = activeRegion === code;
            const citiesInRegion = regionGroups[code] || [];

            // Hide non-active regions when drilled into
            if (activeRegion && !isActive) return null;

            return (
              <span key={`${code}-${activeRegion || 'w'}`} className="contents">
                {isActive && (
                  <span
                    className="text-gold/40 text-xs select-none mx-0.5"
                    style={{ animation: 'geo-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) both' }}
                  >│</span>
                )}

                <button
                  onClick={() => handleRegionClick(code)}
                  style={{ animation: `geo-fade-in 0.4s cubic-bezier(0.16, 1, 0.3, 1) ${regionIdx * 0.04}s both` }}
                  className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-300 border font-serif font-light ${
                    isActive
                      ? 'bg-gold/20 border-gold text-gold'
                      : 'bg-transparent border-[rgba(240,237,230,0.12)] text-[#8A8578] hover:border-[rgba(240,237,230,0.3)]'
                  }`}
                >
                  {regionLabels[code] || code}
                </button>

                {/* City sub-pills */}
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
                            : 'bg-transparent border-[rgba(240,237,230,0.08)] text-[#8A8578]/80 hover:border-[rgba(240,237,230,0.25)] hover:text-[#8A8578]'
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
        )}

        {/* Venue pills — show when region/city selected and venues exist */}
        {visibleVenues.length > 0 && activeRegion && (
          <FadeUpItem delay={440}>
          <div className="flex flex-wrap gap-x-2 gap-y-3">
            <button
              onClick={() => setSelectedVenues(new Set())}
              className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border font-serif font-light ${
                selectedVenues.size === 0 ? pillActive : pillInactive
              }`}
            >
              {labels.allVenues}
            </button>
            {visibleVenues.map((venue) => (
              <button
                key={venue.recordId}
                onClick={() => toggleVenue(venue.recordId)}
                className={`${pillHitArea} px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border font-serif font-light ${
                  selectedVenues.has(venue.recordId) ? pillActive : pillInactive
                }`}
              >
                {venue.label}
              </button>
            ))}
          </div>
          </FadeUpItem>
        )}
      </div>

      {filteredArtists.length === 0 && (
        <p className="text-[#8A8578]">{labels.noArtists}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArtists.map((artist, i) => {
            const followed = isFollowing('artist', artist.id);
            return (
            <FadeUpItem key={artist.id} delay={(i % 4) * 60}>
            <Link
              href={`/${locale}/artists/${artist.id}`}
              className="block p-5 rounded-2xl border card-hover group h-full relative"
              style={{
                backgroundColor: followed ? 'rgba(var(--theme-glow-rgb), 0.14)' : 'var(--card)',
                borderColor: followed ? 'rgba(var(--theme-glow-rgb), 0.22)' : 'var(--border)',
                transition: 'background-color 0.6s ease, border-color 0.6s ease, box-shadow 0.4s cubic-bezier(0.25,0.46,0.45,0.94), transform 0.4s cubic-bezier(0.25,0.46,0.45,0.94)',
              }}
            >
              <div className="absolute top-3 right-3 z-10">
                <FollowButton itemType="artist" itemId={artist.id} />
              </div>
              <div className="flex items-center gap-4 mb-3">
                {artist.photoUrl ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[var(--border)] relative">
                    <Image src={artist.photoUrl} alt={artist.displayName} fill className="object-cover" sizes="56px" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-xl shrink-0 border border-[var(--border)]">♪</div>
                )}
                <div>
                  <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                    {artist.displayName}
                  </h3>
                  {artist.type && artist.type !== 'person' ? (
                    <p className="text-xs uppercase tracking-widest text-gold capitalize">{artist.type}</p>
                  ) : artist.primaryInstrument ? (
                    <p className="text-xs uppercase tracking-widest text-gold capitalize">{instLabel(artist.primaryInstrument)}</p>
                  ) : null}
                </div>
              </div>
              {artist.bio && <p className="text-xs text-[#8A8578] line-clamp-2 leading-relaxed">{artist.bio}</p>}
              <div className="flex gap-2 mt-3 flex-wrap">
                {artist.countryCode && <span className="text-[10px] uppercase tracking-widest text-[#8A8578]">🌍 {artist.countryCode}</span>}
                {artist.eventCount > 0 && <span className="text-[10px] uppercase tracking-widest text-[#8A8578]">{artist.eventCount} events</span>}
              </div>
            </Link>
            </FadeUpItem>
            );
          })}
        </div>
    </div>
  );
}
