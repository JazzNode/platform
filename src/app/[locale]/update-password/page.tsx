'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';

export default function UpdatePasswordPage() {
  const t = useTranslations('auth');
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    if (password.length < 6) {
      setError(t('weakPassword'));
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      setError(t('genericError'));
      return;
    }

    setSuccess(true);
    setTimeout(() => router.push('/'), 2000);
  };

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden"
        style={{
          background: 'color-mix(in srgb, var(--background) 95%, transparent)',
          backdropFilter: 'blur(40px) saturate(1.6)',
          WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
        }}
      >
        <div className="border-b border-[var(--border)] py-3.5 text-center">
          <span className="text-sm font-semibold tracking-wide text-[var(--color-gold)]">
            {t('updatePassword')}
          </span>
        </div>

        <div className="p-6">
          {success ? (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full bg-[var(--color-gold)]/10 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <h3 className="font-serif text-lg font-bold mb-2">{t('passwordUpdated')}</h3>
              <p className="text-sm text-[var(--muted-foreground)]">{t('redirectingHome')}</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1.5 tracking-wide uppercase">
                  {t('newPassword')}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  autoFocus
                  className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/50 transition-colors placeholder:text-[var(--muted-foreground)]/50"
                />
              </div>
              <div>
                <label className="block text-xs text-[var(--muted-foreground)] mb-1.5 tracking-wide uppercase">
                  {t('confirmNewPassword')}
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={6}
                  className="w-full h-10 rounded-lg border border-[var(--border)] bg-transparent px-3 text-sm outline-none focus:border-[var(--color-gold)] focus:ring-1 focus:ring-[var(--color-gold)]/50 transition-colors placeholder:text-[var(--muted-foreground)]/50"
                />
              </div>

              {error && <p className="text-xs text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={loading || !password || !confirmPassword}
                className="w-full h-10 rounded-lg bg-[var(--color-gold)] text-[#0A0A0A] text-sm font-bold tracking-wide transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {loading ? '...' : t('updatePassword')}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
