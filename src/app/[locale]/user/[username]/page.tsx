import { getTranslations } from 'next-intl/server';
import Image from 'next/image';
import { getProfileByUsername } from '@/lib/profile';
import FadeUp from '@/components/animations/FadeUp';

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await getProfileByUsername(username);
  return {
    title: profile?.display_name || `@${username}`,
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ locale: string; username: string }> }) {
  const { locale, username } = await params;
  const t = await getTranslations('profile');
  const profile = await getProfileByUsername(username);

  if (!profile) {
    return (
      <div className="py-24 text-center">
        <p className="text-[#8A8578]">{t('notFound')}</p>
      </div>
    );
  }

  const memberSince = new Date(profile.created_at).toLocaleDateString(
    locale === 'zh' ? 'zh-TW' : locale === 'ja' ? 'ja-JP' : locale === 'ko' ? 'ko-KR' : 'en-US',
    { year: 'numeric', month: 'long' },
  );

  return (
    <div className="space-y-12">
      {/* ═══ Profile Header — mirrors artist detail layout ═══ */}
      <FadeUp>
        <div className="flex flex-col md:flex-row gap-10 items-start">
          {/* Avatar */}
          <div className="w-48 h-48 rounded-2xl overflow-hidden shrink-0 border border-[var(--border)]">
            {profile.avatar_url ? (
              <Image
                src={profile.avatar_url}
                alt={profile.display_name || username}
                width={192}
                height={192}
                className="object-cover w-full h-full"
                sizes="192px"
              />
            ) : (
              <div className="w-full h-full bg-[var(--card)] flex items-center justify-center text-6xl text-[var(--muted-foreground)]">
                {(profile.display_name || username).charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-5">
            {/* Name */}
            <h1 className="font-serif text-4xl sm:text-5xl font-bold">
              {profile.display_name || `@${username}`}
            </h1>
            {profile.display_name && (
              <p className="text-xl text-[#8A8578]">@{username}</p>
            )}

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              <span className="text-xs uppercase tracking-widest px-3 py-1.5 rounded-xl border border-[rgba(240,237,230,0.1)] text-[#8A8578]">
                {t('memberSince', { date: memberSince })}
              </span>
            </div>

            {/* Bio */}
            {profile.bio && (
              <div className="border-t border-[var(--border)] pt-5">
                <p className="text-[#C4BFB3] leading-relaxed whitespace-pre-line">{profile.bio}</p>
              </div>
            )}

            {/* Website */}
            {profile.website && (
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-[#8A8578]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M2 12h20" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
                <a
                  href={profile.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-[var(--color-gold)] hover:text-[var(--color-gold-bright)] transition-colors link-lift"
                >
                  {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                </a>
              </div>
            )}
          </div>
        </div>
      </FadeUp>
    </div>
  );
}
