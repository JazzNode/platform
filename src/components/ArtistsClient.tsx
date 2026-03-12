'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';
import FollowButton from '@/components/FollowButton';
import { useFavorites } from '@/components/FollowsProvider';
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
  labels: {
    artists: string;
    allInstruments: string;
    allTypes: string;
    musicians: string;
    groups: string;
    bigBands: string;
    noArtists: string;
    cityFootprint: string;
    venueFootprint: string;
    artistFootprint: string;
    allCities: string;
    allVenues: string;
  };
}

export default function ArtistsClient({ artists, instruments, instrumentNames = {}, cityOptions, venueOptions, locale, labels }: Props) {
  const { isFavorite } = useFavorites();
  const instLabel = (key: string) => { const k = normalizeInstrumentKey(key); return instrumentNames[k] || k; };
  const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedCities, setSelectedCities] = useState<Set<string>>(new Set());
  const [selectedVenue, setSelectedVenue] = useState<string | null>(null);
  const [venueDropdownOpen, setVenueDropdownOpen] = useState(false);
  const venueDropdownRef = useRef<HTMLDivElement>(null);

  const toggleInstrument = useCallback((inst: string) => {
    setSelectedInstruments((prev) => {
      const next = new Set(prev);
      if (next.has(inst)) next.delete(inst);
      else next.add(inst);
      return next;
    });
  }, []);

  const toggleCity = useCallback((id: string) => {
    setSelectedCities((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Mutual exclusion: selecting a city clears venue
    setSelectedVenue(null);
  }, []);

  // Venue/City filters are independent — no linked filtering
  const activeVenue = selectedVenue;

  // Whether each filter group is "disabled" by the other being active
  const venueDisabled = selectedCities.size > 0;
  const cityDisabled = !!activeVenue;

  // Close venue dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (venueDropdownRef.current && !venueDropdownRef.current.contains(e.target as Node)) {
        setVenueDropdownOpen(false);
      }
    }
    if (venueDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [venueDropdownOpen]);

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
      // City filter — AND logic (intersection): artist must have ALL selected cities
      if (selectedCities.size > 0) {
        const hasAll = [...selectedCities].every((c) => a.cityList.includes(c));
        if (!hasAll) return false;
      }
      // Venue filter — single select
      if (activeVenue) {
        if (!a.venueList.includes(activeVenue)) return false;
      }
      return true;
    });
  }, [artists, selectedType, selectedInstruments, selectedCities, activeVenue]);

  /* Shared pill style helpers */
  const pillActive = 'bg-gold/10 border-gold/60 text-gold';
  const pillInactive = 'bg-transparent border-[var(--border)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]';

  const selectedVenueObj = activeVenue ? venueOptions.find((v) => v.recordId === activeVenue) : null;
  const selectedVenueLabel = selectedVenueObj
    ? (selectedVenueObj.cityLabel ? `${selectedVenueObj.cityLabel} · ${selectedVenueObj.label}` : selectedVenueObj.label)
    : labels.allVenues;

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
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
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
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
              selectedInstruments.size === 0 ? pillActive : pillInactive
            }`}
          >
            {labels.allInstruments}
          </button>
          {instruments.map((inst) => (
            <button
              key={inst}
              onClick={() => toggleInstrument(inst)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
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
        {cityOptions.length > 0 && (
        <FadeUpItem delay={340}>
          <div className="border-t border-[var(--border)] my-1" />
        </FadeUpItem>
        )}

        {/* ── Footprint row: label | venue dropdown | city chips ── */}
        {cityOptions.length > 0 && (
        <FadeUpItem delay={380}>
        <div className="relative z-20 flex flex-wrap items-center gap-2">
          {/* Section label */}
          <span className="text-[10px] uppercase tracking-[0.15em] text-[#8A8578] font-medium mr-1 shrink-0">
            {labels.artistFootprint}
          </span>

          {/* Venue dropdown — fades out when city filter is active */}
          <div
            className="relative shrink-0"
            ref={venueDropdownRef}
            style={{
              opacity: venueDisabled ? 0.25 : 1,
              pointerEvents: venueDisabled ? 'none' : 'auto',
              transition: 'opacity 0.3s ease',
            }}
          >
            <button
              onClick={() => setVenueDropdownOpen((prev) => !prev)}
              className={`px-3 py-1.5 rounded-full text-xs tracking-widest transition-all duration-200 border inline-flex items-center gap-1.5 ${
                activeVenue ? pillActive : pillInactive
              }`}
            >
              {selectedVenueLabel}
              <svg className="w-3 h-3 opacity-50 shrink-0" viewBox="0 0 12 12" fill="none">
                <path d="M3 5L6 8L9 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {venueDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 w-72 max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-xl py-1">
                {/* All venues option */}
                <button
                  onClick={() => { setSelectedVenue(null); setVenueDropdownOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-xs tracking-widest transition-colors ${
                    !activeVenue ? 'text-gold bg-gold/10' : 'text-[#8A8578] hover:bg-[rgba(240,237,230,0.06)]'
                  }`}
                >
                  {labels.allVenues}
                </button>
                {venueOptions.map((venue) => (
                  <button
                    key={venue.recordId}
                    onClick={() => { setSelectedVenue(venue.recordId); setSelectedCities(new Set()); setVenueDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-xs tracking-widest transition-colors ${
                      activeVenue === venue.recordId ? 'text-gold bg-gold/10' : 'text-[#8A8578] hover:bg-[rgba(240,237,230,0.06)]'
                    }`}
                  >
                    {venue.cityLabel && (
                      <span className="opacity-40 mr-1">{venue.cityLabel}</span>
                    )}
                    {venue.label}
                    <span className="ml-1.5 opacity-40 text-[10px]">{venue.artistCount}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Divider dot */}
          <span className="text-[#8A8578] opacity-30 mx-0.5">·</span>

          {/* City chips — fade out when venue filter is active */}
          <div
            className="flex flex-wrap gap-2"
            style={{
              opacity: cityDisabled ? 0.25 : 1,
              pointerEvents: cityDisabled ? 'none' : 'auto',
              transition: 'opacity 0.3s ease',
            }}
          >
            {cityOptions.map((city) => (
              <button
                key={city.recordId}
                onClick={() => toggleCity(city.recordId)}
                className={`px-3 py-1.5 rounded-full text-xs tracking-widest transition-all duration-200 border ${
                  selectedCities.has(city.recordId) ? pillActive : pillInactive
                }`}
              >
                {city.label}
              </button>
            ))}
          </div>
        </div>
        </FadeUpItem>
        )}
      </div>

      {filteredArtists.length === 0 && (
        <p className="text-[#8A8578]">{labels.noArtists}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArtists.map((artist, i) => {
            const followed = isFavorite('artist', artist.id);
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
                    <Image src={artist.photoUrl} alt="" fill className="object-cover" sizes="56px" />
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
