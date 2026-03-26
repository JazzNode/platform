'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useArtistShoutouts, type ShoutoutReply } from './ArtistShoutoutsProvider';
import { useTranslations, useLocale } from 'next-intl';
import Image from 'next/image';
import ImageLightbox from './ImageLightbox';

/* ── Translate button ── */

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

function RoleBadge({ role, artistName, venueName, t }: { role: string | null; artistName?: string | null; venueName?: string | null; t: (key: string) => string }) {
  if (!role) return null;
  const config: Record<string, { label: string; color: string }> = {
    venue_manager: { label: venueName || t('roleBadge.venue_manager'), color: 'bg-emerald-400/15 text-emerald-400 border-emerald-400/30' },
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
    label = locale === 'zh' ? '\u4ECA\u5929' : locale === 'ja' ? '\u4ECA\u65E5' : 'today';
  } else if (diffDays === 1) {
    label = locale === 'zh' ? '\u6628\u5929' : locale === 'ja' ? '\u6628\u65E5' : 'yesterday';
  } else if (diffDays < 7) {
    label = locale === 'zh' ? `${diffDays} \u5929\u524D` : locale === 'ja' ? `${diffDays}\u65E5\u524D` : `${diffDays}d ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    label = locale === 'zh' ? `${weeks} \u9031\u524D` : locale === 'ja' ? `${weeks}\u9031\u9593\u524D` : `${weeks}w ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    label = locale === 'zh' ? `${months} \u500B\u6708\u524D` : locale === 'ja' ? `${months}\u30F6\u6708\u524D` : `${months}mo ago`;
  }

  return <span className="text-xs text-[var(--muted-foreground)]">{label}</span>;
}

/* ── Tag emojis ── */

const TAG_EMOJIS: Record<string, string> = {
  great_musicianship: '\uD83C\uDFB5',
  amazing_live: '\uD83D\uDD25',
  great_collaborator: '\uD83E\uDD1D',
  creative: '\uD83D\uDCA1',
  great_teacher: '\uD83C\uDF93',
  inspiring: '\u2728',
  professional: '\uD83C\uDFAF',
  reliable: '\uD83D\uDCAA',
  beautiful_tone: '\uD83C\uDFB6',
};

/* ── Reply form ── */

