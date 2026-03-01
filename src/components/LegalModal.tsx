'use client';

import { useEffect, useCallback, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalModal({ isOpen, onClose }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // ESC to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div
        className={`fixed inset-0 z-[61] flex items-start justify-center transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
      >
        <div
          className={`w-full max-w-2xl mx-3 sm:mx-auto mt-4 sm:mt-[8vh] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden transition-all duration-300 ${
            isOpen ? 'translate-y-0 scale-100' : '-translate-y-4 scale-[0.98]'
          }`}
          style={{
            background: 'color-mix(in srgb, var(--background) 95%, transparent)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
            maxHeight: 'min(80vh, 700px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
            <h2 className="font-serif text-lg font-bold text-gold">
              Legal / 免責聲明
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--color-gold)]/10 transition-all duration-200"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-6 py-6 space-y-8" style={{ maxHeight: 'min(calc(80vh - 64px), 636px)' }}>

            {/* ── English ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">English</h3>

              <div className="space-y-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. Jazz is Spontaneous, and So Are Live Gigs</h4>
                  <p>Lineups shift and schedules change. We do our absolute best to curate accurate, cross-border info (sometimes using AI to bridge language gaps), but please double-check with the official venue or ticketing site before heading out. If a gig gets canceled or prices change, please don&#39;t shoot the messenger.</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. Out of Deep Respect for Creators</h4>
                  <p>The beautiful posters, venue photos, and promotional texts you see here belong entirely to their original creators, artists, or venues. We showcase them purely out of love for the music and to help pack your rooms with passionate listeners.</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. Your Music, Your Rules</h4>
                  <p>If you&#39;re an artist or venue owner and prefer not to be listed on our platform, or if you spot a mistake, just drop a note to{' '}
                    <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>
                    . We will update or remove your profile unconditionally within 24 hours. No questions asked.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-t border-gold/20" />

            {/* ── 繁體中文 ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">繁體中文</h3>

              <div className="space-y-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. 即興是爵士的靈魂，現場演出也是</h4>
                  <p>演出時間與陣容難免有臨時的變動。我們竭盡所能為您整理跨國界的現場資訊（部分外語內容藉由 AI 輔助翻譯以跨越語言隔閡），但在您出發前往場館前，請務必至官方售票連結再次確認。如果遇到演出取消或票價調整，請別怪罪我們這群熱心的傳聲筒。</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. 出於對創作者的絕對敬意</h4>
                  <p>平台上展示的活動海報、場館照片與官方介紹，版權皆完全歸屬於原創作者、場館或主辦單位。我們將這些美麗的視覺與文字放在這裡，純粹出於對爵士樂的熱愛，希望能為每一場現場演出帶來更多熱情的聽眾。</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. 你的音樂，你做主</h4>
                  <p>如果您是場館經營者或音樂家，不希望您的資訊出現在 JazzNode 上，或者發現我們哪裡寫錯了，請隨時發信至{' '}
                    <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>
                    。我們會在 24 小時內無條件為您修正或將資訊撤下，絕不囉嗦。
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-t border-gold/20" />

            {/* ── 日本語 ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">日本語</h3>

              <div className="space-y-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. ジャズの魂は即興にあり、ライブもまた然り</h4>
                  <p>出演者や時間は急に変更されることがあります。国境を越えた情報をお届けするため最善を尽くしていますが（一部の翻訳にはAIを活用しています）、お出かけの前に必ず会場や公式チケットサイトで最新情報をご確認ください。公演のキャンセルや料金の変更について、どうか私たちを責めないでくださいね。</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. クリエイターへの深い敬意</h4>
                  <p>掲載されている美しいポスター、会場の写真、紹介文の著作権は、すべて原作者、会場、または主催者に帰属します。私たちがこれらを使用するのは、純粋にジャズへの愛からであり、あなたのライブに一人でも多くのリスナーを呼ぶためです。</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. あなたの音楽、あなたのルール</h4>
                  <p>もしあなたがアーティストや会場の運営者で、JazzNodeへの掲載を希望されない場合、または情報の訂正が必要な場合は、{' '}
                    <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>
                    {' '}までご連絡ください。24時間以内に無条件で修正または削除いたします。
                  </p>
                </div>
              </div>
            </section>

          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
