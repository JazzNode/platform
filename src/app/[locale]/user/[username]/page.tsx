import { redirect, notFound } from 'next/navigation';
import { getProfileByUsername } from '@/lib/profile';

/**
 * Legacy route: /user/[username] → redirects to /u/[id]
 * Kept for backwards compatibility with existing shared links.
 */
export default async function LegacyUsernameRedirect({ params }: { params: Promise<{ locale: string; username: string }> }) {
  const { locale, username } = await params;
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  redirect(`/${locale}/u/${profile.id}`);
}
