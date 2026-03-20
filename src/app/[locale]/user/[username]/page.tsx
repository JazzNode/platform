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

  // Profile is set to private (explicit false check — undefined means column not yet added, treat as public)
  if (profile.is_public === false) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="text-5xl">🔒</div>
        <h1 className="font-serif text-2xl font-bold">{t('privateProfile')}</h1>
        <p className="text-[#8A8578] text-sm">{t('privateProfileHint')}</p>
      </div>
    );
  }

  return (
    <PublicProfileContent
      profile={profile}
      locale={locale}
      t={(key, values) => values ? (t as (...args: unknown[]) => string)(key, values) : t(key as never)}
      tInst={(key) => tInst(key as never)}
    />
  );
}
