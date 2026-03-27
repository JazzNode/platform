'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

export type ViewMode =
  | 'admin'
  | 'artist-tier0' | 'artist-tier1' | 'artist-tier2' | 'artist-tier3'
  | 'venue-tier0' | 'venue-tier1' | 'venue-tier2' | 'venue-tier3';

const ARTIST_TIER_CYCLE: ViewMode[] = ['admin', 'artist-tier0', 'artist-tier1', 'artist-tier2', 'artist-tier3'];
const VENUE_TIER_CYCLE: ViewMode[] = ['admin', 'venue-tier0', 'venue-tier1', 'venue-tier2', 'venue-tier3'];

const HQ_ROLES = ['editor', 'moderator', 'marketing', 'admin', 'owner'];

interface AdminContextType {
  isAdmin: boolean;
  /** True only for owner role — can manage admin roles */
  isOwner: boolean;
  /** True for any HQ role (editor, moderator, marketing, admin, owner) when admin mode enabled */
  isHQ: boolean;
  /** True only for editor role */
  isEditor: boolean;
  /** True only for moderator role */
  isModerator: boolean;
  /** True only for marketing role */
  isMarketing: boolean;
  /** Raw role string from profile */
  hqRole: string | null;
  /** Supabase access token — pass as Bearer token to admin API routes */
  token: string | null;
  /** Get a fresh (auto-refreshed) access token right before API calls */
  getFreshToken: () => Promise<string | null>;
  /** Whether admin mode UI is active (admin may toggle it off to see regular view) */
  adminModeEnabled: boolean;
  /** @deprecated Use toggleArtistTier or toggleVenueTier instead */
  toggleAdmin: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  /** Call when an API returns 401 to prompt re-login */
  handleUnauthorized: () => void;
  /** Current view mode for tier preview */
  viewMode: ViewMode;
  /** Preview artist tier (null when not previewing artist tiers) */
  previewArtistTier: number | null;
  /** Preview venue tier (null when not previewing venue tiers) */
  previewVenueTier: number | null;
  /** Ctrl+Shift+A — cycle through artist tiers */
  toggleArtistTier: () => void;
  /** Ctrl+Shift+V — cycle through venue tiers */
  toggleVenueTier: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);

export default function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, setShowAuthModal } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [showLoginModal, setShowLoginModal] = useState(false);

  const adminModeEnabled = viewMode === 'admin';
  const isAdmin = !!((profile?.role === 'admin' || profile?.role === 'owner') && adminModeEnabled);
  const isOwner = profile?.role === 'owner';
  const isHQ = !!(profile?.role && HQ_ROLES.includes(profile.role) && adminModeEnabled);
  const isEditor = profile?.role === 'editor';
  const isModerator = profile?.role === 'moderator';
  const isMarketing = profile?.role === 'marketing';
  const hqRole = (profile?.role && HQ_ROLES.includes(profile.role)) ? profile.role : null;

  // Parse preview tiers from viewMode
  // Admin mode → max tier (all features unlocked)
  const previewArtistTier = viewMode === 'admin' ? 3
    : viewMode.startsWith('artist-tier') ? parseInt(viewMode.replace('artist-tier', ''), 10)
    : null;
  const previewVenueTier = viewMode === 'admin' ? 3
    : viewMode.startsWith('venue-tier') ? parseInt(viewMode.replace('venue-tier', ''), 10)
    : null;

  // Keep Supabase access token in sync for API calls
  useEffect(() => {
    if (!user) {
      setToken(null); // eslint-disable-line react-hooks/set-state-in-effect -- intentional reset on logout
      return;
    }

    const supabase = createClient();
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });

    return () => subscription.unsubscribe();
  }, [user]);

  const handleUnauthorized = useCallback(() => {
    setToken(null);
    setShowAuthModal(true);
  }, [setShowAuthModal]);

  /** Refresh the Supabase session and return a fresh access token */
  const getFreshToken = useCallback(async (): Promise<string | null> => {
    if (!user) return null;
    try {
      const supabase = createClient();
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error || !session) {
        handleUnauthorized();
        return null;
      }
      setToken(session.access_token);
      return session.access_token;
    } catch {
      handleUnauthorized();
      return null;
    }
  }, [user, handleUnauthorized]);

  /** Cycle through a specific tier cycle based on current viewMode */
  const cycleTier = useCallback((cycle: ViewMode[]) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (!['admin', 'owner', 'editor'].includes(profile?.role || '')) return;

    setViewMode((prev) => {
      const idx = cycle.indexOf(prev);
      if (idx >= 0) {
        // Already in this cycle — advance to next
        return cycle[(idx + 1) % cycle.length];
      }
      // Currently in another cycle — jump to first non-admin entry
      return cycle[1] ?? cycle[0];
    });
  }, [user, profile, setShowAuthModal]);

  const toggleArtistTier = useCallback(() => cycleTier(ARTIST_TIER_CYCLE), [cycleTier]);
  const toggleVenueTier = useCallback(() => cycleTier(VENUE_TIER_CYCLE), [cycleTier]);

  // Keep backward compat — toggleAdmin cycles artist tiers (same shortcut)
  const toggleAdmin = toggleArtistTier;

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.metaKey || !e.shiftKey) return;

      if (e.key === 'A') {
        e.preventDefault();
        toggleArtistTier();
      } else if (e.key === 'V') {
        e.preventDefault();
        toggleVenueTier();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleArtistTier, toggleVenueTier]);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isOwner: !!isOwner,
        isHQ,
        isEditor: !!isEditor,
        isModerator: !!isModerator,
        isMarketing: !!isMarketing,
        hqRole,
        token,
        getFreshToken,
        adminModeEnabled,
        toggleAdmin,
        handleUnauthorized,
        showLoginModal,
        setShowLoginModal,
        viewMode,
        previewArtistTier,
        previewVenueTier,
        toggleArtistTier,
        toggleVenueTier,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error('useAdmin must be used within AdminProvider');
  return ctx;
}
