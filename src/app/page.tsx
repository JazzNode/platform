import { routing } from '@/i18n/routing';
import { redirect } from 'next/navigation';

export default function RootPage() {
  // next-intl middleware handles Accept-Language detection and
  // redirects to the matched locale before this page is reached.
  // This fallback only fires if middleware somehow doesn't redirect.
  redirect(`/${routing.defaultLocale}`);
}
