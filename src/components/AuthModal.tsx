'use client';

import { useState, useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';

/* Hydration-safe mount detection (same pattern as AdminLoginModal) */
const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

type Tab = 'signIn' | 'signUp' | 'forgotPassword';

export default function AuthModal() {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const t = useTranslations('auth');
  const { showAuthModal, setShowAuthModal, signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const [tab, setTab] = useState<Tab>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const resetForm = useCallback(() => {
    setEmail('');
    setPassword('');
    setError('');
    setLoading(false);
    setConfirmationSent(false);
    setResetEmailSent(false);
  }, []);

  const handleClose = useCallback(() => {
    setShowAuthModal(false);
    resetForm();
  }, [setShowAuthModal, resetForm]);

  // ESC to close
  useEffect(() => {
    if (!showAuthModal) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [showAuthModal, handleClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = showAuthModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showAuthModal]);

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    setError('');
    setConfirmationSent(false);
    setResetEmailSent(false);
  };

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (tab === 'forgotPassword') {
      const { error } = await resetPassword(email);
      setLoading(false);
      if (error) setError(t('genericError'));
      else setResetEmailSent(true);
    } else if (tab === 'signIn') {
      const { error } = await signIn(email, password);
      setLoading(false);
      if (error) setError(t('invalidCredentials'));
    } else {
      const { error, needsConfirmation } = await signUp(email, password);
      setLoading(false);
      if (error) {
        if (error === 'emailInUse') setError(t('emailInUse'));
        else if (error === 'rateLimited') setError(t('rateLimited'));
        else if (error.toLowerCase().includes('password')) setError(t('weakPassword'));
        else setError(t('genericError'));
      } else if (needsConfirmation) {
        setConfirmationSent(true);
      }
    }
  }, [tab, email, password, signIn, signUp, resetPassword, t]);

  const handleGoogle = useCallback(async () => {
    setLoading(true);
    await signInWithGoogle();
  }, [signInWithGoogle]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[70] transition-opacity duration-300 ${
          showAuthModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
        onClick={handleClose}
      />

      {/* Modal */}
      <div
        className={`fixed inset-0 z-[71] flex items-center justify-center transition-all duration-300 ${
          showAuthModal ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={handleClose}
      >
        <div
          className={`relative w-full max-w-sm mx-4 rounded-2xl border border-[var(--border)] shadow-2xl transition-all duration-300 overflow-hidden ${
            showAuthModal ? 'translate-y-0 scale-100' : '-translate-y-4 scale-[0.98]'
          }`}
          style={{
            background: 'color-mix(in srgb, var(--background) 95%, transparent)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Tabs */}
          <div className="flex border-b border-[var(--border)]">
            {tab === 'forgotPassword' ? (
              <div className="flex-1 py-3.5 text-sm font-semibold tracking-wide text-center text-[var(--color-gold)] relative">
                {t('resetPassword')}
                <span
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-12 rounded-full bg-[var(--color-gold)]"
                  style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
              </div>
            ) : (
              (['signIn', 'signUp'] as Tab[]).map((t_) => (
                <button
                  key={t_}
                  onClick={() => switchTab(t_)}
                  className={`flex-1 py-3.5 text-sm font-semibold tracking-wide transition-colors duration-300 relative ${
                    tab === t_
                      ? 'text-[var(--color-gold)]'
                      : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                  }`}
                >
                  {t(t_)}
                  {tab === t_ && (
                    <span
                      className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-12 rounded-full bg-[var(--color-gold)]"
                      style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    />
                  )}
                </button>
              ))
            )}
          </div>

          <div className="p-6">
            {/* Email confirmation success */}
            {confirmationSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3 className="font-serif text-lg font-bold mb-2">{t('checkEmailTitle')}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed whitespace-pre-line">{t('checkEmailMessage')}</p>
                <button
                  onClick={handleClose}
                  className="mt-6 text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            ) : resetEmailSent ? (
              <div className="text-center py-4">
                <div className="w-12 h-12 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                    <polyline points="22,6 12,13 2,6" />
                  </svg>
                </div>
                <h3 className="font-serif text-lg font-bold mb-2">{t('resetEmailSentTitle')}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed whitespace-pre-line">{t('resetEmailSentMessage')}</p>
                <button
                  onClick={handleClose}
                  className="mt-6 text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors"
                >
                  {t('close')}
                </button>
              </div>
            ) : tab === 'forgotPassword' ? (
              <>
                <p className="text-sm text-[var(--muted-foreground)] mb-4">{t('forgotPasswordDescription')}</p>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1.5 tracking-wide uppercase">{t('email')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus
                      autoComplete="email"
                      required
                      className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/50 transition-colors placeholder:text-[var(--muted-foreground)]/50"
                    />
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || !email}
                    className="w-full h-10 rounded-lg bg-[var(--color-gold)] text-[#0A0A0A] text-sm font-bold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {loading ? '...' : t('sendResetEmail')}
                  </button>
                </form>
                <button
                  onClick={() => switchTab('signIn')}
                  className="mt-4 w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors"
                >
                  {t('backToSignIn')}
                </button>
              </>
            ) : (
              <>
                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1.5 tracking-wide uppercase">{t('email')}</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoFocus={showAuthModal}
                      autoComplete={tab === 'signIn' ? 'email' : 'off'}
                      required
                      className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/50 transition-colors placeholder:text-[var(--muted-foreground)]/50"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[var(--muted-foreground)] mb-1.5 tracking-wide uppercase">{t('password')}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={tab === 'signIn' ? 'current-password' : 'new-password'}
                      required
                      minLength={6}
                      className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/50 transition-colors placeholder:text-[var(--muted-foreground)]/50"
                    />
                  </div>

                  {error && <p className="text-xs text-red-400">{error}</p>}

                  <button
                    type="submit"
                    disabled={loading || !email || !password}
                    className="w-full h-10 rounded-lg bg-[var(--color-gold)] text-[#0A0A0A] text-sm font-bold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    {loading ? '...' : tab === 'signIn' ? t('signIn') : t('createAccount')}
                  </button>
                </form>

                {/* Forgot password link (sign in tab only) */}
                {tab === 'signIn' && (
                  <button
                    onClick={() => switchTab('forgotPassword')}
                    className="mt-3 w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors"
                  >
                    {t('forgotPassword')}
                  </button>
                )}

                {/* Divider */}
                <div className="flex items-center gap-3 my-5">
                  <div className="flex-1 h-px bg-[var(--border)]" />
                  <span className="text-xs text-[var(--muted-foreground)] tracking-wide">{t('orContinueWith')}</span>
                  <div className="flex-1 h-px bg-[var(--border)]" />
                </div>

                {/* Google OAuth */}
                <button
                  onClick={handleGoogle}
                  disabled={loading}
                  className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent text-sm font-medium tracking-wide text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)] transition-colors flex items-center justify-center gap-2.5 disabled:opacity-40"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.96 10.96 0 0 0 1 12c0 1.77.42 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  {t('signInWithGoogle')}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </>,
    document.body,
  );
}
