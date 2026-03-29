import { notFound } from 'next/navigation';
import { getTranslations } from 'next-intl/server';
import { getProfileById } from '@/lib/profile';
import PublicProfileContent from '@/components/PublicProfileContent';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfileById(id);
  const displayName = profile?.display_name || 'User';
  const ogParams = new URLSearchParams({ name: displayName });
  if (profile?.avatar_url) ogParams.set('avatar', profile.avatar_url);
  if (profile?.role) ogParams.set('role', profile.role);
  const ogUrl = `/api/og/member?${ogParams.toString()}`;
  return {
    title: displayName,
    ...(profile?.bio && { description: profile.bio.slice(0, 160) }),
    openGraph: { images: [{ url: ogUrl, width: 1200, height: 630 }] },
    twitter: { card: 'summary_large_image' },
    robots: { index: false, follow: false },
  };
}

export default async function MemberProfilePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const t = await getTranslations('profile');
  const tInst = await getTranslations('instruments');
  const profile = await getProfileById(id);

  if (!profile) {
    notFound();
  }

  // Profile is set to private
  if (profile.is_public === false) {
    return (
      <div className="py-24 text-center space-y-4">
        <div className="text-5xl">&#x1f512;</div>
        <h1 className="font-serif text-2xl font-bold">{t('privateProfile')}</h1>
        <p className="text-[var(--muted-foreground)] text-sm">{t('privateProfileHint')}</p>
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
