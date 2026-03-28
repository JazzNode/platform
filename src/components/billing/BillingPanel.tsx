'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import FadeUp from '@/components/animations/FadeUp';
import { createClient } from '@/utils/supabase/client';

type EntityType = 'artist' | 'venue';

interface Plan {
  productId: string;
  name: string;
  description: string;
  monthly: { priceId: string; amount: number; nickname: string | null } | null;
  yearly: { priceId: string; amount: number; nickname: string | null } | null;
}

interface EntityBilling {
  tier: number;
  stripe_subscription_status: string | null;
  billing_user_id: string | null;
}

interface BillingPanelProps {
  entityType: EntityType;
  entityId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
}

const TIER_NAMES: Record<number, string> = { 0: 'Free', 1: 'Claimed', 2: 'Premium', 3: 'Elite' };
const TIER_COLORS: Record<number, string> = {
  0: 'text-zinc-400',
  1: 'text-blue-400',
  2: 'text-amber-400',
  3: 'text-purple-400',
};

// Map product name → tier
const PRODUCT_TIER: Record<string, number> = {
  'JazzNode Artist Premium': 2,
  'JazzNode Artist Elite': 3,
  'JazzNode Venue Premium': 2,
  'JazzNode Venue Elite': 3,
};

export default function BillingPanel({ entityType, entityId, t }: BillingPanelProps) {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [entity, setEntity] = useState<EntityBilling | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState<string | null>(null);
  const [portaling, setPortaling] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState(() => {
    if (typeof window === 'undefined') return '';
    const p = new URLSearchParams(window.location.search);
    if (p.get('success') === '1') return 'Subscription activated! Welcome to your new plan.';
    if (p.get('canceled') === '1') return '';
    return '';
  });
  const wasCanceled = searchParams.get('canceled') === '1';

  const isOwner = entity?.billing_user_id === user?.id;

  const fetchData = useCallback(async () => {
    if (!entityId) return;
    const supabase = createClient();
    const table = entityType === 'artist' ? 'artists' : 'venues';
    const idCol = entityType === 'artist' ? 'artist_id' : 'venue_id';

    const [{ data: entityData }, plansRes] = await Promise.all([
      supabase.from(table).select('tier, stripe_subscription_status, billing_user_id').eq(idCol, entityId).single(),
      fetch('/api/stripe/prices'),
    ]);

    if (entityData) setEntity(entityData);

    if (plansRes.ok) {
      const { plans: allPlans } = await plansRes.json();
      // Filter to entity type
      const filtered = (allPlans as Plan[]).filter((p) =>
        p.name.toLowerCase().includes(entityType)
      );
      setPlans(filtered);
    }
    setLoading(false);
  }, [entityId, entityType]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCheckout = async (priceId: string) => {
    if (!isOwner) { setError(t('billingOwnerOnly')); return; }
    setCheckingOut(priceId);
    setError('');
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId, priceId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || t('billingCheckoutError'));
      }
    } catch {
      setError(t('billingCheckoutError'));
    }
    setCheckingOut(null);
  };

  const handlePortal = async () => {
    if (!isOwner) { setError(t('billingOwnerOnly')); return; }
    setPortaling(true);
    setError('');
    try {
      const res = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });
      const data = await res.json();
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || t('billingCheckoutError'));
      }
    } catch {
      setError(t('billingCheckoutError'));
    }
    setPortaling(false);
  };

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const currentTier = entity?.tier ?? 0;
  const subStatus = entity?.stripe_subscription_status;

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('billingTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('billingDescription')}</p>
      </FadeUp>

      {successMsg && (
        <FadeUp>
          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3 text-xs text-emerald-400">{successMsg}</div>
        </FadeUp>
      )}
      {wasCanceled && !successMsg && (
        <FadeUp>
          <div className="bg-zinc-400/10 border border-zinc-400/20 rounded-xl px-4 py-3 text-xs text-[var(--muted-foreground)]">Checkout was canceled. No changes were made.</div>
        </FadeUp>
      )}
      {error && (
        <FadeUp>
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-xs text-red-400">{error}</div>
        </FadeUp>
      )}

      {/* Current plan */}
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">{t('currentPlan')}</p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className={`text-2xl font-bold ${TIER_COLORS[currentTier]}`}>
                {TIER_NAMES[currentTier] ?? 'Free'}
              </p>
              {subStatus && (
                <p className="text-xs text-[var(--muted-foreground)] mt-1 capitalize">{subStatus}</p>
              )}
            </div>
            {currentTier >= 2 && isOwner && (
              <button
                onClick={handlePortal}
                disabled={portaling}
                className="px-5 py-2.5 rounded-xl border border-[var(--border)] text-sm font-semibold hover:bg-[var(--muted)] transition-colors disabled:opacity-40"
              >
                {portaling ? '...' : t('manageSubscription')}
              </button>
            )}
          </div>
          {!isOwner && (
            <p className="text-xs text-[var(--muted-foreground)] mt-3">{t('billingOwnerOnly')}</p>
          )}
        </div>
      </FadeUp>

      {/* Upgrade options — only show if not at max tier and user is owner */}
      {currentTier < 3 && isOwner && plans.length > 0 && (
        <FadeUp>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">{t('upgradePlan')}</p>
              {/* Billing cycle toggle */}
              <div className="flex items-center gap-1 bg-[var(--muted)] rounded-full p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'}`}
                >
                  {t('billingMonthly')}
                </button>
                <button
                  onClick={() => setBillingCycle('yearly')}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${billingCycle === 'yearly' ? 'bg-[var(--background)] text-[var(--foreground)] shadow-sm' : 'text-[var(--muted-foreground)]'}`}
                >
                  {t('billingYearly')}
                  <span className="ml-1 text-emerald-400 text-[10px]">{t('billingYearlySave')}</span>
                </button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {plans
                .filter((p) => (PRODUCT_TIER[p.name] ?? 0) > currentTier)
                .sort((a, b) => (PRODUCT_TIER[a.name] ?? 0) - (PRODUCT_TIER[b.name] ?? 0))
                .map((plan) => {
                  const price = billingCycle === 'monthly' ? plan.monthly : plan.yearly;
                  const planTier = PRODUCT_TIER[plan.name] ?? 2;
                  const isElite = planTier === 3;

                  return (
                    <div
                      key={plan.productId}
                      className={`bg-[var(--card)] border rounded-2xl p-6 flex flex-col gap-4 ${isElite ? 'border-purple-400/30' : 'border-[var(--border)]'}`}
                    >
                      <div>
                        <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${isElite ? 'text-purple-400' : 'text-amber-400'}`}>
                          {isElite ? t('planElite') : t('planPremium')}
                        </p>
                        <p className="text-2xl font-bold">
                          ${((price?.amount ?? 0) / 100).toFixed(2)}
                          <span className="text-sm font-normal text-[var(--muted-foreground)] ml-1">
                            {billingCycle === 'monthly' ? t('billingPerMonth') : t('billingPerYear')}
                          </span>
                        </p>
                        {plan.description && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-2 leading-relaxed">{plan.description}</p>
                        )}
                      </div>
                      <button
                        onClick={() => price && handleCheckout(price.priceId)}
                        disabled={!price || checkingOut === price?.priceId}
                        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-opacity disabled:opacity-30 ${isElite ? 'bg-purple-500 text-white hover:opacity-90' : 'bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90'}`}
                      >
                        {checkingOut === price?.priceId ? '...' : t('upgradePlan')}
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </FadeUp>
      )}
    </div>
  );
}
