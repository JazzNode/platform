'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface AdminContextType {
  isAdmin: boolean;
  token: string | null;
  login: (password: string) => Promise<boolean>;
  logout: () => void;
  toggleAdmin: () => void;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  /** Call when an API returns 401 to clear token and prompt re-login */
  handleUnauthorized: () => void;
}

const AdminContext = createContext<AdminContextType | null>(null);
const STORAGE_KEY = 'jazznode_admin_token';

/** Decode JWT payload and check if it's expired */
function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return true;
    // Add 60s buffer so we don't use a token that's about to expire
    return Date.now() >= (payload.exp - 60) * 1000;
  } catch {
    return true;
  }
}

export default function AdminProvider({ children }: { children: React.ReactNode }) {
  // Initialize state synchronously; discard expired tokens immediately
  const [token, setToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored && !isTokenExpired(stored)) return stored;
        // Clean up expired token
        if (stored) localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    return null;
  });
  
  const [showLoginModal, setShowLoginModal] = useState(false);

  const logout = useCallback(() => {
    setToken(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const handleUnauthorized = useCallback(() => {
    logout();
    setShowLoginModal(true);
  }, [logout]);

  const toggleAdmin = useCallback(() => {
    if (token) {
      logout();
    } else {
      setShowLoginModal(true);
    }
  }, [token, logout]);

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

  const login = useCallback(async (password: string): Promise<boolean> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        const data = await res.json();
        setToken(data.token);
        try {
          localStorage.setItem(STORAGE_KEY, data.token);
        } catch {
          /* ignore */
        }
        setShowLoginModal(false);
        return true;
      }
    } catch (err) {
      console.error('Login error', err);
    }
    return false;
  }, []);

  return (
    <AdminContext.Provider
      value={{
        isAdmin: !!token,
        token,
        login,
        logout,
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
