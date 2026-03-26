'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface DomainStatus {
  domain: string | null;
  verified: boolean;
  tier: number;
  vercelStatus: {
    verified: boolean;
    misconfigured: boolean;
    verification: Array<{ type: string; domain: string; value: string }> | null;
  } | null;
}

export default function VenueDomainPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewVenueTier, adminModeEnabled } = useAdmin();
  const { isUnlocked, minTier } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [fetching, setFetching] = useState(true);
  const [domainStatus, setDomainStatus] = useState<DomainStatus | null>(null);

  const [inputDomain, setInputDomain] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [error, setError] = useState('');
  const [dnsInstructions, setDnsInstructions] = useState<{ type: string; name: string; value: string; note: string } | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  const fetchStatus = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/venue/custom-domain?venueId=${slug}`);
      const data = await res.json();
      setDomainStatus(data);
      setTier(data.tier ?? 0);
      if (data.domain) setInputDomain(data.domain);
    } catch {}
    setFetching(false);
  }, [slug]);

  useEffect(() => {
    if (!slug || !user) return;
    fetchStatus();
  }, [slug, user, fetchStatus]);

  const handleSave = useCallback(async () => {
    if (!inputDomain.trim() || !slug || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/venue/custom-domain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: slug, domain: inputDomain.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to save domain');
      } else {
        setDnsInstructions(data.dnsInstructions);
        await fetchStatus();
      }
    } catch {
      setError('Network error');
    }
    setSaving(false);
  }, [inputDomain, slug, saving, fetchStatus]);

  const handleRemove = useCallback(async () => {
    if (!slug || removing) return;
    setRemoving(true);
    try {
      const res = await fetch('/api/venue/custom-domain', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ venueId: slug }),
      });
      if (res.ok) {
        setDomainStatus(null);
        setInputDomain('');
        setDnsInstructions(null);
      }
    } catch {}
    setRemoving(false);
  }, [slug, removing]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;
  const domainMinTier = minTier('venue', 'custom_domain');

  if (!isUnlocked('venue', 'custom_domain', effectiveTier, adminModeEnabled)) {
    return (
      <div className="space-y-6">
        <FadeUp><h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('domainTitle')}</h1></FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-blue-400/5 to-blue-400/10 border border-blue-400/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-blue-400/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="2" y1="12" x2="22" y2="12" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('domainLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">{t('domainLockedDesc')}</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">{t('eliteLockedHint')}</p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradeElite')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  const hasDomain = !!domainStatus?.domain;
  const isVerified = domainStatus?.verified;
  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-blue-400/50 transition-colors';

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('domainTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('domainDescription')}</p>
      </FadeUp>

      {/* Current domain status */}
      {hasDomain && (
        <FadeUp>
          <div className={`bg-[var(--card)] border rounded-2xl p-6 ${
            isVerified ? 'border-emerald-400/30' : 'border-amber-400/30'
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className={`w-2.5 h-2.5 rounded-full ${isVerified ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                <span className="font-mono text-sm font-semibold">{domainStatus?.domain}</span>
              </div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                isVerified
                  ? 'bg-emerald-500/15 text-emerald-400'
                  : 'bg-amber-500/15 text-amber-400'
              }`}>
                {isVerified ? t('domainVerified') : t('domainPending')}
              </span>
            </div>

            {isVerified && (
              <p className="text-sm text-emerald-400/80">
                {t('domainActive')} — <a href={`https://${domainStatus?.domain}`} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-emerald-300">{domainStatus?.domain}</a>
              </p>
            )}

            {!isVerified && (
              <div className="space-y-3">
                <p className="text-sm text-amber-400/80">{t('domainDnsRequired')}</p>

                {/* DNS Instructions */}
                <div className="bg-[var(--background)] rounded-xl p-4 space-y-2">
                  <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-3">{t('dnsConfig')}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-[var(--muted-foreground)]">{t('dnsType')}</span>
                      <p className="font-mono font-bold mt-0.5">CNAME</p>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">{t('dnsName')}</span>
                      <p className="font-mono font-bold mt-0.5">{domainStatus?.domain}</p>
                    </div>
                    <div>
                      <span className="text-[var(--muted-foreground)]">{t('dnsValue')}</span>
                      <p className="font-mono font-bold mt-0.5">cname.vercel-dns.com</p>
                    </div>
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)] mt-2">{t('dnsApexNote')}</p>
                </div>

                <button
                  onClick={fetchStatus}
                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                >
                  {t('recheckDns')}
                </button>
              </div>
            )}

            {/* Remove domain */}
            <div className="mt-4 pt-4 border-t border-[var(--border)]">
              <button
                onClick={handleRemove}
                disabled={removing}
                className="text-xs text-red-400 hover:text-red-300 transition-colors"
              >
                {removing ? t('removing') : t('removeDomain')}
              </button>
            </div>
          </div>
        </FadeUp>
      )}

      {/* Set domain form */}
      {!hasDomain && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {t('setDomain')}
            </h2>

            <input
              type="text"
              value={inputDomain}
              onChange={(e) => { setInputDomain(e.target.value); setError(''); }}
              className={inputClass}
              placeholder="bluenote.taipei"
            />

            {error && (
              <p className="text-xs text-red-400">{error}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!inputDomain.trim() || saving}
                className="px-6 py-2.5 rounded-xl bg-blue-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  t('connectDomain')
                )}
              </button>
            </div>

            <div className="text-xs text-[var(--muted-foreground)] space-y-1">
              <p>{t('domainHint1')}</p>
              <p>{t('domainHint2')}</p>
            </div>
          </div>
        </FadeUp>
      )}

      {/* DNS instructions after save */}
      {dnsInstructions && !hasDomain && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-amber-400/20 rounded-2xl p-6">
            <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-3">{t('dnsConfig')}</p>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-[var(--muted-foreground)]">{t('dnsType')}</span>
                <p className="font-mono font-bold mt-0.5">{dnsInstructions.type}</p>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">{t('dnsName')}</span>
                <p className="font-mono font-bold mt-0.5">{dnsInstructions.name}</p>
              </div>
              <div>
                <span className="text-[var(--muted-foreground)]">{t('dnsValue')}</span>
                <p className="font-mono font-bold mt-0.5">{dnsInstructions.value}</p>
              </div>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-3">{dnsInstructions.note}</p>
          </div>
        </FadeUp>
      )}
    </div>
  );
}
