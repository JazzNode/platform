'use client';

import { useState, useEffect, useSyncExternalStore } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import Image from 'next/image';
import Link from 'next/link';
import FadeUp from '@/components/animations/FadeUp';

/* ── Types ── */

interface Reply {
  id: string;
  comment_id: string;
  user_id: string;
  sender_role: string | null;
  body: string;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
}

interface Comment {
  id: string;
  user_id: string;
  venue_id: string;
  venue_name?: string;
  text: string | null;
  tags: string[];
  image_url: string | null;
  is_anonymous: boolean;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  replies: Reply[];
}

/* ── Props ── */

export type DashboardCommentsMode = 'member' | 'venue' | 'artist' | 'admin';

interface DashboardCommentsTabProps {
  mode: DashboardCommentsMode;
  /** Required for venue mode */
  venueId?: string;
  /** Required for artist mode */
  artistId?: string;
}

/* ── Helpers ── */

const TAG_EMOJIS: Record<string, string> = {
  great_show: '\uD83C\uDFB6', great_sound: '\uD83D\uDD0A', great_drinks: '\uD83C\uDF78',
  great_food: '\uD83C\uDF7D\uFE0F', easy_access: '\uD83D\uDE8B', easy_parking: '\uD83C\uDD7F\uFE0F',
  friendly_staff: '\uD83D\uDE0A', love_vibe: '\u2728',
};

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
    <div className="inline-flex items-start">
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
      {show && translated && <p className="text-xs text-[var(--muted-foreground)]/60 ml-2 italic">{translated}</p>}
    </div>
  );
}

