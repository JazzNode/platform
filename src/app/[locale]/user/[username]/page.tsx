import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getProfileByUsername } from '@/lib/profile';
import PublicProfileContent from '@/components/PublicProfileContent';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  return {
    title: profile?.display_name || `@${username}`,
    robots: { index: false, follow: false },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string; username: string }> }) {
  const { locale, username } = await params;
  const t = await getTranslations('profile');
  const tInst = await getTranslations('instruments');
  const profile = await getProfileByUsername(username);

  if (!profile) {
    notFound();
  }

  return (
    <PublicProfileContent
      profile={profile}
      locale={locale}
      t={(key, values) => values ? (t as Function)(key, values) : t(key as never)}
      tInst={(key) => tInst(key as never)}
    />
  );
}
