import { redirect } from 'next/navigation';

/**
 * Legacy route: /user/id/[id] → redirects to /u/[id]
 * Kept for backwards compatibility.
 */
export default async function LegacyUserIdRedirect({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  redirect(`/${locale}/u/${id}`);
}