function ReplyForm({ shoutoutId, onSubmit, onCancel, t }: {
  shoutoutId: string;
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

/* ── Pin button ── */

function PinButton({ isPinned, canPin, onToggle, t }: {
  isPinned: boolean;
  canPin: boolean;
  onToggle: () => void;
  t: (key: string) => string;
}) {
  if (!canPin && !isPinned) return null;

  return (
    <button
      onClick={onToggle}
      disabled={!canPin && !isPinned}
      className={`text-xs transition-colors ${
        isPinned
          ? 'text-gold hover:text-gold/70'
          : 'text-[var(--muted-foreground)] hover:text-gold'
      } disabled:opacity-40`}
      title={isPinned ? t('unpinShoutout') : canPin ? t('pinShoutout') : t('maxPinsReached')}
    >
      {isPinned ? t('unpinShoutout') : t('pinShoutout')}
    </button>
  );
}

/* ── Main list ── */

export default function ArtistShoutoutList({ isOwner }: { isOwner?: boolean }) {
  const { user } = useAuth();
  const { shoutouts, shoutoutCount, pinnedShoutouts, loading, submitReply, deleteReply, deleteShoutout, togglePin } = useArtistShoutouts();
  const t = useTranslations('shoutouts');
  const tReviews = useTranslations('reviews');
  const locale = useLocale();

  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8 text-sm text-[var(--muted-foreground)]">
        <div className="w-4 h-4 border-2 border-gold/30 border-t-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (shoutoutCount === 0) return null;

  const handleReply = async (shoutoutId: string, body: string) => {
    await submitReply(shoutoutId, body);
    setReplyingTo(null);
  };

  const handleDeleteShoutout = async (shoutoutId: string) => {
    await deleteShoutout(shoutoutId);
    setConfirmDelete(null);
  };

  const canPinMore = pinnedShoutouts.length < 3;

  return (
    <>
      {lightboxSrc && <ImageLightbox images={[lightboxSrc]} onClose={() => setLightboxSrc(null)} />}

      <div className="space-y-4 mt-6">
        {shoutouts.map((shoutout) => {
          const isOwn = user?.id === shoutout.user_id;
          const displayName = shoutout.is_anonymous
            ? tReviews('anonymousUser')
            : shoutout.profile?.display_name || tReviews('anonymousUser');

          return (
            <div
              key={shoutout.id}
              className={`bg-[var(--card)] rounded-xl border p-4 space-y-3 ${
                shoutout.is_pinned
                  ? 'border-l-4 border-l-gold/60 border-t-gold/20 border-r-gold/20 border-b-gold/20'
                  : isOwn ? 'border-gold/20' : 'border-[var(--border)]'
              }`}
            >
              {/* Pinned indicator */}
              {shoutout.is_pinned && (
                <div className="flex items-center gap-1.5 text-[10px] text-gold font-medium">
                  <span>\uD83D\uDCCC</span>
                  <span>{t('pinShoutout')}</span>
                </div>
              )}

              {/* Header */}
              <div className="flex items-center gap-2.5">
                {shoutout.is_anonymous || !shoutout.profile?.avatar_url ? (
                  <div className="w-7 h-7 rounded-full bg-[var(--border)] flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--muted-foreground)]">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </div>
                ) : (
                  <Image
                    src={shoutout.profile.avatar_url}
                    alt={displayName}
                    width={28}
                    height={28}
                    className="w-7 h-7 rounded-full object-cover"
                  />
                )}
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium truncate">{displayName}</span>
                  <RoleBadge
                    role={shoutout.sender_role}
                    artistName={shoutout.sender_artist?.display_name || shoutout.sender_artist?.name_local || shoutout.sender_artist?.name_en}
                    venueName={shoutout.sender_venue?.display_name || shoutout.sender_venue?.name_local || shoutout.sender_venue?.name_en}
                    t={tReviews}
                  />
                  {isOwn && (
                    <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full shrink-0">
                      {tReviews('you')}
                    </span>
                  )}
                </div>
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  {!isOwn && shoutout.text && (
                    <TranslateButton text={shoutout.text} locale={locale} />
                  )}
                  <RelativeTime dateStr={shoutout.created_at} locale={locale} />
                </div>
              </div>

              {/* Tags */}
              {shoutout.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {shoutout.tags.map((tag) => (
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
              {shoutout.text && (
                <p className="text-sm text-[#C4BFB5] leading-relaxed">{shoutout.text}</p>
              )}

              {/* Image */}
              {shoutout.image_url && (
                <button
                  type="button"
                  onClick={() => setLightboxSrc(shoutout.image_url!)}
                  className="block"
                >
                  <img
                    src={shoutout.image_url}
                    alt=""
                    className="max-w-[240px] max-h-[180px] rounded-lg object-cover border border-[var(--border)] hover:opacity-90 transition-opacity cursor-pointer"
                  />
                </button>
              )}

              {/* Actions row */}
              <div className="flex items-center gap-3 text-xs">
                {user && (
                  <button
                    onClick={() => setReplyingTo(replyingTo === shoutout.id ? null : shoutout.id)}
                    className="text-[var(--muted-foreground)] hover:text-gold transition-colors"
                  >
                    {tReviews('reply')}
                  </button>
                )}
                {isOwner && (
                  <PinButton
                    isPinned={shoutout.is_pinned}
                    canPin={canPinMore}
                    onToggle={() => togglePin(shoutout.id)}
                    t={t}
                  />
                )}
                {isOwn && confirmDelete !== shoutout.id && (
                  <button
                    onClick={() => setConfirmDelete(shoutout.id)}
                    className="text-red-400/60 hover:text-red-400 transition-colors"
                  >
                    {t('deleteShoutout')}
                  </button>
                )}
                {isOwn && confirmDelete === shoutout.id && (
                  <div className="flex items-center gap-2">
                    <span className="text-red-400">{tReviews('deleteConfirm')}</span>
                    <button onClick={() => handleDeleteShoutout(shoutout.id)} className="text-red-400 font-medium hover:text-red-300">
                      {tReviews('confirmYes')}
                    </button>
                    <button onClick={() => setConfirmDelete(null)} className="text-[var(--muted-foreground)] hover:text-white">
                      {tReviews('cancel')}
                    </button>
                  </div>
                )}
              </div>

              {/* Reply form */}
              {replyingTo === shoutout.id && (
                <ReplyForm
                  shoutoutId={shoutout.id}
                  onSubmit={(body) => handleReply(shoutout.id, body)}
                  onCancel={() => setReplyingTo(null)}
                  t={tReviews}
                />
              )}

              {/* Replies */}
              {shoutout.replies.length > 0 && (
                <div className="ml-6 border-l-2 border-[var(--border)] pl-4 space-y-3">
                  {shoutout.replies.map((reply) => {
                    const isOwnReply = user?.id === reply.user_id;
                    const replyName = reply.profile?.display_name || tReviews('anonymousUser');

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
                          <RoleBadge role={reply.sender_role} t={tReviews} />
                          {isOwnReply && (
                            <span className="text-[10px] text-gold bg-gold/10 px-1.5 py-0.5 rounded-full">
                              {tReviews('you')}
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
                            onClick={() => deleteReply(reply.id, shoutout.id)}
                            className="text-[10px] text-red-400/50 hover:text-red-400 transition-colors"
                          >
                            {t('deleteShoutout')}
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
