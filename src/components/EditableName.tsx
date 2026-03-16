'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './AdminProvider';

type FieldName = 'name_local' | 'name_en' | 'display_name' | 'title_local' | 'title_en';

interface FieldOption {
  field: FieldName;
  label: string;
  value: string;
}

interface EditableNameProps {
  entityType: 'artist' | 'event' | 'venue';
  entityId: string;
  /** The Airtable field to update (used when fieldOptions is not provided) */
  field: FieldName;
  value: string;
  /** When provided, clicking edit shows a field picker first */
  fieldOptions?: FieldOption[];
  className?: string;
  /** HTML tag to render */
  tag?: 'h1' | 'p';
}

export default function EditableName({
  entityType,
  entityId,
  field,
  value,
  fieldOptions,
  className = '',
  tag: Tag = 'p',
}: EditableNameProps) {
  const { isAdmin, token, getFreshToken, handleUnauthorized } = useAdmin();
  const router = useRouter();
  const [picking, setPicking] = useState(false);
  const [editing, setEditing] = useState(false);
  const [activeField, setActiveField] = useState<FieldName>(field);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  // Close picker on click outside
  useEffect(() => {
    if (!picking) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setPicking(false);
      }
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [picking]);

  useEffect(() => {
    if (!editing && !picking) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setEditing(false);
        setPicking(false);
        setDraft(value);
        setError(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing, picking, saving, value]);

  const handleSave = useCallback(async () => {
    const activeValue = fieldOptions?.find((o) => o.field === activeField)?.value ?? value;
    if (!token || !draft.trim() || draft.trim() === activeValue) {
      setEditing(false);
      setDraft(value);
      return;
    }
    setSaving(true);
    setError(null);

    try {
      // Always refresh token before API call to avoid stale token issues
      const freshToken = await getFreshToken();
      if (!freshToken) {
        throw new Error('Token 已過期，請重新登入');
      }

      const res = await fetch('/api/admin/update-name', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          entityType,
          entityId,
          field: activeField,
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
  }, [token, draft, value, activeField, fieldOptions, entityType, entityId, router, getFreshToken, handleUnauthorized]);

  const startEdit = () => {
    if (fieldOptions && fieldOptions.length > 1) {
      setPicking(true);
    } else {
      setActiveField(field);
      setDraft(value);
      setEditing(true);
    }
  };

  const pickField = (option: FieldOption) => {
    setActiveField(option.field);
    setDraft(option.value);
    setPicking(false);
    setEditing(true);
  };

  if (!isAdmin) {
    return <Tag className={className}>{value}</Tag>;
  }

  if (editing) {
    return (
      <div className="space-y-1">
        <p className="text-xs text-[var(--color-gold)]/70 font-mono">{activeField}</p>
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
        onClick={startEdit}
      >
        {value}
      </Tag>
      <button
        onClick={startEdit}
        className="absolute -top-1 -right-6 opacity-0 group-hover/name:opacity-100 transition-opacity p-1 rounded-lg bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/30"
        title="Edit name"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>

      {/* Field picker menu */}
      {picking && fieldOptions && (
        <div
          ref={menuRef}
          className="absolute top-full left-0 mt-2 z-50 bg-[#1A1A1A] border border-[var(--color-gold)]/30 rounded-xl shadow-lg shadow-black/40 overflow-hidden min-w-[220px]"
        >
          <p className="text-[10px] uppercase tracking-widest text-[#8A8578] px-3 pt-3 pb-1">選擇要編輯的欄位</p>
          {fieldOptions.map((option) => (
            <button
              key={option.field}
              onClick={() => pickField(option)}
              className="w-full text-left px-3 py-2.5 hover:bg-[var(--color-gold)]/10 transition-colors flex items-center justify-between gap-3"
            >
              <div>
                <span className="text-sm font-mono text-[var(--color-gold)]">{option.label}</span>
                <p className="text-xs text-[#8A8578] mt-0.5 truncate max-w-[200px]">
                  {option.value || '(empty)'}
                </p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#8A8578] shrink-0">
                <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                <path d="m15 5 4 4" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
