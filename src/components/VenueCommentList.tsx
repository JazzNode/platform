'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useVenueComments, type CommentReply } from './VenueCommentsProvider';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import ImageLightbox from './ImageLightbox';
import { createClient } from '@/utils/supabase/client';

/* ── Translate button (reused from inbox pattern) ── */

function TranslateButton({ text, locale }: { text: string; locale: string }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleTranslate = async () => {
    if (translated) { setShow(!show); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/translate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale: locale }),
      });
      const data = await res.json();
      if (data.translated) { setTranslated(data.translated); setShow(true); }
    } catch { /* silent */ }
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleTranslate} disabled={loading}
        className="text-[var(--muted-foreground)]/50 hover:text-emerald-400 transition-colors disabled:opacity-30" title="Translate">
        {loading ? (
          <div className="w-3.5 h-3.5 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        )}
      </button>
      {show && translated && <p className="text-xs text-[var(--muted-foreground)]/60 mt-1 italic">{translated}</p>}
    </div>
  );
}

/* ── Role badge ── */

function RoleBadge({ role, artistName, t }: { role: string | null; artistName?: string | null; t: (key: string) => string }) {
  if (!role) return null;
  const config: Record<string, { label: string; color: string }> = {
    venue_manager: { label: t('roleBadge.venue_manager'), color: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' },
    artist: { label: artistName || t('roleBadge.artist'), color: 'bg-purple-400/15 text-purple-400 border-purple-400/30' },
    admin: { label: t('roleBadge.admin'), color: 'bg-gold/15 text-gold border-gold/30' },
  };
  const c = config[role];
  if (!c) return null;
  return (
    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${c.color}`}>
      {c.label}
    </span>
  );
}

/* ── Relative time ── */

function RelativeTime({ dateStr, locale }: { dateStr: string; locale: string }) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  let label: string;
  if (diffDays === 0) {
    label = locale === 'zh' ? '今天' : locale === 'ja' ? '今日' : 'today';
  } else if (diffDays === 1) {
    label = locale === 'zh' ? '昨天' : locale === 'ja' ? '昨日' : 'yesterday';
  } else if (diffDays < 7) {
    label = locale === 'zh' ? `${diffDays} 天前` : locale === 'ja' ? `${diffDays}日前` : `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    label = locale === 'zh' ? `${weeks} 週前` : locale === 'ja' ? `${weeks}週間前` : `${weeks}w ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    label = locale === 'zh' ? `${months} 個月前` : locale === 'ja' ? `${months}ヶ月前` : `${months}mo ago`;
  }

  return <span className="text-xs text-[var(--muted-foreground)]">{label}</span>;
}

/* ── Tag chips display ── */

const TAG_EMOJIS: Record<string, string> = {
  great_show: '\uD83C\uDFB6',
  great_sound: '\uD83D\uDD0A',
  great_drinks: '\uD83C\uDF78',
  great_food: '\uD83C\uDF7D\uFE0F',
  easy_access: '\uD83D\uDE8B',
  easy_parking: '\uD83C\uDD7F\uFE0F',
  friendly_staff: '\uD83D\uDE0A',
  love_vibe: '\u2728',
};

/* ── Reply form ── */

function ReplyForm({ commentId, onSubmit, onCancel, t }: {
  commentId: string;
  onSubmit: (body: string) => Promise<void>;
  onCancel: () => void;
  t: ReturnType<typeof import('next-intl').useTranslations>;
}) {
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!body.trim()) return;
    setSending(true);
    await onSubmit(body.trim());
    setSending(false);
    setBody('');
  };

  return (
    <div className="flex gap-2 mt-2">
      <input
        value={body}
        onChange={(e) => setBody(e.target.value.slice(0, 500))}
        placeholder={t('replyPlaceholder')}
        className="flex-1 rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 text-sm focus:outline-none focus:border-gold/50 transition-colors placeholder:text-[var(--muted-foreground)]"
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
      />
      <button
        onClick={handleSubmit}
        disabled={sending || !body.trim()}
        className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gold text-[#1A1816] hover:bg-[#D4B85A] transition-all disabled:opacity-40"
      >
        {sending ? '...' : t('reply')}
      </button>
      <button
        onClick={onCancel}
        className="px-2 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-white transition-colors"
      >
        {t('cancel')}
      </button>
    </div>
  );
}

/* ── Report Modal ── */

const REPORT_REASONS = ['spam', 'harassment', 'misinformation', 'inappropriate', 'other'] as const;

function ReportModal({
  commentId,
  onClose,
  t,
}: {
  commentId: string;
  onClose: () => void;
  t: ReturnType<typeof import('next-intl').useTranslations>;
}) {
  const [reason, setReason] = useState<string>('');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<'success' | 'duplicate' | 'error' | null>(null);

  const handleSubmit = async () => {
    if (!reason || submitting) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setResult('error');
        setSubmitting(false);
        return;
      }

      const res = await fetch('/api/venue/comment-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ commentId, reason, details: details.trim() || undefined }),
      });

      if (res.status === 201) {
        setResult('success');
        setTimeout(onClose, 1500);
      } else if (res.status === 409) {
        setResult('duplicate');
        setTimeout(onClose, 1500);
      } else {
        setResult('error');
      }
    } catch {
      setResult('error');
    }
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 w-[90vw] max-w-sm space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold">{t('reportComment')}</h3>

        {result === 'success' ? (
          <p className="text-sm text-emerald-400">{t('reportSubmitted')}</p>
        ) : result === 'duplicate' ? (
          <p className="text-sm text-amber-400">{t('reportAlreadyReported')}</p>
        ) : result === 'error' ? (
          <p className="text-sm text-red-400">{t('reportError')}</p>
        ) : (
          <>
            {/* Reason radios */}
            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label key={r} className="flex items-center gap-2.5 cursor-pointer group">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-gold w-3.5 h-3.5"
                  />
                  <span className={`text-sm transition-colors ${reason === r ? 'text-[var(--foreground)]' : 'text-[var(--muted-foreground)] group-hover:text-[var(--foreground)]'}`}>
                    {t(`reportReason.${r}`)}
                  </span>
                </label>
              ))}
            </div>

            {/* Details */}
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value.slice(0, 500))}
              placeholder={t('reportDetailsPlaceholder')}
              rows={2}
              className="w-full rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-2 text-sm focus:outline-none focus:border-gold/50 transition-colors placeholder:text-[var(--muted-foreground)] resize-none"
            />
            <div className="text-[10px] text-[var(--muted-foreground)] text-right">{details.length}/500</div>

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-white transition-colors"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={!reason || submitting}
                className="px-4 py-1.5 rounded-lg text-xs font-medium bg-red-500/20 text-red-400 border border-red-400/30 hover:bg-red-500/30 transition-colors disabled:opacity-40"
              >
                {submitting ? '...' : t('reportSubmit')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── More menu (report dropdown) ── */

function MoreMenu({ commentId, onReport, t }: { commentId: string; onReport: () => void; t: (key: string) => string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="text-[var(--muted-foreground)]/50 hover:text-[var(--foreground)] transition-colors px-1"
        title="More"
      >
        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="12" cy="19" r="2" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-20 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg py-1 min-w-[140px]">
          <button
            onClick={() => { setOpen(false); onReport(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-400 hover:bg-red-400/10 transition-colors"
          >
            {t('reportComment')}
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Main list ── */

export default function VenueCommentList() {
  const { user } = useAuth();
  const { comments, commentCount, loading, submitReply, deleteReply, deleteComment } = useVenueComments();
  const t = useTranslations('reviews');
  const locale = useLocale();

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [reportingCommentId, setReportingCommentId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[var(--muted-foreground)]">
        <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (commentCount === 0) return null;

  const handleReply = async (commentId: string, body: string) => {
    await submitReply(commentId, body);
    setReplyingTo(null);
  };

  const handleDeleteComment = async (commentId: string) => {
    await deleteComment(commentId);
    setConfirmDelete(null);
  };

  return (
    <>
      {lightboxSrc && <ImageLightbox images={[lightboxSrc]} onClose={() => setLightboxSrc(null)} />}
      {reportingCommentId && (
        <ReportModal
          commentId={reportingCommentId}
          onClose={() => setReportingCommentId(null)}
          t={t}
        />
      )}

      <div className="space-y-4 mt-6">
        {comments.map((comment) => {
          const isOwn = user?.id === comment.user_id;
          const displayName = comment.is_anonymous
            ? t('anonymousUser')
            : comment.profile?.display_name || t('anonymousUser');

          return (
            <div
              key={comment.id}
              className={`bg-[var(--card)] rounded-xl border p-4 space-y-3 ${
                isOwn ? 'border-gold/20' : 'border-[var(--border)]'
              }`}
            >
              {/* Header */}
              <div className="flex items-center gap-2.5">
                {comment.is_anonymous || !comment.profile?.avatar_url ? (
                  <div className="w-7 h-7 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted-foreground)]">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                ) : (
                  <Image
                    src={comment.profile.avatar_url}
                    alt={displayName}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                )}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  <RoleBadge
                    role={comment.sender_role}
                    artistName={comment.sender_artist?.display_name || comment.sender_artist?.name_local || comment.sender_artist?.name_en}
                    t={t}
                  />
                  {isOwn && (
                    <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full shrink-0">
                      {t('you')}
                    </span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {/* Translate button for non-own comments */}
                  {!isOwn && comment.text && (
                    <TranslateButton text={comment.text} locale={locale} />
                  )}
                  <RelativeTime dateStr={comment.created_at} locale={locale} />
                </div>
              </div>

              {/* Tags */}
              {comment.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {comment.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-gold/10 text-gold/80 border border-gold/15"
                    >
                      <span>{TAG_EMOJIS[tag] || ''}</span>
                      <span>{t(`tags.${tag}`)}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Text */}
              {comment.text && (
                <p className="text-sm text-[#C4BFB5] leading-relaxed">{comment.text}</p>
              )}

              {/* Image */}
              {comment.image_url && (
                <button
                  type="button"
                  onClick={() => setLightboxSrc(comment.image_url!)}
                  className="block"
                >
                  <img
                    src={comment.image_url}
                    alt=""
                    className="max-w-[240px] max-h-[180px] rounded-lg object-cover border border-[var(--border)] hover:opacity-90 transition-opacity cursor-pointer"
                  />
                </button>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-3 text-xs">
                {user && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-[var(--muted-foreground)] hover:text-gold transition-colors"
                  >
                    {t('reply')}
                  </button>
                )}
                {isOwn && confirmDelete !== comment.id && (
                  <button
                    onClick={() => setConfirmDelete(comment.id)}
                    className="text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    {t('deleteComment')}
                  </button>
                )}
                {isOwn && confirmDelete === comment.id && (
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">{t('deleteConfirm')}</span>
                    <button onClick={() => handleDeleteComment(comment.id)} className="text-red-400 font-medium hover:text-red-300">
                      {t('confirmYes')}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[var(--muted-foreground)] hover:text-white">
                      {t('cancel')}
                    </button>
                  </div>
                )}
                {/* Report menu — only for logged-in users who are not the author */}
                {user && !isOwn && (
                  <div className="ml-auto">
                    <MoreMenu
                      commentId={comment.id}
                      onReport={() => setReportingCommentId(comment.id)}
                      t={t}
                    />
                  </div>
                )}
              </div>

              {/* Reply form */}
              {replyingTo === comment.id && (
                <ReplyForm
                  commentId={comment.id}
                  onSubmit={(body) => handleReply(comment.id, body)}
                  onCancel={() => setReplyingTo(null)}
                  t={t}
                />
              )}

              {/* Replies */}
              {comment.replies.length > 0 && (
                <div className="ml-6 border-l-2 border-[var(--border)] pl-4 space-y-3">
                  {comment.replies.map((reply) => {
                    const isOwnReply = user?.id === reply.user_id;
                    const replyName = reply.profile?.display_name || t('anonymousUser');

                    return (
                      <div key={reply.id} className="space-y-1">
                        <div className="flex items-center gap-2">
                          {reply.profile?.avatar_url ? (
                            <Image
                              src={reply.profile.avatar_url}
                              alt={replyName}
                              width={20}
                              height={20}
                              className="w-5 h-5 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-[var(--border)] flex items-center justify-center">
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted-foreground)]">
                                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                              </svg>
                            </div>
                          )}
                          <span className="text-xs font-medium">{replyName}</span>
                          <RoleBadge role={reply.sender_role} t={t} />
                          {isOwnReply && (
                            <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                              {t('you')}
                            </span>
                          )}
                          <div className="ml-auto flex items-center gap-2">
                            {!isOwnReply && (
                              <TranslateButton text={reply.body} locale={locale} />
                            )}
                            <RelativeTime dateStr={reply.created_at} locale={locale} />
                          </div>
                        </div>
                        <p className="text-sm text-[#C4BFB5] leading-relaxed">{reply.body}</p>
                        {isOwnReply && (
                          <button
                            onClick={() => deleteReply(reply.id, comment.id)}
                            className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
                          >
                            {t('deleteComment')}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
