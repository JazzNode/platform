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
    // Replace the locale segment in the path
    const segments = pathname.split('/');
    segments[1] = newLocale;
    router.push(segments.join('/'));
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href={`/${locale}`} className="text-xl font-bold tracking-tight">
          🎵 {t('siteName')}
        </Link>

        <nav className="flex items-center gap-6">
          <Link href={`/${locale}/venues`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('venues')}
          </Link>
          <Link href={`/${locale}/artists`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('artists')}
          </Link>
          <Link href={`/${locale}/events`} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('events')}
          </Link>

          <div className="flex items-center gap-1 ml-4">
            {localeList.map((l) => (
              <button
                key={l}
                onClick={() => switchLocale(l)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  locale === l
                    ? 'bg-foreground text-background font-bold'
                    : 'text-muted-foreground hover:text-foreground'
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
