'use client';

import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';

const localeLabels: Record<string, string> = { en: 'EN', zh: '中', ja: '日' };
const localeList = ['en', 'zh', 'ja'] as const;

export default function Header() {
  const t = useTranslations('common');
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();

  function switchLocale(newLocale: string) {
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }

  return (
    <header className="sticky top-0 z-50 border-b border-[rgba(240,237,230,0.06)] bg-[#0A0A0A]/95 backdrop-blur supports-[backdrop-filter]:bg-[#0A0A0A]/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        <Link href={`/${locale}`} className="font-serif text-2xl font-bold tracking-tight text-gold">
          JazzNode
        </Link>

        <nav className="flex items-center gap-8">
          <Link href={`/${locale}/events`} className="text-sm uppercase tracking-widest text-[#8A8578] hover:text-[#F0EDE6] transition-colors duration-300">
            {t('events')}
          </Link>
          <Link href={`/${locale}/venues`} className="text-sm uppercase tracking-widest text-[#8A8578] hover:text-[#F0EDE6] transition-colors duration-300">
            {t('venues')}
          </Link>
          <Link href={`/${locale}/artists`} className="text-sm uppercase tracking-widest text-[#8A8578] hover:text-[#F0EDE6] transition-colors duration-300">
            {t('artists')}
          </Link>

          <div className="flex items-center gap-1 ml-6 border-l border-[rgba(240,237,230,0.1)] pl-6">
            {localeList.map((l) => (
              <button
                key={l}
                onClick={() => switchLocale(l)}
                className={`px-2.5 py-1 text-xs tracking-wider rounded transition-all duration-300 ${
                  locale === l
                    ? 'bg-gold text-[#0A0A0A] font-bold'
                    : 'text-[#8A8578] hover:text-[#F0EDE6]'
                }`}
              >
                {localeLabels[l]}
              </button>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
