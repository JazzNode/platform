'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

export type ViewMode = 'admin' | 'tier0' | 'tier1' | 'tier2' | 'tier3';

const VIEW_MODE_CYCLE: ViewMode[] = ['admin', 'tier0', 'tier1', 'tier2', 'tier3'];

interface AdminContextType {
  isAdmin: boolean;
  /** Supabase access token — pass as Bearer token to admin API routes */
  token: string | null;
  /** Whether admin mode UI is active (admin may toggle it off to see regular view) */
  adminModeEnabled: boolean;
  toggleAdmin: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  /** Call when an API returns 401 to prompt re-login */
  handleUnauthorized: () => void;
  /** Current view mode for tier preview */
  viewMode: ViewMode;
  /** The tier number being previewed (null when in admin mode) */
  previewTier: number | null;
}

const AdminContext = createContext<AdminContextType | null>(null);

export default function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, setShowAuthModal } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [showLoginModal, setShowLoginModal] = useState(false);

  const adminModeEnabled = viewMode === 'admin';
  const isAdmin = !!(profile?.role === 'admin' && adminModeEnabled);
  const previewTier = viewMode === 'admin' ? null : parseInt(viewMode.replace('tier', ''), 10);

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

  const toggleAdmin = useCallback(() => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    if (profile?.role !== 'admin') return;

    setViewMode((prev) => {
      const idx = VIEW_MODE_CYCLE.indexOf(prev);
      return VIEW_MODE_CYCLE[(idx + 1) % VIEW_MODE_CYCLE.length];
    });
  }, [user, profile, setShowAuthModal]);

  // Ctrl+Shift+A keyboard shortcut — cycle through view modes
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && !e.metaKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        toggleAdmin();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [toggleAdmin]);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        token,
        adminModeEnabled,
        toggleAdmin,
        handleUnauthorized,
        showLoginModal,
        setShowLoginModal,
        viewMode,
        previewTier,
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
