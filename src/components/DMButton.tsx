'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';

interface DMButtonProps {
  targetUserId: string;
  className?: string;
}

export default function DMButton({ targetUserId, className }: DMButtonProps) {
  const { user, setShowAuthModal } = useAuth();
  const locale = useLocale();
  const router = useRouter();
  const t = useTranslations('profile');

  const handleDM = useCallback(async () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    if (user.id === targetUserId) return;

    const supabase = createClient();

    // Check if conversation already exists (either direction)
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'member_member')
      .or(`and(fan_user_id.eq.${user.id},user_b_id.eq.${targetUserId}),and(fan_user_id.eq.${targetUserId},user_b_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      router.push(`/${locale}/profile/inbox?tab=dm&convo=${existing.id}`);
      return;
    }

    // Create new conversation
    const { data: newConvo } = await supabase
      .from('conversations')
      .insert({ type: 'member_member', fan_user_id: user.id, user_b_id: targetUserId })
      .select('id')
      .single();

    if (newConvo) {
      router.push(`/${locale}/profile/inbox?tab=dm&convo=${newConvo.id}`);
    }
  }, [user, targetUserId, locale, router, setShowAuthModal]);

  return (
    <button
      onClick={handleDM}
      className={className || 'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-400 text-xs font-semibold hover:bg-emerald-400/20 transition-colors'}
    >
      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
      <span className="hidden sm:inline">{t('sendDM')}</span>
    </button>
  );
}