function RoleBadge({ role, t }: { role: string | null; t: (key: string) => string }) {
  if (!role) return null;
  const config: Record<string, { label: string; color: string }> = {
    venue_manager: { label: t('roleBadge.venue_manager'), color: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' },
    artist: { label: t('roleBadge.artist'), color: 'bg-purple-400/15 text-purple-400 border-purple-400/30' },
    admin: { label: t('roleBadge.admin'), color: 'bg-gold/15 text-gold border-gold/30' },
  };
  const c = config[role];
  if (!c) return null;
  return <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${c.color}`}>{c.label}</span>;
}

// React-pure way to read current time: subscribe to a clock that ticks every 60s
let currentNow = Date.now();
const clockListeners = new Set<() => void>();
if (typeof window !== 'undefined') {
  setInterval(() => {
    currentNow = Date.now();
    clockListeners.forEach((l) => l());
  }, 60_000);
}
function subscribeNow(cb: () => void) { clockListeners.add(cb); return () => { clockListeners.delete(cb); }; }
function getNow() { return currentNow; }
function getServerNow() { return Date.now(); }

function RelativeTime({ dateStr, locale }: { dateStr: string; locale: string }) {
  const now = useSyncExternalStore(subscribeNow, getNow, getServerNow);
  const d = new Date(dateStr);
  const diff = Math.floor((now - d.getTime()) / 86400000);
  let label: string;
  if (diff === 0) label = locale === 'zh' ? '今天' : locale === 'ja' ? '今日' : 'today';
  else if (diff === 1) label = locale === 'zh' ? '昨天' : locale === 'ja' ? '昨日' : 'yesterday';
  else if (diff < 7) label = locale === 'zh' ? `${diff} 天前` : locale === 'ja' ? `${diff}日前` : `${diff}d ago`;
  else if (diff < 30) { const w = Math.floor(diff / 7); label = locale === 'zh' ? `${w} 週前` : locale === 'ja' ? `${w}週間前` : `${w}w ago`; }
  else { const m = Math.floor(diff / 30); label = locale === 'zh' ? `${m} 個月前` : locale === 'ja' ? `${m}ヶ月前` : `${m}mo ago`; }
  return <span className="text-xs text-[var(--muted-foreground)]">{label}</span>;
}

function ImageLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <div className="relative max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="" className="max-w-full max-h-[90vh] rounded-xl object-contain" />
        <button onClick={onClose} className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors">
          &times;
        </button>
      </div>
    </div>
  );
}

/* ── Main Component ── */

export default function DashboardCommentsTab({ mode, venueId, artistId }: DashboardCommentsTabProps) {
  const t = useTranslations('reviews');
  const tDash = useTranslations('dashboardComments');
  const locale = useLocale();
  const { user } = useAuth();

  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'unreplied'>('all');

  const canReply = mode !== 'member';
  const showVenueLink = mode !== 'venue';

  // Fetch comments
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ mode });
        if (venueId) params.set('venueId', venueId);
        if (artistId) params.set('artistId', artistId);
        const res = await fetch(`/api/dashboard/comments?${params}`);
        const data = await res.json();
        if (!cancelled && data.comments) setComments(data.comments);
      } catch { /* silent */ }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [mode, venueId, artistId]);

  // Reply
  const handleReply = async (commentId: string) => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const comment = comments.find((c) => c.id === commentId);
      const res = await fetch('/api/venue/comment-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, venueId: comment?.venue_id || venueId, body: replyText.trim() }),
      });
      const data = await res.json();
      if (data.reply) {
        const newReply: Reply = {
          ...data.reply,
          profile: { display_name: user?.user_metadata?.full_name || null, avatar_url: user?.user_metadata?.avatar_url || null },
        };
        setComments((prev) =>
          prev.map((c) => c.id === commentId ? { ...c, replies: [...c.replies, newReply] } : c),
        );
        setReplyText('');
        setReplyingTo(null);
      }
    } catch { /* silent */ }
    setSending(false);
  };

  // Delete comment (own only)
  const handleDeleteComment = async (commentId: string) => {
    try {
      const res = await fetch('/api/venue/comment-reply', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId }),
      });
      if (res.ok) {
        setComments((prev) => prev.filter((c) => c.id !== commentId));
      }
    } catch { /* silent */ }
    setConfirmDelete(null);
  };

  // Delete reply (own only)
  const handleDeleteReply = async (replyId: string, commentId: string) => {
    try {
      const res = await fetch('/api/venue/comment-reply', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ replyId }),
      });
      if (res.ok) {
        setComments((prev) =>
          prev.map((c) => c.id === commentId ? { ...c, replies: c.replies.filter((r) => r.id !== replyId) } : c),
        );
      }
    } catch { /* silent */ }
  };

  // Filter
  const filteredComments = filter === 'unreplied'
    ? comments.filter((c) => c.replies.length === 0)
    : comments;

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <FadeUp>
      {lightboxSrc && <ImageLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}

      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">{tDash('title')}</h1>
            <span className="text-sm text-[var(--muted-foreground)]">
              {t('commentCount', { count: comments.length })}
            </span>
          </div>

          {/* Filter: only show for venue/artist/admin (managers who need to respond) */}
          {canReply && comments.length > 0 && (
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-full transition-colors ${filter === 'all' ? 'bg-gold/15 text-gold font-semibold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                {tDash('filterAll')}
              </button>
              <button
                onClick={() => setFilter('unreplied')}
                className={`px-2.5 py-1 rounded-full transition-colors ${filter === 'unreplied' ? 'bg-gold/15 text-gold font-semibold' : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}
              >
                {tDash('filterUnreplied')}
              </button>
            </div>
          )}
        </div>

        {/* Empty state */}
        {filteredComments.length === 0 && (
          <div className="text-center py-16 text-[var(--muted-foreground)]">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm">
              {filter === 'unreplied' ? tDash('noUnreplied') : tDash('noComments')}
            </p>
          </div>
        )}

        {/* Comment list */}
        {filteredComments.map((comment) => {
          const isOwn = user?.id === comment.user_id;
          const displayName = comment.is_anonymous
            ? t('anonymousUser')
            : comment.profile?.display_name || t('anonymousUser');

          return (
            <div
              key={comment.id}
              className={`bg-[var(--card)] rounded-xl border p-4 space-y-3 ${isOwn ? 'border-gold/20' : 'border-[var(--border)]'}`}
            >
              {/* Venue link (shown in member/artist/admin mode) */}
              {showVenueLink && comment.venue_name && (
                <Link
                  href={`/${locale}/venues/${comment.venue_id}`}
                  className="inline-flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)] hover:text-gold transition-colors mb-1"
                >
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                    <polyline points="9 22 9 12 15 12 15 22" />
                  </svg>
                  {comment.venue_name}
                </Link>
              )}

              {/* Header */}
              <div className="flex items-center gap-2.5">
                {comment.is_anonymous || !comment.profile?.avatar_url ? (
                  <div className="w-7 h-7 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted-foreground)]">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                ) : (
                  <Image src={comment.profile.avatar_url} alt={displayName} width={28} height={28} className="w-7 h-7 rounded-full object-cover" />
                )}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  {isOwn && (
                    <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full shrink-0">{t('you')}</span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {comment.text && <TranslateButton text={comment.text} locale={locale} />}
                  <RelativeTime dateStr={comment.created_at} locale={locale} />
                </div>
              </div>

              {/* Tags */}
              {comment.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {comment.tags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] bg-gold/10 text-gold/80 border border-gold/15">
                      <span>{TAG_EMOJIS[tag] || ''}</span>
                      <span>{t(`tags.${tag}`)}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Text */}
              {comment.text && <p className="text-sm text-[#C4BFB5] leading-relaxed">{comment.text}</p>}

              {/* Image */}
              {comment.image_url && (
                <button type="button" onClick={() => setLightboxSrc(comment.image_url!)} className="block">
                  <img src={comment.image_url} alt="" className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-[var(--border)] hover:opacity-90 transition-opacity cursor-pointer" />
                </button>
              )}

              {/* Actions */}
              <div className="flex items-center gap-3 text-xs">
                {canReply && user && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                    className="text-[var(--muted-foreground)] hover:text-gold transition-colors"
                  >
                    {t('reply')}
                  </button>
                )}
                {isOwn && confirmDelete !== comment.id && (
                  <button onClick={() => setConfirmDelete(comment.id)} className="text-red-400/60 hover:text-red-400 transition-colors">
                    {t('deleteComment')}
                  </button>
                )}
                {isOwn && confirmDelete === comment.id && (
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">{t('deleteConfirm')}</span>
                    <button onClick={() => handleDeleteComment(comment.id)} className="text-red-400 font-medium hover:text-red-300">{t('confirmYes')}</button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[var(--muted-foreground)] hover:text-white">{t('cancel')}</button>
                  </div>
                )}
              </div>

              {/* Reply form */}
              {replyingTo === comment.id && (
                <div className="flex gap-2">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value.slice(0, 500))}
                    placeholder={t('replyPlaceholder')}
                    className="flex-1 rounded-lg bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 text-sm focus:outline-none focus:border-gold/50 transition-colors placeholder:text-[var(--muted-foreground)]"
                    onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(comment.id); } }}
                  />
                  <button
                    onClick={() => handleReply(comment.id)}
                    disabled={sending || !replyText.trim()}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gold text-[#1A1816] hover:bg-[#D4B85A] transition-all disabled:opacity-40"
                  >
                    {sending ? '...' : t('reply')}
                  </button>
                  <button
                    onClick={() => { setReplyingTo(null); setReplyText(''); }}
                    className="px-2 py-1.5 rounded-lg text-xs text-[var(--muted-foreground)] hover:text-white transition-colors"
                  >
                    {t('cancel')}
                  </button>
                </div>
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
                            <Image src={reply.profile.avatar_url} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover" />
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
                            <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">{t('you')}</span>
                          )}
                          <div className="ml-auto flex items-center gap-2">
                            <TranslateButton text={reply.body} locale={locale} />
                            <RelativeTime dateStr={reply.created_at} locale={locale} />
                          </div>
                        </div>
                        <p className="text-sm text-[#C4BFB5] leading-relaxed">{reply.body}</p>
                        {isOwnReply && (
                          <button
                            onClick={() => handleDeleteReply(reply.id, comment.id)}
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
    </FadeUp>
  );
}
