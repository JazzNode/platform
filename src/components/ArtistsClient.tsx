'use client';

import { useState, useMemo, useCallback } from 'react';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';
import FadeUpItem from '@/components/animations/FadeUpItem';

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
}

interface Props {
  artists: SerializedArtist[];
  instruments: string[];       // sorted unique instrument list
  locale: string;
  labels: {
    artists: string;
    allInstruments: string;
    allTypes: string;
    musicians: string;
    groups: string;
    noArtists: string;
  };
}

export default function ArtistsClient({ artists, instruments, locale, labels }: Props) {
  const [selectedInstruments, setSelectedInstruments] = useState<Set<string>>(new Set());
  const [selectedType, setSelectedType] = useState<string>('all');

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
        if (!a.type || a.type === 'person') return false;
      }
      // Instrument filter
      if (selectedInstruments.size > 0) {
        const hasMatch = a.instrumentList.some((i) => selectedInstruments.has(i));
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [artists, selectedType, selectedInstruments]);

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
      <div className="space-y-3">
        {/* Type pills */}
        <FadeUpItem delay={100}>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'all', label: labels.allTypes },
            { key: 'musicians', label: labels.musicians },
            { key: 'groups', label: labels.groups },
          ] as const).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => { setSelectedType(key); if (key === 'groups') setSelectedInstruments(new Set()); }}
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
            maxHeight: selectedType === 'groups' ? 0 : 200,
            opacity: selectedType === 'groups' ? 0 : 1,
            transition: 'max-height 0.4s cubic-bezier(0.16,1,0.3,1), opacity 0.3s ease',
          }}
        >
        <FadeUpItem delay={220}>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedInstruments(new Set())}
            className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
              selectedInstruments.size === 0
                ? 'bg-gold/10 border-gold/60 text-gold'
                : 'bg-transparent border-[rgba(240,237,230,0.08)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]'
            }`}
          >
            {labels.allInstruments}
          </button>
          {instruments.map((inst) => (
            <button
              key={inst}
              onClick={() => toggleInstrument(inst)}
              className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-widest transition-all duration-200 border ${
                selectedInstruments.has(inst)
                  ? 'bg-gold/10 border-gold/60 text-gold'
                  : 'bg-transparent border-[rgba(240,237,230,0.08)] text-[#6A6560] hover:border-[rgba(240,237,230,0.2)]'
              }`}
            >
              {inst}
            </button>
          ))}
        </div>
        </FadeUpItem>
        </div>
      </div>

      {filteredArtists.length === 0 && (
        <p className="text-[#8A8578]">{labels.noArtists}</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredArtists.map((artist, i) => (
            <FadeUpItem key={artist.id} delay={(i % 4) * 60}>
            <Link
              href={`/${locale}/artists/${artist.id}`}
              className="block bg-[#111111] p-5 rounded-2xl border border-[rgba(240,237,230,0.06)] card-hover group h-full"
            >
              <div className="flex items-center gap-4 mb-3">
                {artist.photoUrl ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 border border-[rgba(240,237,230,0.08)]">
                    <img src={artist.photoUrl} alt="" className="w-full h-full object-cover" loading="lazy" />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#1A1A1A] flex items-center justify-center text-xl shrink-0 border border-[rgba(240,237,230,0.08)]">♪</div>
                )}
                <div>
                  <h3 className="font-serif text-base font-bold group-hover:text-gold transition-colors duration-300">
                    {artist.displayName}
                  </h3>
                  {artist.type && artist.type !== 'person' ? (
                    <p className="text-xs uppercase tracking-widest text-gold capitalize">{artist.type}</p>
                  ) : artist.primaryInstrument ? (
                    <p className="text-xs uppercase tracking-widest text-gold capitalize">{artist.primaryInstrument}</p>
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
          ))}
        </div>
    </div>
  );
}
