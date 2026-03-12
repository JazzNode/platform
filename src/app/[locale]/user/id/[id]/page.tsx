import { redirect } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getProfileById } from '@/lib/profile';
import PublicProfileContent from '@/components/PublicProfileContent';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileById(id);
  return {
    title: profile?.display_name || profile?.username || 'User',
  };
}

export default async function PublicProfileByIdPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = await getTranslations('profile');
  const tInst = await getTranslations('instruments');
  const profile = await getProfileById(id);

  if (!profile) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#8A8578]">{t('notFound')}</p>
      </div>
    );
  }

  // If user has a username, redirect to canonical URL
  if (profile.username) {
    redirect(`/${locale}/user/${profile.username}`);
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
