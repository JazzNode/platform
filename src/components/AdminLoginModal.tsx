'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useAdmin } from './AdminProvider';

/* Hydration-safe mount detection (same pattern as LegalModal) */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function AdminLoginModal() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const { showLoginModal, setShowLoginModal, login } = useAdmin();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // ESC to close
  useEffect(() => {
    if (!showLoginModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setShowLoginModal(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showLoginModal, setShowLoginModal]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = showLoginModal ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [showLoginModal]);

  // Reset state when closing
  useEffect(() => {
    if (!showLoginModal) {
      setPassword('');
      setError('');
    }
  }, [showLoginModal]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setLoading(true);
      setError('');
      const ok = await login(password);
      setLoading(false);
      if (!ok) setError('Invalid password');
    },
    [password, login],
  );

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] transition-opacity duration-300 ${
          showLoginModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
        onClick={() => setShowLoginModal(false)}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-[71] flex items-center justify-center transition-all duration-300 ${
          showLoginModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
      >
        <div
          className={`w-full max-w-sm mx-4 rounded-2xl border border-[var(--border)] p-6 shadow-2xl transition-all duration-300 ${
            showLoginModal ? 'translate-y-0 scale-100' : '-translate-y-4 scale-[0.98]'
          }`}
          style={{
            background: 'color-mix(in srgb, var(--background) 95%, transparent)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="font-serif text-lg font-bold mb-4">🔧 Admin Access</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoFocus={showLoginModal}
              className="w-full h-9 rounded-md border border-[var(--border)] bg-transparent px-3 py-1 text-sm outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/50 transition-colors"
            />
            {error && <p className="text-xs text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading || !password}
              className="w-full h-9 rounded-md bg-[var(--color-gold)] text-[#0A0A0A] text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {loading ? '...' : 'Enter'}
            </button>
          </form>
        </div>
      </div>
    </>,
    document.body,
  );
}
