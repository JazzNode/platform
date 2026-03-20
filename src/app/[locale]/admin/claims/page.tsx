'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/components/AdminProvider';
import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

interface ClaimProfile {
  id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  role: string;
}

interface Claim {
  id: string;
  claim_id: string;
  user_id: string | null;
  target_type: 'artist' | 'venue';
  target_id: string;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'revoked';
  evidence_text: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  rejection_reason: string | null;
  user_profile: ClaimProfile | null;
}

type TabFilter = 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'revoked' | 'all';

export default function AdminClaimsPage() {
  const { isAdmin, token, getFreshToken, handleUnauthorized } = useAdmin();
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('claim');
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [tab, setTab] = useState<TabFilter>('pending');

  // Redirect if not admin (wait for auth to finish loading first)
  useEffect(() => {
    if (!authLoading && !isAdmin) router.push('/');
  }, [authLoading, isAdmin, router]);

  const fetchClaims = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/claims', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.claims) setClaims(data.claims);
    } catch (err) {
      console.error('Failed to fetch claims:', err);
    }
    setLoading(false);
  }, [token]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchClaims(); }, [fetchClaims]);

  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [revokeReason, setRevokeReason] = useState('');

  const handleAction = async (claimId: string, action: 'approve' | 'reject' | 'revoke', rejectionReason?: string) => {
    setActionLoading(claimId);

    try {
      // Always get a fresh token to avoid stale/expired token failures
      const freshToken = await getFreshToken();
      if (!freshToken) {
        handleUnauthorized();
        setActionLoading(null);
        return;
      }

      const res = await fetch('/api/admin/claims', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${freshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ claimId, action, rejectionReason }),
      });

      if (res.ok) {
        // Update local state
        const newStatus = action === 'approve' ? 'approved' : action === 'revoke' ? 'revoked' : 'rejected';
        setClaims((prev) =>
          prev.map((c) =>
            c.claim_id === claimId
              ? { ...c, status: newStatus as Claim['status'], reviewed_at: new Date().toISOString(), rejection_reason: rejectionReason || null }
              : c,
          ),
        );
        setRejectingId(null);
        setRejectReason('');
        setRevokingId(null);
        setRevokeReason('');
      } else if (res.status === 401) {
        handleUnauthorized();
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Action failed: ${data.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Action failed:', err);
      alert('Network error — please try again.');
    }
    setActionLoading(null);
  };

  const filtered = tab === 'all' ? claims : claims.filter((c) => c.status === tab);
  const pendingCount = claims.filter((c) => c.status === 'pending').length;

  if (authLoading || !isAdmin) return null;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="font-serif text-3xl font-bold">{t('adminTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('adminDescription')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-[var(--border)] pb-px">
        {(['pending', 'approved', 'rejected', 'withdrawn', 'revoked', 'all'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setTab(f)}
            className={`px-4 py-2 text-sm font-medium tracking-wide transition-colors relative ${
              tab === f
                ? 'text-gold'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {f === 'pending' ? t('statusPending') : f === 'approved' ? t('statusApproved') : f === 'rejected' ? t('statusRejected') : f === 'withdrawn' ? t('statusWithdrawn') : f === 'revoked' ? t('statusRevoked') : t('statusAll')}
            {f === 'pending' && pendingCount > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center w-5 h-5 rounded-full bg-gold text-[#0A0A0A] text-xs font-bold">
                {pendingCount}
              </span>
            )}
            {tab === f && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Claims list */}
      {loading ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted-foreground)]">{t('noClaims')}</div>
      ) : (
        <div className="space-y-4">
          {filtered.map((claim) => (
            <div
              key={claim.id}
              className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  {claim.user_profile?.avatar_url ? (
                    <img
                      src={claim.user_profile.avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover border border-[var(--border)]"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center text-sm text-[var(--muted-foreground)]">
                      ?
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-sm">
                      {claim.user_profile?.display_name || claim.user_profile?.username || 'Unknown'}
                    </p>
                    {claim.user_profile?.username && (
                      <p className="text-xs text-[var(--muted-foreground)]">@{claim.user_profile.username}</p>
                    )}
                  </div>
                </div>

                {/* Status badge */}
                <span className={`text-xs px-2.5 py-1 rounded-lg font-medium ${
                  claim.status === 'pending' ? 'bg-amber-400/10 text-amber-400 border border-amber-400/20' :
                  claim.status === 'approved' ? 'bg-green-400/10 text-green-400 border border-green-400/20' :
                  claim.status === 'withdrawn' ? 'bg-gray-400/10 text-gray-400 border border-gray-400/20' :
                  claim.status === 'revoked' ? 'bg-orange-400/10 text-orange-400 border border-orange-400/20' :
                  'bg-red-400/10 text-red-400 border border-red-400/20'
                }`}>
                  {claim.status === 'pending' ? t('statusPending') : claim.status === 'approved' ? t('statusApproved') : claim.status === 'withdrawn' ? t('statusWithdrawn') : claim.status === 'revoked' ? t('statusRevoked') : t('statusRejected')}
                </span>
              </div>

              {/* Target */}
              <div className="text-sm">
                <span className="text-[var(--muted-foreground)]">{t('claimTarget')}: </span>
                <Link
                  href={`/${claim.target_type === 'artist' ? 'artists' : 'venues'}/${claim.target_id}`}
                  className="text-gold hover:underline"
                >
                  {claim.target_id}
                </Link>
                <span className="text-[#6A6560] ml-2">({claim.target_type})</span>
              </div>

              {/* Evidence */}
              {claim.evidence_text && (
                <div className="text-sm bg-[var(--background)] rounded-xl p-4 border border-[var(--border)]">
                  <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] mb-2">{t('claimEvidence')}</p>
                  <p className="text-[#C4BFB3] whitespace-pre-line">{claim.evidence_text}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="text-xs text-[#6A6560]">
                {t('submittedAt')}: {new Date(claim.submitted_at).toLocaleString()}
                {claim.reviewed_at && (
                  <span className="ml-4">{t('reviewedAt')}: {new Date(claim.reviewed_at).toLocaleString()}</span>
                )}
              </div>

              {/* Rejection / revocation reason */}
              {(claim.status === 'rejected' || claim.status === 'revoked') && claim.rejection_reason && (
                <div className={`text-sm ${claim.status === 'revoked' ? 'text-orange-400/80' : 'text-red-400/80'}`}>
                  <span className="font-medium">{t('rejectionReason')}:</span> {claim.rejection_reason}
                </div>
              )}

              {/* Revoke button (approved only) */}
              {claim.status === 'approved' && (
                <div className="flex gap-3 pt-2">
                  {revokingId === claim.claim_id ? (
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={revokeReason}
                        onChange={(e) => setRevokeReason(e.target.value)}
                        placeholder={t('revokeReasonPlaceholder')}
                        className="w-full h-20 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[#6A6560] focus:outline-none focus:border-orange-400/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(claim.claim_id, 'revoke', revokeReason)}
                          disabled={actionLoading === claim.claim_id}
                          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-orange-500/20 text-orange-400 border border-orange-400/30 hover:bg-orange-500/30 transition-colors disabled:opacity-40"
                        >
                          {t('confirmRevoke')}
                        </button>
                        <button
                          onClick={() => { setRevokingId(null); setRevokeReason(''); }}
                          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)] transition-colors"
                        >
                          {t('cancelAction')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRevokingId(claim.claim_id)}
                      disabled={actionLoading === claim.claim_id}
                      className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-orange-400 border border-orange-400/30 hover:bg-orange-500/10 transition-colors disabled:opacity-40"
                    >
                      {t('revoke')}
                    </button>
                  )}
                </div>
              )}

              {/* Action buttons (pending only) */}
              {claim.status === 'pending' && (
                <div className="flex gap-3 pt-2">
                  {rejectingId === claim.claim_id ? (
                    <div className="flex-1 space-y-2">
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder={t('rejectionReasonPlaceholder')}
                        className="w-full h-20 px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[#6A6560] focus:outline-none focus:border-red-400/50 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAction(claim.claim_id, 'reject', rejectReason)}
                          disabled={actionLoading === claim.claim_id}
                          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30 transition-colors disabled:opacity-40"
                        >
                          {t('confirmReject')}
                        </button>
                        <button
                          onClick={() => { setRejectingId(null); setRejectReason(''); }}
                          className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)] transition-colors"
                        >
                          {t('cancelAction')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => handleAction(claim.claim_id, 'approve')}
                        disabled={actionLoading === claim.claim_id}
                        className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-gold text-[#0A0A0A] hover:bg-gold-bright transition-colors disabled:opacity-40"
                      >
                        {actionLoading === claim.claim_id ? '...' : t('approve')}
                      </button>
                      <button
                        onClick={() => setRejectingId(claim.claim_id)}
                        disabled={actionLoading === claim.claim_id}
                        className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 border border-red-400/30 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      >
                        {t('reject')}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
