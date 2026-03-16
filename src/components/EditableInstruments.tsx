'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAdmin } from './AdminProvider';
import { normalizeInstrumentKey } from '@/lib/helpers';

const INSTRUMENT_KEYS = [
  'piano', 'drums', 'bass', 'double_bass', 'guitar', 'saxophone', 'trumpet',
  'trombone', 'vocals', 'flute', 'vibraphone', 'violin', 'cello', 'viola',
  'keys', 'keyboards', 'synthesizer', 'percussion', 'tuba', 'clarinet',
  'harmonica', 'accordion', 'sheng', 'erhu', 'organ', 'dj', 'tap dance',
  'flugelhorn', 'marimba', 'tabla', 'shakuhachi', 'kora', 'shamisen', 'others',
] as const;

interface EditableInstrumentsProps {
  entityId: string;
  primaryInstrument?: string;
  instrumentList?: string[];
  /** Pre-rendered label for the primary instrument (from server) */
  primaryInstrumentLabel?: string;
}

export default function EditableInstruments({
  entityId,
  primaryInstrument,
  instrumentList,
  primaryInstrumentLabel,
}: EditableInstrumentsProps) {
  const { isAdmin, getFreshToken, handleUnauthorized } = useAdmin();
  const router = useRouter();
  const tInst = useTranslations('instruments');
  const instLabel = (key: string) => { const k = normalizeInstrumentKey(key); try { return tInst(k as never); } catch { return k; } };
  const [editing, setEditing] = useState(false);
  const [draftPrimary, setDraftPrimary] = useState(primaryInstrument || '');
  const [draftList, setDraftList] = useState<string[]>(instrumentList || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setEditing(false);
        setDraftPrimary(primaryInstrument || '');
        setDraftList(instrumentList || []);
        setError(null);
        setSearch('');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing, saving, primaryInstrument, instrumentList]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const freshToken = await getFreshToken();
      if (!freshToken) throw new Error('Token 已過期，請重新登入');

      const res = await fetch('/api/admin/update-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          entityType: 'artist',
          entityId,
          fields: {
            primary_instrument: draftPrimary || null,
            instrument_list: draftList.length > 0 ? draftList : null,
          },
        }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        throw new Error('Token 已過期，請重新登入');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setEditing(false);
      setSearch('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }, [draftPrimary, draftList, entityId, getFreshToken, handleUnauthorized, router]);

  const toggleInstrument = (key: string) => {
    setDraftList((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  if (!isAdmin) {
    if (!primaryInstrument) return null;
    return (
      <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-gold/30 text-gold capitalize">
        {primaryInstrumentLabel || instLabel(primaryInstrument)}
      </span>
    );
  }

  if (editing) {
    const filteredInstruments = INSTRUMENT_KEYS.filter((k) =>
      !search || instLabel(k).toLowerCase().includes(search.toLowerCase()) || k.includes(search.toLowerCase()),
    );

    return (
      <div ref={panelRef} className="space-y-3 p-4 rounded-xl border border-[var(--color-gold)]/30 bg-[#1A1A1A]">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-gold)]/70">樂器設定</p>

        {/* Primary instrument */}
        <div>
          <label className="text-xs text-[#8A8578] font-mono block mb-1">Primary Instrument</label>
          <select
            value={draftPrimary}
            onChange={(e) => {
              setDraftPrimary(e.target.value);
              // Auto-add to list if not already there
              if (e.target.value && !draftList.includes(e.target.value)) {
                setDraftList((prev) => [e.target.value, ...prev]);
              }
            }}
            className="w-full bg-[#0A0A0A] text-sm text-[#F0EDE6] border border-[#8A8578]/30 focus:border-[var(--color-gold)] outline-none rounded-lg px-3 py-2"
            disabled={saving}
          >
            <option value="">(none)</option>
            {INSTRUMENT_KEYS.map((k) => (
              <option key={k} value={k}>{instLabel(k)}</option>
            ))}
          </select>
        </div>

        {/* Instrument list */}
        <div>
          <label className="text-xs text-[#8A8578] font-mono block mb-1">Instrument List</label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="搜尋樂器..."
            className="w-full bg-[#0A0A0A] text-sm text-[#F0EDE6] border border-[#8A8578]/30 focus:border-[var(--color-gold)] outline-none rounded-lg px-3 py-1.5 mb-2 placeholder:text-[#8A8578]/40"
            disabled={saving}
          />
          <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {filteredInstruments.map((k) => {
              const selected = draftList.includes(k);
              return (
                <button
                  key={k}
                  onClick={() => toggleInstrument(k)}
                  disabled={saving}
                  className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                    selected
                      ? 'border-[var(--color-gold)] bg-[var(--color-gold)]/20 text-[var(--color-gold)]'
                      : 'border-[#8A8578]/20 text-[#8A8578] hover:border-[#8A8578]/50 hover:text-[#C4BFB3]'
                  }`}
                >
                  {instLabel(k)}
                </button>
              );
            })}
          </div>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={handleSave}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg bg-[var(--color-gold)] text-[#0A0A0A] font-bold hover:bg-[var(--color-gold)]/90 disabled:opacity-50"
          >
            {saving ? '儲存中...' : '儲存'}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setDraftPrimary(primaryInstrument || '');
              setDraftList(instrumentList || []);
              setError(null);
              setSearch('');
            }}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg border border-[#8A8578]/30 text-[#8A8578] hover:text-[#F0EDE6] hover:border-[#F0EDE6]/30"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group/inst inline-block">
      {primaryInstrument ? (
        <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-gold/30 text-gold capitalize cursor-pointer" onClick={() => { setDraftPrimary(primaryInstrument || ''); setDraftList(instrumentList || []); setEditing(true); }}>
          {instLabel(primaryInstrument)}
        </span>
      ) : (
        <span
          className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-dashed border-[var(--color-gold)]/20 text-[var(--color-gold)]/40 cursor-pointer hover:border-[var(--color-gold)]/40 hover:text-[var(--color-gold)]/60 transition-colors"
          onClick={() => { setDraftPrimary(''); setDraftList(instrumentList || []); setEditing(true); }}
        >
          + 樂器
        </span>
      )}
      <button
        onClick={() => { setDraftPrimary(primaryInstrument || ''); setDraftList(instrumentList || []); setEditing(true); }}
        className="absolute -top-1 -right-6 opacity-0 group-hover/inst:opacity-100 transition-opacity p-1 rounded-lg bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/30"
        title="Edit instruments"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    </div>
  );
}
