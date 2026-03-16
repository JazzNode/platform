'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function LegalModal({ isOpen, onClose }: Props) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const locale = useLocale();
  const router = useRouter();

  const handleContactHQ = useCallback(() => {
    onClose();
    router.push(`/${locale}/profile/inbox?contactHQ=1`);
  }, [locale, router, onClose]);

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
        onClick={handleBackdropClick}
      >
        <div
          className={`relative w-full max-w-2xl mx-3 sm:mx-auto mt-4 sm:mt-[8vh] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden transition-all duration-300 ${
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
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--color-gold)]/10 transition-all duration-200"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-6 py-6 space-y-8" style={{ maxHeight: 'min(80vh, 700px)' }}>

            {/* ── English ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">Disclaimer</h3>

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
                  <p>If you&#39;re an artist or venue owner and prefer not to be listed on our platform, or if you spot a mistake, just{' '}
                    <button type="button" onClick={handleContactHQ} className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">contact us</button>
                    . We will update or remove your profile unconditionally within 24 hours. No questions asked.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-t border-gold/20" />

            {/* ── 繁體中文 ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">免責聲明</h3>

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
                  <p>如果您是場館經營者或音樂家，不希望您的資訊出現在 JazzNode 上，或者發現我們哪裡寫錯了，請隨時
                    <button type="button" onClick={handleContactHQ} className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">聯絡我們</button>
                    。我們會在 24 小時內無條件為您修正或將資訊撤下，絕不囉嗦。
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-t border-gold/20" />

            {/* ── 日本語 ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">免責事項</h3>

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
                  <p>もしあなたがアーティストや会場の運営者で、JazzNodeへの掲載を希望されない場合、または情報の訂正が必要な場合は、
                    <button type="button" onClick={handleContactHQ} className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">お問い合わせ</button>
                    ください。24時間以内に無条件で修正または削除いたします。
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-t border-gold/20" />

            {/* ── 한국어 ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">면책 조항</h3>

              <div className="space-y-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. 재즈는 즉흥이고, 라이브도 마찬가지입니다</h4>
                  <p>라인업은 바뀌고 일정은 변경됩니다. 저희는 국경을 넘어 정확한 정보를 전달하기 위해 최선을 다하고 있지만(일부 번역에는 AI를 활용하고 있습니다), 출발 전에 반드시 공식 공연장이나 티켓 사이트에서 다시 한번 확인해 주세요. 공연이 취소되거나 가격이 변동되더라도, 저희 탓은 하지 말아 주세요.</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. 창작자에 대한 깊은 존경</h4>
                  <p>이곳에 소개된 아름다운 포스터, 공연장 사진, 홍보 문구의 저작권은 전적으로 원작자, 아티스트 또는 공연장에 귀속됩니다. 저희는 순수하게 음악에 대한 사랑으로, 여러분의 공연장을 열정적인 관객들로 가득 채우기 위해 이를 소개하고 있습니다.</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. 당신의 음악, 당신의 규칙</h4>
                  <p>아티스트나 공연장 관계자로서 플랫폼에 게재되는 것을 원치 않으시거나, 잘못된 정보를 발견하셨다면{' '}
                    <button type="button" onClick={handleContactHQ} className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">문의하기</button>
                    를 통해 연락해 주세요. 24시간 이내에 무조건 수정하거나 삭제해 드립니다. 어떠한 질문도 하지 않겠습니다.
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-t border-gold/20" />

            {/* ── ภาษาไทย ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">ข้อจำกัดความรับผิดชอบ</h3>

              <div className="space-y-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. แจ๊สคือการด้นสด และการแสดงสดก็เช่นกัน</h4>
                  <p>ไลน์อัพอาจเปลี่ยนแปลงและตารางเวลาอาจปรับเปลี่ยนได้ เราพยายามอย่างเต็มที่ในการรวบรวมข้อมูลข้ามพรมแดนให้ถูกต้อง (บางครั้งใช้ AI ช่วยแปลเพื่อเชื่อมช่องว่างทางภาษา) แต่กรุณาตรวจสอบกับสถานที่จัดงานหรือเว็บไซต์จำหน่ายบัตรอย่างเป็นทางการอีกครั้งก่อนออกเดินทาง หากการแสดงถูกยกเลิกหรือราคาเปลี่ยนแปลง กรุณาอย่าโทษผู้ส่งสาร</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. ด้วยความเคารพอย่างสูงต่อผู้สร้างสรรค์</h4>
                  <p>โปสเตอร์ที่สวยงาม ภาพถ่ายสถานที่ และข้อความประชาสัมพันธ์ที่คุณเห็นในที่นี้เป็นลิขสิทธิ์ของผู้สร้างสรรค์ ศิลปิน หรือสถานที่จัดงานทั้งหมด เรานำเสนอเนื้อหาเหล่านี้ด้วยความรักในดนตรี และเพื่อช่วยเติมเต็มห้องแสดงของคุณด้วยผู้ฟังที่หลงใหล</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. ดนตรีของคุณ กฎของคุณ</h4>
                  <p>หากคุณเป็นศิลปินหรือเจ้าของสถานที่และไม่ต้องการให้ข้อมูลปรากฏบนแพลตฟอร์มของเรา หรือพบข้อผิดพลาด เพียง
                    <button type="button" onClick={handleContactHQ} className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">ติดต่อเรา</button>
                    {' '}เราจะอัปเดตหรือลบโปรไฟล์ของคุณโดยไม่มีเงื่อนไขภายใน 24 ชั่วโมง ไม่ถามคำถามใดๆ
                  </p>
                </div>
              </div>
            </section>

            {/* Divider */}
            <hr className="border-t border-gold/20" />

            {/* ── Bahasa Indonesia ── */}
            <section>
              <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-4">Sanggahan</h3>

              <div className="space-y-4 text-sm leading-relaxed text-[var(--muted-foreground)]">
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">1. Jazz Itu Spontan, Begitu Juga Pertunjukan Langsung</h4>
                  <p>Lineup bisa berubah dan jadwal bisa bergeser. Kami berusaha semaksimal mungkin menyajikan informasi lintas negara yang akurat (terkadang menggunakan AI untuk menjembatani perbedaan bahasa), namun harap periksa kembali di situs resmi venue atau tiket sebelum berangkat. Jika pertunjukan dibatalkan atau harga berubah, tolong jangan salahkan sang pembawa pesan.</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">2. Penghormatan Mendalam untuk Para Kreator</h4>
                  <p>Poster-poster indah, foto venue, dan teks promosi yang Anda lihat di sini sepenuhnya milik kreator asli, artis, atau venue. Kami menampilkannya murni karena kecintaan kami pada musik dan untuk membantu mengisi ruangan Anda dengan pendengar yang penuh semangat.</p>
                </div>
                <div>
                  <h4 className="font-serif font-bold text-[var(--foreground)] mb-1">3. Musik Anda, Aturan Anda</h4>
                  <p>Jika Anda seorang artis atau pemilik venue dan tidak ingin ditampilkan di platform kami, atau jika Anda menemukan kesalahan, cukup{' '}
                    <button type="button" onClick={handleContactHQ} className="text-gold hover:text-[var(--color-gold-bright)] transition-colors underline underline-offset-2">hubungi kami</button>
                    . Kami akan memperbarui atau menghapus profil Anda tanpa syarat dalam 24 jam. Tanpa pertanyaan.
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
