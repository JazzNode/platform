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
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. Disclaimer of Liability</h4>
                  <p>Information on this platform (including dates, lineups, and ticket prices) is aggregated for reference purposes only and may include AI-assisted translations. Please verify all event details on the official venue or ticketing website. JazzNode is not responsible for any changes, cancellations, or ticketing discrepancies.</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. Copyright &amp; Intellectual Property</h4>
                  <p>All event posters, venue photographs, and original promotional texts are the property of their respective creators, venues, or organizers. They are used here under fair use solely for the purpose of promoting jazz music and events.</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. Content Takedown &amp; Opt-Out</h4>
                  <p>If you are a venue operator or performing artist and wish to have your information, images, or profiles removed or corrected, please contact us at{' '}
                    <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>
                    . We will process your request unconditionally within 24 hours.
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
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. 資訊準確性與免責聲明</h4>
                  <p>本平台整合之演出時間、陣容與票價等資訊僅供參考，且部分內容由 AI 輔助翻譯與摘要。所有活動詳情請一律以主辦單位或官方售票平台之最新公告為準。對於資訊變更、演出取消或購票衍生之爭議，JazzNode 概不負責。</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. 著作權宣告</h4>
                  <p>本網站所展示之活動海報、場地照片及部分官方介紹文字，其著作權均歸屬原創作者、場館或主辦單位所有。本平台僅基於推廣爵士樂與協助宣傳之目的進行合理使用。</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. 內容下架與資訊修正機制</h4>
                  <p>若您為場館營運方或演出藝人，不希望您的資訊、影像或演出資料刊登於本平台，或發現資訊有誤需要更正，請隨時來信至{' '}
                    <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>
                    ，我們將於 24 小時內為您無條件下架或修正。
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
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. 免責事項</h4>
                  <p>当プラットフォームに掲載されている公演日時、出演者、チケット料金などの情報は参考用であり、一部 AI による翻訳や要約が含まれています。最新の正確な情報は、必ず主催者または公式販売サイトにてご確認ください。情報の変更、公演の中止、チケット購入に関するトラブルについて、JazzNode は一切の責任を負いません。</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. 著作権について</h4>
                  <p>当サイトに掲載されているイベントポスター、会場の写真、および公式の紹介文の著作権は、原作者、会場、または主催者に帰属します。当プラットフォームでは、ジャズ音楽の普及およびイベントの広報支援を目的とした正当な範囲内でこれらを使用しています。</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. 削除・修正のリクエスト</h4>
                  <p>会場運営者または出演アーティストの方で、ご自身の情報、画像、プロフィールの掲載取り下げ、または情報の修正をご希望の場合は、{' '}
                    <a href="mailto:hello@jazznode.com" className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hello@jazznode.com</a>
                    {' '}までご連絡ください。24時間以内に無条件で対応いたします。
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
