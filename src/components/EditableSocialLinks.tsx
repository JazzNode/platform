'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from './AdminProvider';
import SocialIcons from './SocialIcons';
import SocialIconsPlaceholder from './SocialIconsPlaceholder';

interface SocialFields {
  website_url?: string;
  spotify_url?: string;
  youtube_url?: string;
  instagram?: string;
  facebook_url?: string;
}

interface EditableSocialLinksProps {
  entityType: 'artist' | 'venue';
  entityId: string;
  artistName: string;
  fields: SocialFields;
}

const SOCIAL_CONFIGS = [
  { key: 'website_url' as const, label: 'Website', placeholder: 'https://example.com', defaultPrefix: 'https://' },
  { key: 'spotify_url' as const, label: 'Spotify', placeholder: 'https://open.spotify.com/artist/...', defaultPrefix: 'https://' },
  { key: 'youtube_url' as const, label: 'YouTube', placeholder: 'https://youtube.com/...', defaultPrefix: 'https://' },
  { key: 'instagram' as const, label: 'Instagram', placeholder: '@username', defaultPrefix: '@' },
  { key: 'facebook_url' as const, label: 'Facebook', placeholder: 'https://facebook.com/...', defaultPrefix: 'https://' },
] as const;

function withDefaults(fields: SocialFields): SocialFields {
  const result = { ...fields };
  for (const { key, defaultPrefix } of SOCIAL_CONFIGS) {
    if (!result[key]) result[key] = defaultPrefix;
  }
  return result;
}

function stripDefaults(fields: SocialFields): SocialFields {
  const result = { ...fields };
  for (const { key, defaultPrefix } of SOCIAL_CONFIGS) {
    if (result[key] === defaultPrefix) result[key] = undefined;
  }
  return result;
}

export default function EditableSocialLinks({
  entityType,
  entityId,
  artistName,
  fields,
}: EditableSocialLinksProps) {
  const { isAdmin, getFreshToken, handleUnauthorized } = useAdmin();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SocialFields>({ ...fields });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const hasAny = fields.website_url || fields.spotify_url || fields.youtube_url || fields.instagram || fields.facebook_url;

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
          entityType,
          entityId,
          fields: (() => {
            const clean = stripDefaults(draft);
            return {
              website_url: clean.website_url || null,
              spotify_url: clean.spotify_url || null,
              youtube_url: clean.youtube_url || null,
              instagram: clean.instagram || null,
              facebook_url: clean.facebook_url || null,
            };
          })(),
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
  }, [draft, entityType, entityId, getFreshToken, handleUnauthorized, router]);

  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !saving) {
        setEditing(false);
        setDraft(withDefaults(fields));
        setError(null);
      } else if (e.key === 'Enter' && !saving) {
        handleSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editing, saving, fields, handleSave]);

  if (!isAdmin) {
    return hasAny ? (
      <SocialIcons
        websiteUrl={fields.website_url}
        spotifyUrl={fields.spotify_url}
        youtubeUrl={fields.youtube_url}
        instagram={fields.instagram}
        facebookUrl={fields.facebook_url}
      />
    ) : (
      <SocialIconsPlaceholder artistName={artistName} />
    );
  }

  if (editing) {
    return (
      <div ref={panelRef} className="space-y-3 p-4 rounded-xl border border-[var(--color-gold)]/30 bg-[#1A1A1A]">
        <p className="text-[10px] uppercase tracking-widest text-[var(--color-gold)]/70">Social Links</p>
        {SOCIAL_CONFIGS.map(({ key, label, placeholder }) => (
          <div key={key} className="flex items-center gap-3">
            <label className="text-xs text-[var(--muted-foreground)] w-20 shrink-0 font-mono">{label}</label>
            <input
              type="text"
              value={draft[key] || ''}
              onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
              placeholder={placeholder}
              className="flex-1 bg-transparent text-sm text-[var(--foreground)] border-b border-[var(--muted-foreground)]/30 focus:border-[var(--color-gold)] outline-none py-1 placeholder:text-[var(--muted-foreground)]/40"
              disabled={saving}
            />
          </div>
        ))}
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
            onClick={() => { setEditing(false); setDraft(withDefaults(fields)); setError(null); }}
            disabled={saving}
            className="text-xs px-3 py-1.5 rounded-lg border border-[var(--muted-foreground)]/30 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30"
          >
            取消
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative group/social inline-block">
      {hasAny ? (
        <SocialIcons
          websiteUrl={fields.website_url}
          spotifyUrl={fields.spotify_url}
          youtubeUrl={fields.youtube_url}
          instagram={fields.instagram}
          facebookUrl={fields.facebook_url}
        />
      ) : (
        <SocialIconsPlaceholder artistName={artistName} />
      )}
      <button
        onClick={() => { setDraft(withDefaults(fields)); setEditing(true); }}
        className="absolute -top-1 -right-6 opacity-0 group-hover/social:opacity-100 transition-opacity p-1 rounded-lg bg-[var(--color-gold)]/20 text-[var(--color-gold)] border border-[var(--color-gold)]/30 hover:bg-[var(--color-gold)]/30"
        title="Edit social links"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
          <path d="m15 5 4 4" />
        </svg>
      </button>
    </div>
  );
}
