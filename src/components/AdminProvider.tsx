'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

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
}

const AdminContext = createContext<AdminContextType | null>(null);

export default function AdminProvider({ children }: { children: React.ReactNode }) {
  const { user, profile, setShowAuthModal } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [adminModeEnabled, setAdminModeEnabled] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);

  const isAdmin = !!(profile?.role === 'admin' && adminModeEnabled);

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
    setAdminModeEnabled((prev) => !prev);
  }, [user, profile, setShowAuthModal]);

  // Ctrl+Shift+A keyboard shortcut
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
