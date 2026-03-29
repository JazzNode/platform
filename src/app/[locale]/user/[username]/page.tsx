import { notFound } from 'next/navigation';

/**
 * Legacy route: /user/[username]
 * Members no longer have custom slugs — all profiles use /u/[uuid].
 * This route always returns 404.
 */
export default function LegacyUsernameRedirect() {
  notFound();
}
