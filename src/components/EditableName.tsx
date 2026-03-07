'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './AdminProvider';

interface EditableNameProps {
  entityType: 'artist' | 'event' | 'venue';
  entityId: string;
  /** The Airtable field to update (name_local, name_en, or display_name) */
  field: 'name_local' | 'name_en' | 'display_name';
  value: string;
  className?: string;
  /** HTML tag to render */
  tag?: 'h1' | 'p';
}

export default function EditableName({
  entityType,
  entityId,
  field,
  value,
  className = '',
  tag: Tag = 'p',
}: EditableNameProps) {
  const { isAdmin, token, handleUnauthorized } = useAdmin();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setEditing(false);
        setDraft(value);
        setError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing, saving, value]);

  const handleSave = useCallback(async () => {
    if (!token || !draft.trim() || draft.trim() === value) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const res = await fetch('/api/admin/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityType,
          entityId,
          field,
          value: draft.trim(),
        }),
      });

      if (res.status === 401) {
        handleUnauthorized();
        throw new Error('Token 已過期，請重新登入');
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');

      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  }, [token, draft, value, entityType, entityId, field, router]);

  if (!isAdmin) {
    return <Tag className={className}>{value}</Tag>;
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <input
          ref={inputRef}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !saving) handleSave();
          }}
          className={`${className} w-full bg-transparent border-b-2 border-[var(--color-gold)] outline-none`}
          disabled={saving}
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        {saving && (
          <div className="flex items-center gap-2 text-xs text-[var(--color-gold)]">
            <span className="inline-block w-3 h-3 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
            Saving...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative group/name inline">
      <Tag
        className={`${className} cursor-pointer`}
        onClick={() => { setEditing(true); setDraft(value); }}
      >
        {value}
      </Tag>
      <button
        onClick={() => { setEditing(true); setDraft(value); }}
        className="absolute -top-1 -right-6 opacity-0 group-hover/name:opacity-100 transition-opacity p-1 rounded-lg bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/30"
        title="Edit name"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    </div>
  );
}
