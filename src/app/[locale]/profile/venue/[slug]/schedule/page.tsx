'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

// ─── Types ───

interface LineupArtist {
  artist_id: string;
  display_name: string;
  name_local: string;
  name_en: string;
  photo_url: string;
  instrument_list: string[];
  role: string;
  sort_order: number;
}

interface VenueEvent {
  event_id: string;
  title_local: string | null;
  title_en: string | null;
  start_at: string | null;
  end_at: string | null;
  subtype: string | null;
  lifecycle_status: string | null;
  poster_url: string | null;
  price_info: string | null;
  data_source: string | null;
  description_raw: string | null;
  created_at: string | null;
  is_editable: boolean;
  lineup: LineupArtist[];
}

interface SearchArtist {
  artist_id: string;
  name_local: string | null;
  name_en: string | null;
  display_name: string | null;
  photo_url: string | null;
  primary_instrument: string | null;
  instrument_list: string[] | null;
  type: string | null;
  verification_status: string | null;
}

interface LineupEntry {
  artist_id: string | null;
  display_name: string;
  photo_url: string;
  instrument_list: string[];
  role: string;
  sort_order: number;
  is_new: boolean;
  new_artist?: {
    name_local: string;
    name_en?: string;
    primary_instrument?: string;
  };
}

// ─── Constants ───

const INSTRUMENTS = [
  'piano', 'drums', 'bass', 'double_bass', 'guitar', 'saxophone', 'trumpet',
  'trombone', 'vocals', 'flute', 'vibraphone', 'violin', 'cello', 'viola',
  'keys', 'keyboards', 'synthesizer', 'percussion', 'tuba', 'clarinet',
  'harmonica', 'accordion', 'organ', 'flugelhorn', 'marimba', 'others',
];

const ROLES = ['bandleader', 'sideman', 'featured_guest'];

const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors';
const labelClass = 'block text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2';
const cardClass = 'bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-6';
const sectionHeading = 'text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold';

// ─── Artist Search Combobox ───

