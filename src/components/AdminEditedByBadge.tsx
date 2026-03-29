'use client';

import { useEffect, useState } from 'react';
import { useAdmin } from './AdminProvider';

interface EditorInfo {
  display_name: string | null;
  username: string | null;
  role: string | null;
  email: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  artist_manager: 'Artist Manager',
  venue_manager: 'Venue Manager',
  member: 'Member',
};

interface AdminEditedByBadgeProps {
  updatedBy?: string | null;
}

export default function AdminEditedByBadge({ updatedBy }: AdminEditedByBadgeProps) {
  // Use `token` directly (kept in sync via onAuthStateChange) instead of
  // getFreshToken(), which calls refreshSession() and may trigger
  // handleUnauthorized() → login modal loop on mount.
  const { isAdmin, token } = useAdmin();
  const [editor, setEditor] = useState<EditorInfo | null>(null);

  useEffect(() => {
    if (!isAdmin || !updatedBy || !token) return;

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/editor-profile?userId=${encodeURIComponent(updatedBy)}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setEditor(data);
      } catch {
        // silently ignore — badge is cosmetic, never block UX
      }
    })();
    return () => { cancelled = true; };
  }, [isAdmin, updatedBy, token]);

  if (!isAdmin || !updatedBy || !editor) return null;

  const name = editor.display_name || editor.email || updatedBy;
  const roleLabel = editor.role ? (ROLE_LABELS[editor.role] ?? editor.role) : null;

  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-red-500/30 bg-red-500/10 text-[11px] text-red-400/80 select-none">
      {/* Pencil icon */}
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 shrink-0">
        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        <path d="m15 5 4 4" />
      </svg>
      {roleLabel && (
        <span className="uppercase tracking-widest text-[10px] font-bold">
          {roleLabel}
        </span>
      )}
      {roleLabel && <span className="opacity-40">·</span>}
      <span className="opacity-80">{name}</span>
    </span>
  );
}
