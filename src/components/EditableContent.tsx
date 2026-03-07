'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAdmin } from './AdminProvider';

interface EditableContentProps {
  entityType: 'artist' | 'event' | 'venue';
  entityId: string;
  fieldPrefix: 'bio' | 'description';
  locale: string;
  content?: string;
  shortContent?: string;
  contentClassName?: string;
  shortContentClassName?: string;
  /** Wrapper className for the border-t container (only used in view mode) */
  wrapperClassName?: string;
}

export default function EditableContent({
  entityType,
  entityId,
  fieldPrefix,
  locale,
  content,
  shortContent,
  contentClassName = '',
  shortContentClassName = '',
  wrapperClassName,
}: EditableContentProps) {
  const { isAdmin, token } = useAdmin();
  const router = useRouter();
  const t = useTranslations('admin');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(content || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus textarea when entering edit mode
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [editing]);

  // Esc to cancel
  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setEditing(false);
        setDraft(content || '');
        setError(null);
        setWarning(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing, saving, content]);

  const handleSave = useCallback(async () => {
    if (!token || !draft.trim()) return;
    setSaving(true);
    setError(null);
    setWarning(null);

    try {
      const res = await fetch('/api/admin/update-content', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          entityType,
          entityId,
          fieldPrefix,
          sourceLocale: locale,
          content: draft.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Update failed');
      }

      if (data.translationFailed) {
        setWarning(t('translationFailed'));
      }

      setEditing(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('updateFailed'));
    } finally {
      setSaving(false);
    }
  }, [token, draft, entityType, entityId, fieldPrefix, locale, router]);

  // Non-admin: render content as-is
  if (!isAdmin) {
    return (
      <>
        {shortContent && <p className={shortContentClassName}>{shortContent}</p>}
        {content ? (
          wrapperClassName ? (
            <div className={wrapperClassName}>
              <p className={contentClassName}>{content}</p>
            </div>
          ) : (
            <p className={contentClassName}>{content}</p>
          )
        ) : null}
      </>
    );
  }

  // Admin + editing mode
  if (editing) {
    return (
      <div className="space-y-3">
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={10}
          className="w-full rounded-xl bg-[var(--card)] border border-[var(--border)] p-4 text-sm text-[#F0EDE6] focus:border-[var(--color-gold)]/50 focus:ring-1 focus:ring-[var(--color-gold)]/30 outline-none resize-y font-sans leading-relaxed"
          disabled={saving}
          placeholder={t('enterContent')}
        />
        {saving && (
          <div className="flex items-center gap-2 text-sm text-[var(--color-gold)]">
            <span className="inline-block w-4 h-4 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
            {t('translating')}
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {warning && <p className="text-xs text-amber-400">{warning}</p>}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving || !draft.trim()}
            className="px-4 py-2 rounded-lg bg-[var(--color-gold)] text-[#0A0A0A] text-sm font-bold disabled:opacity-50 hover:brightness-110 transition-all"
          >
            {saving ? t('saving') : t('saveAndTranslate')}
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setDraft(content || '');
              setError(null);
              setWarning(null);
            }}
            disabled={saving}
            className="px-4 py-2 rounded-lg border border-[var(--border)] text-sm text-[#8A8578] disabled:opacity-50 hover:text-[#F0EDE6] transition-colors"
          >
            {t('cancel')}
          </button>
        </div>
      </div>
    );
  }

  // Admin + view mode: show content with edit button
  const hasContent = content || shortContent;

  return (
    <div className="relative group/edit">
      {hasContent ? (
        <>
          {shortContent && <p className={shortContentClassName}>{shortContent}</p>}
          {content && (
            wrapperClassName ? (
              <div className={wrapperClassName}>
                <p className={contentClassName}>{content}</p>
              </div>
            ) : (
              <p className={contentClassName}>{content}</p>
            )
          )}
        </>
      ) : (
        <button
          onClick={() => { setEditing(true); setDraft(''); }}
          className="w-full py-4 rounded-xl border border-dashed border-[var(--color-gold)]/30 text-sm text-[var(--color-gold)]/60 hover:text-[var(--color-gold)] hover:border-[var(--color-gold)]/50 transition-colors"
        >
          {fieldPrefix === 'bio' ? t('addBio') : t('addDescription')}
        </button>
      )}
      {hasContent && (
        <button
          onClick={() => { setEditing(true); setDraft(content || ''); }}
          className="absolute -top-2 -right-2 opacity-0 group-hover/edit:opacity-100 transition-opacity p-1.5 rounded-lg bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/30"
          title={t('editContent')}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            <path d="m15 5 4 4" />
          </svg>
        </button>
      )}
    </div>
  );
}