function ArtistSearchCombobox({
  onSelect,
  t,
  tInst,
  token,
}: {
  onSelect: (artist: SearchArtist | { new_name: string }) => void;
  t: (key: string) => string;
  tInst: (key: string) => string;
  token: string | null;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newInstrument, setNewInstrument] = useState('');
  const ref = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setShowNewForm(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const search = useCallback((q: string) => {
    if (q.length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    fetch(`/api/venue/artists/search?q=${encodeURIComponent(q)}&limit=8`)
      .then((r) => r.json())
      .then((data) => {
        setResults(data.artists || []);
        setOpen(true);
        setLoading(false);
      })
      .catch(() => { setLoading(false); });
  }, []);

  const handleInput = (value: string) => {
    setQuery(value);
    setShowNewForm(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (artist: SearchArtist) => {
    onSelect(artist);
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  const handleCreateNew = () => {
    if (!query.trim()) return;
    if (newInstrument) {
      onSelect({ new_name: query.trim() });
      setQuery('');
      setOpen(false);
      setShowNewForm(false);
      setNewInstrument('');
    } else {
      setShowNewForm(true);
    }
  };

  const handleConfirmNew = () => {
    onSelect({ new_name: query.trim() });
    setQuery('');
    setOpen(false);
    setShowNewForm(false);
    setNewInstrument('');
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => handleInput(e.target.value)}
          onFocus={() => { if (results.length > 0) setOpen(true); }}
          placeholder={t('searchArtist')}
          className={`${inputClass} pl-10`}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
        )}
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl max-h-80 overflow-y-auto">
          {results.map((artist) => (
            <button
              key={artist.artist_id}
              onClick={() => handleSelect(artist)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--muted)] transition-colors text-left"
            >
              {artist.photo_url ? (
                <img src={artist.photo_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm text-[var(--muted-foreground)] shrink-0">
                  {(artist.display_name || artist.name_local || '?').charAt(0)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{artist.display_name || artist.name_local || artist.name_en}</p>
                {artist.name_en && artist.name_local && artist.name_en !== artist.name_local && (
                  <p className="text-xs text-[var(--muted-foreground)] truncate">{artist.name_en}</p>
                )}
              </div>
              {artist.primary_instrument && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] shrink-0">
                  {tInst(artist.primary_instrument) || artist.primary_instrument}
                </span>
              )}
              {artist.verification_status === 'verified' && (
                <svg className="w-4 h-4 text-[var(--color-gold)] shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </button>
          ))}

          {/* Create new artist option */}
          {query.trim().length >= 2 && (
            <div className="border-t border-[var(--border)]">
              {!showNewForm ? (
                <button
                  onClick={handleCreateNew}
                  className="w-full flex items-center gap-2 px-4 py-3 text-[var(--color-gold)] hover:bg-[var(--color-gold)]/5 transition-colors text-left"
                >
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                  <span className="text-sm font-medium">{t('createNewArtist')}: &ldquo;{query.trim()}&rdquo;</span>
                </button>
              ) : (
                <div className="p-4 space-y-3">
                  <p className="text-xs text-[var(--muted-foreground)]">{t('newArtistInstrument')}</p>
                  <select
                    value={newInstrument}
                    onChange={(e) => setNewInstrument(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">{t('selectInstrument')}</option>
                    {INSTRUMENTS.map((inst) => (
                      <option key={inst} value={inst}>{tInst(inst) || inst}</option>
                    ))}
                  </select>
                  <button
                    onClick={handleConfirmNew}
                    className="w-full py-2 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest"
                  >
                    {t('addToLineup')}
                  </button>
                </div>
              )}
            </div>
          )}

          {results.length === 0 && query.length >= 2 && !loading && (
            <p className="px-4 py-3 text-sm text-[var(--muted-foreground)]">{t('noArtistsFound')}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Lineup List with Drag-to-Reorder ───

function LineupList({
  lineup,
  setLineup,
  t,
  tInst,
}: {
  lineup: LineupEntry[];
  setLineup: (lineup: LineupEntry[]) => void;
  t: (key: string) => string;
  tInst: (key: string) => string;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };
  const handleDrop = (index: number) => {
    if (dragIndex === null || dragIndex === index) return;
    const items = [...lineup];
    const [moved] = items.splice(dragIndex, 1);
    items.splice(index, 0, moved);
    setLineup(items.map((item, i) => ({ ...item, sort_order: i })));
    setDragIndex(null);
    setDragOverIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDragOverIndex(null);
  };

  const updateMember = (index: number, updates: Partial<LineupEntry>) => {
    const items = [...lineup];
    items[index] = { ...items[index], ...updates };
    setLineup(items);
  };

  const removeMember = (index: number) => {
    setLineup(lineup.filter((_, i) => i !== index).map((item, i) => ({ ...item, sort_order: i })));
  };

  if (lineup.length === 0) return null;

  return (
    <div className="space-y-2">
      {lineup.map((member, index) => (
        <div
          key={`${member.artist_id || member.display_name}-${index}`}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDrop={() => handleDrop(index)}
          onDragEnd={handleDragEnd}
          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing ${
            dragOverIndex === index
              ? 'border-[var(--color-gold)]/50 bg-[var(--color-gold)]/5'
              : 'border-[var(--border)] bg-[var(--background)]'
          } ${dragIndex === index ? 'opacity-50' : ''}`}
        >
          {/* Drag handle */}
          <div className="shrink-0 text-[var(--muted-foreground)]/40">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
              <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
              <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
            </svg>
          </div>

          {/* Artist photo */}
          {member.photo_url ? (
            <img src={member.photo_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-9 h-9 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs text-[var(--muted-foreground)] shrink-0">
              {member.display_name.charAt(0)}
            </div>
          )}

          {/* Name + order badge */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate">{member.display_name}</p>
              {index === 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-bold uppercase">
                  {t('primary')}
                </span>
              )}
              {member.is_new && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 font-bold uppercase">
                  {t('new')}
                </span>
              )}
            </div>
          </div>

          {/* Instrument */}
          <select
            value={member.instrument_list[0] || ''}
            onChange={(e) => updateMember(index, { instrument_list: e.target.value ? [e.target.value] : [] })}
            className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 max-w-[120px]"
          >
            <option value="">{t('instrument')}</option>
            {INSTRUMENTS.map((inst) => (
              <option key={inst} value={inst}>{tInst(inst) || inst}</option>
            ))}
          </select>

          {/* Role */}
          <select
            value={member.role}
            onChange={(e) => updateMember(index, { role: e.target.value })}
            className="text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 max-w-[120px]"
          >
            {ROLES.map((role) => (
              <option key={role} value={role}>{t(role)}</option>
            ))}
          </select>

          {/* Remove */}
          <button
            onClick={() => removeMember(index)}
            className="shrink-0 p-1 text-[var(--muted-foreground)]/40 hover:text-red-400 transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Event Form ───

function EventForm({
  mode,
  initialData,
  initialLineup,
  venueId,
  token,
  t,
  tInst,
  onSaved,
  onCancel,
}: {
  mode: 'create' | 'edit';
  initialData?: VenueEvent | null;
  initialLineup?: Array<Record<string, unknown>>;
  venueId: string;
  token: string | null;
  t: (key: string) => string;
  tInst: (key: string) => string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [titleLocal, setTitleLocal] = useState(initialData?.title_local || '');
  const [date, setDate] = useState(initialData?.start_at ? initialData.start_at.slice(0, 10) : '');
  const [startTime, setStartTime] = useState(initialData?.start_at ? initialData.start_at.slice(11, 16) : '');
  const [endTime, setEndTime] = useState(initialData?.end_at ? initialData.end_at.slice(11, 16) : '');
  const [subtype, setSubtype] = useState(initialData?.subtype || 'standard_show');
  const [priceInfo, setPriceInfo] = useState(initialData?.price_info || '');
  const [descriptionRaw, setDescriptionRaw] = useState(initialData?.description_raw || '');
  const [posterUrl, setPosterUrl] = useState(initialData?.poster_url || '');
  const [posterFile, setPosterFile] = useState<File | null>(null);

  const [lineup, setLineup] = useState<LineupEntry[]>(() => {
    if (initialLineup && initialLineup.length > 0) {
      return initialLineup.map((l: Record<string, unknown>, i: number) => {
        const artist = l.artist as Record<string, string> | null;
        return {
          artist_id: l.artist_id as string,
          display_name: artist?.display_name || artist?.name_local || artist?.name_en || '',
          photo_url: artist?.photo_url || '',
          instrument_list: (l.instrument_list as string[]) || [],
          role: (l.role as string) || 'sideman',
          sort_order: i,
          is_new: false,
        };
      });
    }
    return [];
  });

  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleArtistSelect = (result: SearchArtist | { new_name: string }) => {
    if ('new_name' in result) {
      setLineup([...lineup, {
        artist_id: null,
        display_name: result.new_name,
        photo_url: '',
        instrument_list: [],
        role: 'sideman',
        sort_order: lineup.length,
        is_new: true,
        new_artist: { name_local: result.new_name },
      }]);
    } else {
      // Check for duplicates
      if (lineup.some((l) => l.artist_id === result.artist_id)) return;
      setLineup([...lineup, {
        artist_id: result.artist_id,
        display_name: result.display_name || result.name_local || result.name_en || '',
        photo_url: result.photo_url || '',
        instrument_list: result.primary_instrument ? [result.primary_instrument] : [],
        role: 'sideman',
        sort_order: lineup.length,
        is_new: false,
      }]);
    }
  };

  const handlePosterDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      setPosterFile(file);
      setPosterUrl(URL.createObjectURL(file));
    }
  }, []);

  const handlePosterSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPosterFile(file);
      setPosterUrl(URL.createObjectURL(file));
    }
  };

  const handleSave = async (publish: boolean) => {
    if (!titleLocal.trim() || !date || !startTime) {
      setError(t('requiredFieldsMissing'));
      return;
    }

    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      const startAt = `${date}T${startTime}:00`;
      const endAt = endTime ? `${date}T${endTime}:00` : undefined;

      // Upload poster if new file selected
      let finalPosterUrl = posterUrl;
      if (posterFile && mode === 'edit' && initialData?.event_id) {
        const formData = new FormData();
        formData.append('file', posterFile);
        formData.append('eventId', initialData.event_id);
        formData.append('venueId', venueId);
        const posterRes = await fetch('/api/venue/events/upload-poster', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });
        if (posterRes.ok) {
          const posterData = await posterRes.json();
          finalPosterUrl = posterData.posterUrl;
        }
      }

      const lineupPayload = lineup.map((l) => ({
        artist_id: l.artist_id,
        new_artist: l.is_new ? l.new_artist : undefined,
        instrument_list: l.instrument_list,
        role: l.role,
        sort_order: l.sort_order,
      }));

      if (mode === 'create') {
        const res = await fetch('/api/venue/events', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            venueId,
            title_local: titleLocal.trim(),
            start_at: startAt,
            end_at: endAt,
            subtype: subtype || null,
            price_info: priceInfo.trim() || null,
            description_raw: descriptionRaw.trim() || null,
            lifecycle_status: publish ? 'confirmed' : 'draft',
            lineup: lineupPayload,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Create failed');
        }

        const data = await res.json();

        // Upload poster for new event
        if (posterFile && data.event_id) {
          const formData = new FormData();
          formData.append('file', posterFile);
          formData.append('eventId', data.event_id);
          formData.append('venueId', venueId);
          fetch('/api/venue/events/upload-poster', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` },
            body: formData,
          }).catch(() => {}); // Fire-and-forget
        }
      } else if (initialData?.event_id) {
        const res = await fetch(`/api/venue/events/${initialData.event_id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title_local: titleLocal.trim(),
            start_at: startAt,
            end_at: endAt,
            subtype: subtype || null,
            price_info: priceInfo.trim() || null,
            description_raw: descriptionRaw.trim() || null,
            lifecycle_status: publish ? 'confirmed' : initialData.lifecycle_status,
            poster_url: finalPosterUrl || null,
            lineup: lineupPayload,
          }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || 'Update failed');
        }
      }

      setSaved(true);
      setTimeout(() => onSaved(), 500);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">
            {mode === 'create' ? t('newEvent') : t('editEvent')}
          </h1>
          <button
            onClick={onCancel}
            className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </FadeUp>

      {/* Basic Info */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionHeading}>{t('basicInfo')}</h2>

          <div>
            <label className={labelClass}>{t('eventTitle')} *</label>
            <input
              type="text"
              value={titleLocal}
              onChange={(e) => setTitleLocal(e.target.value)}
              placeholder={t('eventTitlePlaceholder')}
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>{t('eventDate')} *</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('startTime')} *</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>{t('endTime')}</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass} />
            </div>
          </div>

          <div>
            <label className={labelClass}>{t('eventType')}</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { value: 'standard_show', label: t('standardShow'), desc: t('standardShowDesc') },
                { value: 'jam_session', label: t('jamSession'), desc: t('jamSessionDesc') },
                { value: 'showcase', label: t('showcase'), desc: t('showcaseDesc') },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSubtype(opt.value)}
                  className={`text-left p-3 rounded-xl border transition-all ${
                    subtype === opt.value
                      ? 'border-[var(--color-gold)]/50 bg-[var(--color-gold)]/5'
                      : 'border-[var(--border)] hover:border-[var(--muted-foreground)]/30'
                  }`}
                >
                  <p className={`text-sm font-medium ${subtype === opt.value ? 'text-[var(--color-gold)]' : ''}`}>
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-[var(--muted-foreground)] mt-0.5 leading-relaxed">{opt.desc}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </FadeUp>

      {/* Lineup */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionHeading}>{t('lineup')}</h2>
          <p className="text-xs text-[var(--muted-foreground)]">{t('lineupHint')}</p>

          <ArtistSearchCombobox
            onSelect={handleArtistSelect}
            t={t}
            tInst={tInst}
            token={token}
          />

          <LineupList
            lineup={lineup}
            setLineup={setLineup}
            t={t}
            tInst={tInst}
          />
        </div>
      </FadeUp>

      {/* Details */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionHeading}>{t('details')}</h2>

          <div>
            <label className={labelClass}>{t('priceInfo')}</label>
            <input
              type="text"
              value={priceInfo}
              onChange={(e) => setPriceInfo(e.target.value)}
              placeholder={t('priceInfoPlaceholder')}
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>{t('description')}</label>
            <textarea
              value={descriptionRaw}
              onChange={(e) => setDescriptionRaw(e.target.value)}
              placeholder={t('descriptionPlaceholder')}
              rows={4}
              className={`${inputClass} resize-y min-h-[100px]`}
            />
            <p className="text-[11px] text-[var(--muted-foreground)]/60 mt-1">{t('autoGenerateHint')}</p>
          </div>
        </div>
      </FadeUp>

      {/* Poster */}
      <FadeUp>
        <div className={cardClass}>
          <h2 className={sectionHeading}>{t('poster')}</h2>

          {posterUrl ? (
            <div className="relative group">
              <img
                src={posterUrl}
                alt="Event poster"
                className="w-full max-w-xs rounded-xl border border-[var(--border)]"
              />
              <button
                onClick={() => { setPosterUrl(''); setPosterFile(null); }}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          ) : (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handlePosterDrop}
              className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-[var(--color-gold)]/30 transition-colors cursor-pointer"
              onClick={() => document.getElementById('poster-input')?.click()}
            >
              <svg className="w-10 h-10 text-[var(--muted-foreground)]/30 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <p className="text-sm text-[var(--muted-foreground)]">{t('dragOrClick')}</p>
              <p className="text-xs text-[var(--muted-foreground)]/50 mt-1">JPEG, PNG, WebP — max 10MB</p>
              <input id="poster-input" type="file" accept="image/*" onChange={handlePosterSelect} className="hidden" />
            </div>
          )}
        </div>
      </FadeUp>

      {/* Action bar */}
      <FadeUp>
        <div className="sticky bottom-0 bg-[var(--background)]/95 backdrop-blur-md border-t border-[var(--border)] -mx-4 px-4 py-4 sm:-mx-0 sm:px-0 sm:border-t-0 sm:bg-transparent sm:backdrop-blur-none flex items-center gap-3 justify-end">
          {error && <p className="text-sm text-red-400 mr-auto">{error}</p>}

          <button
            onClick={() => handleSave(false)}
            disabled={saving}
            className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/20 transition-all disabled:opacity-50"
          >
            {saving ? t('saving') : t('saveAsDraft')}
          </button>

          <button
            onClick={() => handleSave(true)}
            disabled={saving}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all disabled:opacity-50 ${
              saved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'
            }`}
          >
            {saving ? t('saving') : saved ? t('saved') : t('publish')}
          </button>
        </div>
      </FadeUp>
    </div>
  );
}

// ─── Event Card ───

function EventCard({
  event,
  onEdit,
  onDuplicate,
  onDelete,
  t,
  locale,
}: {
  event: VenueEvent;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  t: (key: string) => string;
  locale: string;
}) {
  const startDate = event.start_at ? new Date(event.start_at) : null;
  const dayNum = startDate ? startDate.getDate() : '--';
  const monthStr = startDate
    ? startDate.toLocaleDateString(locale, { month: 'short' })
    : '';
  const dayStr = startDate
    ? startDate.toLocaleDateString(locale, { weekday: 'short' })
    : '';
  const timeStr = startDate
    ? startDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';
  const endTimeStr = event.end_at
    ? new Date(event.end_at).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false })
    : '';

  const statusColor =
    event.lifecycle_status === 'draft' ? 'bg-zinc-500/15 text-zinc-400'
    : event.lifecycle_status === 'upcoming' ? 'bg-green-500/15 text-green-400'
    : event.lifecycle_status === 'cancelled' ? 'bg-red-500/15 text-red-400'
    : 'bg-zinc-500/15 text-zinc-400';

  const statusLabel =
    event.lifecycle_status === 'draft' ? t('draft')
    : event.lifecycle_status === 'upcoming' ? t('confirmed')
    : event.lifecycle_status === 'cancelled' ? t('cancelled')
    : event.lifecycle_status === 'past' ? t('past')
    : event.lifecycle_status || '';

  const isPast = startDate && startDate < new Date();

  return (
    <div className={`flex gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--muted-foreground)]/20 transition-colors ${isPast ? 'opacity-60' : ''}`}>
      {/* Date badge */}
      <div className="shrink-0 w-14 text-center">
        <p className="text-2xl font-bold leading-none">{dayNum}</p>
        <p className="text-[10px] uppercase text-[var(--muted-foreground)] mt-0.5">{monthStr}</p>
        <p className="text-[10px] text-[var(--muted-foreground)]">{dayStr}</p>
      </div>

      {/* Main content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <h3 className="text-sm font-semibold truncate flex-1">
            {event.title_local || event.title_en || t('untitled')}
          </h3>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold shrink-0 ${statusColor}`}>
            {statusLabel}
          </span>
        </div>

        <p className="text-xs text-[var(--muted-foreground)] mb-2">
          {timeStr}{endTimeStr ? ` – ${endTimeStr}` : ''}
          {event.subtype && (
            <span className="mx-1.5 opacity-40">·</span>
          )}
          {event.subtype && (
            <span>{t(event.subtype === 'standard_show' ? 'standardShow' : event.subtype === 'jam_session' ? 'jamSession' : 'showcase')}</span>
          )}
          {event.price_info && (
            <>
              <span className="mx-1.5 opacity-40">·</span>
              <span>{event.price_info}</span>
            </>
          )}
        </p>

        {/* Lineup chips */}
        {event.lineup.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {event.lineup.slice(0, 5).map((artist) => (
              <div key={artist.artist_id} className="flex items-center gap-1.5 text-xs bg-[var(--muted)] rounded-full pl-1 pr-2.5 py-0.5">
                {artist.photo_url ? (
                  <img src={artist.photo_url} alt="" className="w-4 h-4 rounded-full object-cover" />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-[var(--background)] flex items-center justify-center text-[8px] text-[var(--muted-foreground)]">
                    {artist.display_name.charAt(0)}
                  </div>
                )}
                <span className="truncate max-w-[100px]">{artist.display_name}</span>
              </div>
            ))}
            {event.lineup.length > 5 && (
              <span className="text-xs text-[var(--muted-foreground)] self-center">+{event.lineup.length - 5}</span>
            )}
          </div>
        )}

        {/* Quick actions */}
        {event.is_editable && (
          <div className="flex gap-2">
            <button onClick={onEdit} className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors">
              {t('edit')}
            </button>
            <span className="text-[var(--muted-foreground)]/30">·</span>
            <button onClick={onDuplicate} className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors">
              {t('duplicate')}
            </button>
            <span className="text-[var(--muted-foreground)]/30">·</span>
            <button onClick={onDelete} className="text-[11px] text-[var(--muted-foreground)] hover:text-red-400 transition-colors">
              {t('cancelEvent')}
            </button>
          </div>
        )}
        {!event.is_editable && (
          <p className="text-[11px] text-[var(--muted-foreground)]/50 italic">{t('scraperManaged')}</p>
        )}
      </div>

      {/* Poster thumbnail */}
      {event.poster_url && (
        <div className="shrink-0 hidden sm:block">
          <img
            src={event.poster_url}
            alt=""
            className="w-16 h-20 rounded-lg object-cover border border-[var(--border)]"
          />
        </div>
      )}
    </div>
  );
}

// ─── Main Page ───

export default function ScheduleManagerPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const tInst = useTranslations('instruments');
  const locale = useLocale();
  const { previewVenueTier, adminModeEnabled, token } = useAdmin();
  const { isUnlocked } = useTierConfig();
  const { user } = useAuth();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<VenueEvent[]>([]);
  const [tab, setTab] = useState<'upcoming' | 'draft' | 'past'>('upcoming');
  const [view, setView] = useState<'list' | 'form'>('list');
  const [editingEvent, setEditingEvent] = useState<VenueEvent | null>(null);
  const [editingLineup, setEditingLineup] = useState<Array<Record<string, unknown>> | null>(null);
  const [duplicateSource, setDuplicateSource] = useState<VenueEvent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  const fetchEvents = useCallback(async () => {
    if (!slug || !token) return;
    try {
      const res = await fetch(`/api/venue/events?venueId=${encodeURIComponent(slug)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEvents(data.events || []);
    } catch {
      console.error('Failed to fetch events');
    }
  }, [slug, token]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from('venues').select('tier').eq('venue_id', slug).single()
      .then(({ data }) => {
        if (data) setTier(data.tier);
        setLoading(false);
      });
  }, [slug]);

  useEffect(() => {
    if (!loading && slug && token) fetchEvents();
  }, [loading, slug, token, fetchEvents]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;

  // ── Locked state ──
  if (!isUnlocked('venue', 'schedule_manager', effectiveTier, adminModeEnabled)) {
    return (
      <div className="space-y-6">
        <FadeUp>
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('scheduleTitle')}</h1>
        </FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-[var(--color-gold)]/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('scheduleLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">{t('scheduleLockedDesc')}</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">{t('premiumLockedHint')}</p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradePremium')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  // ── Form view ──
  if (view === 'form') {
    const handleSaved = () => {
      setView('list');
      setEditingEvent(null);
      setEditingLineup(null);
      setDuplicateSource(null);
      fetchEvents();
    };

    // Duplicate: pre-fill with source data, date +7 days
    let initialData = editingEvent;
    let initialLineup = editingLineup;

    if (duplicateSource) {
      const sourceDate = duplicateSource.start_at ? new Date(duplicateSource.start_at) : new Date();
      sourceDate.setDate(sourceDate.getDate() + 7);
      const newStartAt = sourceDate.toISOString().slice(0, 19);
      const newEndAt = duplicateSource.end_at
        ? (() => { const d = new Date(duplicateSource.end_at); d.setDate(d.getDate() + 7); return d.toISOString().slice(0, 19); })()
        : null;

      initialData = {
        ...duplicateSource,
        event_id: '', // Will be generated on save
        start_at: newStartAt,
        end_at: newEndAt,
        lifecycle_status: 'draft',
      };
      initialLineup = duplicateSource.lineup.map((l) => ({
        artist_id: l.artist_id,
        instrument_list: l.instrument_list,
        role: l.role,
        sort_order: l.sort_order,
        artist: {
          display_name: l.display_name,
          name_local: l.name_local,
          name_en: l.name_en,
          photo_url: l.photo_url,
        },
      }));
    }

    return (
      <EventForm
        mode={editingEvent && !duplicateSource ? 'edit' : 'create'}
        initialData={initialData}
        initialLineup={initialLineup || undefined}
        venueId={slug}
        token={token}
        t={t}
        tInst={tInst}
        onSaved={handleSaved}
        onCancel={() => { setView('list'); setEditingEvent(null); setEditingLineup(null); setDuplicateSource(null); }}
      />
    );
  }

  // ── List view ──
  const now = new Date();
  const filteredEvents = events.filter((e) => {
    const start = e.start_at ? new Date(e.start_at) : null;
    if (tab === 'upcoming') return e.lifecycle_status === 'upcoming' && start && start >= now;
    if (tab === 'draft') return e.lifecycle_status === 'draft';
    if (tab === 'past') return e.lifecycle_status === 'past' || (e.lifecycle_status === 'upcoming' && start && start < now);
    return true;
  });

  const handleEdit = async (event: VenueEvent) => {
    // Fetch full event data with lineup
    try {
      const res = await fetch(`/api/venue/events/${event.event_id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setEditingEvent(data.event);
      setEditingLineup(data.lineup);
      setView('form');
    } catch {
      setEditingEvent(event);
      setView('form');
    }
  };

  const handleDuplicate = (event: VenueEvent) => {
    setDuplicateSource(event);
    setEditingEvent(null);
    setEditingLineup(null);
    setView('form');
  };

  const handleDelete = async (eventId: string) => {
    if (!token) return;
    try {
      await fetch(`/api/venue/events/${eventId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      setConfirmDelete(null);
      fetchEvents();
    } catch {
      console.error('Delete failed');
    }
  };

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('scheduleTitle')}</h1>
          <button
            onClick={() => { setEditingEvent(null); setEditingLineup(null); setDuplicateSource(null); setView('form'); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            {t('newEvent')}
          </button>
        </div>
      </FadeUp>

      {/* Tab filters */}
      <FadeUp>
        <div className="flex gap-2">
          {(['upcoming', 'draft', 'past'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                tab === key
                  ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {t(key === 'upcoming' ? 'upcoming' : key === 'draft' ? 'drafts' : 'pastEvents')}
              <span className="ml-1.5 text-[10px] opacity-60">
                {events.filter((e) => {
                  const s = e.start_at ? new Date(e.start_at) : null;
                  if (key === 'upcoming') return e.lifecycle_status === 'upcoming' && s && s >= now;
                  if (key === 'draft') return e.lifecycle_status === 'draft';
                  return e.lifecycle_status === 'past' || (e.lifecycle_status === 'upcoming' && s && s < now);
                }).length}
              </span>
            </button>
          ))}
        </div>
      </FadeUp>

      {/* Event list */}
      <FadeUp>
        {filteredEvents.length > 0 ? (
          <div className="space-y-3">
            {filteredEvents.map((event) => (
              <div key={event.event_id} className="relative">
                <EventCard
                  event={event}
                  onEdit={() => handleEdit(event)}
                  onDuplicate={() => handleDuplicate(event)}
                  onDelete={() => setConfirmDelete(event.event_id)}
                  t={t}
                  locale={locale}
                />

                {/* Delete confirmation overlay */}
                {confirmDelete === event.event_id && (
                  <div className="absolute inset-0 bg-[var(--card)]/95 backdrop-blur-sm rounded-xl flex items-center justify-center gap-3 z-10">
                    <p className="text-sm text-[var(--muted-foreground)]">{t('confirmCancel')}</p>
                    <button
                      onClick={() => handleDelete(event.event_id)}
                      className="px-4 py-1.5 rounded-lg bg-red-500/20 text-red-400 text-xs font-bold hover:bg-red-500/30 transition-colors"
                    >
                      {t('yes')}
                    </button>
                    <button
                      onClick={() => setConfirmDelete(null)}
                      className="px-4 py-1.5 rounded-lg bg-[var(--muted)] text-[var(--muted-foreground)] text-xs font-bold hover:bg-[var(--border)] transition-colors"
                    >
                      {t('no')}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <svg className="w-16 h-16 text-[var(--muted-foreground)]/20 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <p className="text-sm text-[var(--muted-foreground)]">
              {tab === 'draft' ? t('noDrafts') : tab === 'past' ? t('noPastEvents') : t('noUpcomingEvents')}
            </p>
            {tab === 'upcoming' && (
              <button
                onClick={() => setView('form')}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs font-bold uppercase tracking-widest hover:bg-[var(--color-gold)]/20 transition-colors"
              >
                {t('createFirstEvent')}
              </button>
            )}
          </div>
        )}
      </FadeUp>
    </div>
  );
}
