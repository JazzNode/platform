'use client';

import { useEffect } from 'react';
import { useAdmin } from './AdminProvider';
import { useAuth } from './AuthProvider';

/**
 * AdminLoginModal is now a thin redirect:
 * When showLoginModal becomes true, it opens the regular AuthModal instead.
 * The old password-based modal is no longer needed — admins authenticate
 * via Supabase (Google OAuth or email/password) and are identified by
 * profiles.role === 'admin'.
 */
export default function AdminLoginModal() {
  const { showLoginModal, setShowLoginModal } = useAdmin();
  const { setShowAuthModal } = useAuth();

  useEffect(() => {
    if (showLoginModal) {
      setShowLoginModal(false);
      setShowAuthModal(true);
    }
  }, [showLoginModal, setShowLoginModal, setShowAuthModal]);

  return null;
}
