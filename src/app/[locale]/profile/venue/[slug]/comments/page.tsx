'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import Image from 'next/image';
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
  text: string | null;
  tags: string[];
  image_url: string | null;
  is_anonymous: boolean;
  created_at: string;
  profile: { display_name: string | null; avatar_url: string | null } | null;
  replies: Reply[];
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

function RelativeTime({ dateStr, locale }: { dateStr: string; locale: string }) {
  const d = new Date(dateStr);
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  let label: string;
  if (diff === 0) label = locale === 'zh' ? '今天' : 'today';
  else if (diff === 1) label = locale === 'zh' ? '昨天' : 'yesterday';
  else if (diff < 7) label = locale === 'zh' ? `${diff} 天前` : `${diff}d ago`;
  else if (diff < 30) { const w = Math.floor(diff / 7); label = locale === 'zh' ? `${w} 週前` : `${w}w ago`; }
  else { const m = Math.floor(diff / 30); label = locale === 'zh' ? `${m} 個月前` : `${m}mo ago`; }
  return <span className="text-xs text-[var(--muted-foreground)]">{label}</span>;
}

/* ── Page ── */

export default function VenueCommentsManagementPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('reviews');
  const tDash = useTranslations('venueDashboard');
  const locale = useLocale();
  const { user } = useAuth();

  const [slug, setSlug] = useState('');
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  // Fetch comments
  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase
      .from('venue_comments')
      .select('id, user_id, text, tags, image_url, is_anonymous, created_at, profiles(display_name, avatar_url), venue_comment_replies(id, comment_id, user_id, sender_role, body, created_at, profiles(display_name, avatar_url))')
      .eq('venue_id', slug)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (data) {
          setComments(data.map((r: Record<string, unknown>) => ({
            id: r.id as string,
            user_id: r.user_id as string,
            text: r.text as string | null,
            tags: (r.tags as string[]) || [],
            image_url: r.image_url as string | null,
            is_anonymous: r.is_anonymous as boolean,
            created_at: r.created_at as string,
            profile: r.profiles as Comment['profile'],
            replies: ((r.venue_comment_replies as Record<string, unknown>[]) || []).map((rp) => ({
              id: rp.id as string,
              comment_id: rp.comment_id as string,
              user_id: rp.user_id as string,
              sender_role: rp.sender_role as string | null,
              body: rp.body as string,
              created_at: rp.created_at as string,
              profile: rp.profiles as Reply['profile'],
            })),
          })));
        }
        setLoading(false);
      });
  }, [slug]);

  const handleReply = async (commentId: string) => {
    if (!replyText.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/venue/comment-reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, venueId: slug, body: replyText.trim() }),
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

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="w-5 h-5 border-2 border-gold/30 border-t-gold rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <FadeUp>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{tDash('comments')}</h1>
          <span className="text-sm text-[var(--muted-foreground)]">
            {t('commentCount', { count: comments.length })}
          </span>
        </div>

        {comments.length === 0 && (
          <div className="text-center py-16 text-[var(--muted-foreground)]">
            <svg className="w-12 h-12 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <p className="text-sm">{t('noReviews')}</p>
          </div>
        )}

        {comments.map((comment) => {
          const displayName = comment.is_anonymous
            ? t('anonymousUser')
            : comment.profile?.display_name || t('anonymousUser');

          return (
            <div key={comment.id} className="bg-[var(--card)] rounded-xl border border-[var(--border)] p-4 space-y-3">
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
                <span className="text-sm font-medium">{displayName}</span>
                <div className="ml-auto flex items-center gap-2">
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
                <img src={comment.image_url} alt="" className="max-w-[200px] max-h-[150px] rounded-lg object-cover border border-[var(--border)]" />
              )}

              {/* Reply button */}
              <div>
                <button
                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                  className="text-xs text-[var(--muted-foreground)] hover:text-gold transition-colors"
                >
                  {t('reply')}
                </button>
              </div>

              {/* Reply form (venue manager) */}
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
                </div>
              )}

              {/* Existing replies */}
              {comment.replies.length > 0 && (
                <div className="ml-6 border-l-2 border-[var(--border)] pl-4 space-y-3">
                  {comment.replies.map((reply) => (
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
                        <span className="text-xs font-medium">{reply.profile?.display_name || t('anonymousUser')}</span>
                        <RoleBadge role={reply.sender_role} t={t} />
                        <div className="ml-auto flex items-center gap-2">
                          <TranslateButton text={reply.body} locale={locale} />
                          <RelativeTime dateStr={reply.created_at} locale={locale} />
                        </div>
                      </div>
                      <p className="text-sm text-[#C4BFB5]">{reply.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </FadeUp>
  );
}
