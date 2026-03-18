'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  username: string | null;
  handle: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  website: string | null;
  role: 'member' | 'artist_manager' | 'venue_manager' | 'admin' | 'owner';
  social_links: Record<string, string>;
  claimed_artist_ids: string[];
  claimed_venue_ids: string[];
  region: string | null;
  user_type: 'fan' | 'industry' | null;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  needsOnboarding: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null; needsConfirmation: boolean }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showComingSoon: { x: number; y: number } | null;
  setShowComingSoon: (pos: { x: number; y: number } | null) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState<{ x: number; y: number } | null>(null);

  const fetchProfile = useCallback(async (userId: string) => {
    const supabase = createClient();
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as UserProfile);
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await fetchProfile(user.id);
  }, [user, fetchProfile]);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    let initialDone = false;

    // Get initial session from local storage — no network round-trip needed.
    // getSession() is safe client-side; the server middleware (middleware.ts)
    // already validates & refreshes the token on every request via getUser().
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      if (session?.user) await fetchProfile(session.user.id);
    }).catch(() => {
      // Storage read error — treat as logged out
    }).finally(() => {
      if (cancelled) return;
      initialDone = true;
      setLoading(false);
    });

    // Listen for auth changes (skip redundant trigger during initial load)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      // During initial load, getSession() already handles the state
      if (!initialDone) return;
      const newUser = session?.user ?? null;
      setUser(newUser);
      if (newUser) {
        fetchProfile(newUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [fetchProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    setShowAuthModal(false);
    return { error: null };
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const supabase = createClient();
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      const code = error.code ?? '';
      if (code === 'over_email_send_rate_limit' || error.message.includes('rate limit')) {
        return { error: 'rateLimited', needsConfirmation: false };
      }
      return { error: error.message, needsConfirmation: false };
    }
    // If user exists but identities is empty, email is already taken
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      return { error: 'emailInUse', needsConfirmation: false };
    }
    return { error: null, needsConfirmation: true };
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(window.location.pathname)}`,
      },
    });
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/auth/callback?next=/update-password',
    });
    if (error) return { error: error.message };
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  const needsOnboarding = !!user && !!profile && profile.user_type === null;

  return (
    <AuthContext.Provider
      value={{ user, profile, loading, needsOnboarding, signIn, signUp, signInWithGoogle, signOut, refreshProfile, resetPassword, showAuthModal, setShowAuthModal, showComingSoon, setShowComingSoon }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
