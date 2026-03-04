import { defineRouting } from 'next-intl/routing';

export const routing = defineRouting({
  locales: ['en', 'zh', 'ja', 'ko', 'th', 'id'],
  defaultLocale: 'en',
  localeDetection: true,
});
