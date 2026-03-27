'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/components/AdminProvider';
import { useAuth } from '@/components/AuthProvider';
import { useTranslations } from 'next-intl';
import FadeUp from '@/components/animations/FadeUp';

/* ── Types ── */

interface ReportComment {
  id: string;
  text: string | null;
  venue_id: string;
  is_hidden: boolean;
  author: { display_name: string | null; avatar_url: string | null } | null;
}

interface Report {
  id: string;
  comment_id: string;
  reporter_id: string;
  reason: string;
  details: string | null;
  status: 'pending' | 'dismissed' | 'actioned';
  resolution_action: string | null;
  created_at: string;
  resolved_at: string | null;
  comment: ReportComment | null;
  reporter: { display_name: string | null; avatar_url: string | null } | null;
}

type StatusFilter = 'pending' | 'dismissed' | 'actioned';

/* ── Reason badge colors ── */

const REASON_COLORS: Record<string, string> = {
  spam: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  harassment: 'bg-red-400/10 text-red-400 border-red-400/20',
  misinformation: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
  inappropriate: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  other: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
};

/* ── Relative time ── */

function relativeTime(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return 'yesterday';
  if (diff < 7) return `${diff}d ago`;
  if (diff < 30) return `${Math.floor(diff / 7)}w ago`;
  return `${Math.floor(diff / 30)}mo ago`;
}

/* ── Main ── */

export default function AdminReportsPage() {
  const { isHQ, token, getFreshToken, handleUnauthorized, isModerator, isAdmin: isAdminRole } = useAdmin();
  const { loading: authLoading } = useAuth();
  const router = useRouter();
  const t = useTranslations('adminHQ');

  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusFilter>('pending');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const canAccess = isHQ && (isModerator || isAdminRole);

  // Redirect if no access
  useEffect(() => {
    if (!authLoading && !canAccess) router.push('/');
  }, [authLoading, canAccess, router]);

  // Show toast with auto-dismiss
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Fetch reports
  const fetchReports = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/comment-reports?status=${tab}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.reports) setReports(data.reports);
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    }
    setLoading(false);
  }, [token, tab]);

  useEffect(() => { fetchReports(); }, [fetchReports]);

  // Handle action
  const handleAction = async (reportId: string, action: 'dismissed' | 'hidden' | 'deleted') => {
    setActionLoading(reportId);
    try {
      const freshToken = await getFreshToken();
      if (!freshToken) {
        handleUnauthorized();
        setActionLoading(null);
        return;
      }

      const res = await fetch('/api/admin/comment-reports', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${freshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reportId, action }),
      });

      if (res.ok) {
        setReports((prev) => prev.filter((r) => r.id !== reportId));
        const labels: Record<string, string> = {
          dismissed: t('reportDismissed'),
          hidden: t('reportCommentHidden'),
          deleted: t('reportCommentDeleted'),
        };
        showToast(labels[action] || 'Done');
        setConfirmDeleteId(null);
      } else if (res.status === 401) {
        handleUnauthorized();
      } else {
        const data = await res.json().catch(() => ({ error: 'Unknown error' }));
        showToast(`Error: ${data.error || res.statusText}`);
      }
    } catch (err) {
      console.error('Action failed:', err);
      showToast('Network error');
    }
    setActionLoading(null);
  };

  if (authLoading || !canAccess) return null;

  return (
    <FadeUp>
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="font-serif text-3xl font-bold">{t('reportsTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('reportsDescription')}</p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 border-b border-[var(--border)] pb-px">
          {(['pending', 'dismissed', 'actioned'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setTab(s)}
              className={`px-4 py-2 text-sm font-medium tracking-wide transition-colors relative ${
                tab === s
                  ? 'text-gold'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {s === 'pending' ? t('reportStatusPending') : s === 'dismissed' ? t('reportStatusDismissed') : t('reportStatusActioned')}
              {tab === s && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gold rounded-full" />
              )}
            </button>
          ))}
        </div>

        {/* Reports list */}
        {loading ? (
          <div className="text-center py-12">
            <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-12 text-[var(--muted-foreground)]">
            {t('noReports')}
          </div>
        ) : (
          <div className="space-y-4">
            {reports.map((report) => (
              <div
                key={report.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4"
              >
                {/* Reporter + reason */}
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {report.reporter?.display_name || 'Unknown'}
                    </span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${REASON_COLORS[report.reason] || REASON_COLORS.other}`}>
                      {report.reason}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--muted-foreground)]">
                    {relativeTime(report.created_at)}
                  </span>
                </div>

                {/* Comment preview */}
                {report.comment && (
                  <div className="bg-[var(--background)] rounded-xl p-4 border border-[var(--border)] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-[var(--muted-foreground)]">{t('reportCommentBy')}</span>
                      <span className="text-xs font-medium">
                        {report.comment.author?.display_name || 'Unknown'}
                      </span>
                      {report.comment.is_hidden && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-orange-400/10 text-orange-400 border border-orange-400/20">
                          {t('reportHidden')}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[#C4BFB5] line-clamp-3">
                      {report.comment.text || '(no text)'}
                    </p>
                  </div>
                )}

                {/* Reporter details */}
                {report.details && (
                  <p className="text-xs text-[var(--muted-foreground)] italic">
                    &ldquo;{report.details}&rdquo;
                  </p>
                )}

                {/* Resolution info (for resolved reports) */}
                {report.resolution_action && (
                  <div className="text-xs text-[var(--muted-foreground)]">
                    {t('reportResolution')}: <span className="font-medium text-[var(--foreground)]">{report.resolution_action}</span>
                    {report.resolved_at && <span className="ml-2">({relativeTime(report.resolved_at)})</span>}
                  </div>
                )}

                {/* Action buttons (pending only) */}
                {tab === 'pending' && (
                  <div className="flex items-center gap-3 pt-2">
                    {confirmDeleteId === report.id ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-red-400">{t('reportDeleteConfirm')}</span>
                        <button
                          onClick={() => handleAction(report.id, 'deleted')}
                          disabled={actionLoading === report.id}
                          className="text-red-400 font-medium hover:text-red-300 disabled:opacity-40"
                        >
                          {t('reportConfirmYes')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="text-[var(--muted-foreground)] hover:text-white"
                        >
                          {t('reportConfirmCancel')}
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => handleAction(report.id, 'dismissed')}
                          disabled={actionLoading === report.id}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] border border-[var(--border)] hover:text-[var(--foreground)] hover:border-[var(--foreground)]/30 transition-colors disabled:opacity-40"
                        >
                          {actionLoading === report.id ? '...' : t('reportDismiss')}
                        </button>
                        <button
                          onClick={() => handleAction(report.id, 'hidden')}
                          disabled={actionLoading === report.id}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-orange-400 border border-orange-400/30 hover:bg-orange-500/10 transition-colors disabled:opacity-40"
                        >
                          {t('reportHideComment')}
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(report.id)}
                          disabled={actionLoading === report.id}
                          className="px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 border border-red-400/30 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                        >
                          {t('reportDeleteComment')}
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

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-3 text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
          {toast}
        </div>
      )}
    </FadeUp>
  );
}
