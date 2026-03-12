'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useAdmin } from './AdminProvider';
import { useClaims } from './ClaimsProvider';
import { useTranslations } from 'next-intl';
import ClaimModal from './ClaimModal';

interface ClaimButtonProps {
  targetType: 'artist' | 'venue';
  targetId: string;
  targetName: string;
}

export default function ClaimButton({ targetType, targetId, targetName }: ClaimButtonProps) {
  const { user, setShowComingSoon } = useAuth();
  const { isAdmin } = useAdmin();
  const { getMyClaimStatus, isClaimed } = useClaims();
  const t = useTranslations('claim');
  const [showModal, setShowModal] = useState(false);

  const myStatus = user ? getMyClaimStatus(targetType, targetId) : null;
  const claimedByOther = isClaimed(targetType, targetId) && myStatus !== 'approved';

  // Already approved for this user — show "You manage this page"
  if (myStatus === 'approved') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide bg-gold/15 text-gold border border-gold/30">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {t('managedByYou')}
      </span>
    );
  }

  // Claimed by someone else — show verified badge
  if (claimedByOther) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide text-[#8A8578] border border-[var(--border)]">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {t('verified')}
      </span>
    );
  }

  // Pending claim by current user
  if (myStatus === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide text-amber-400/80 border border-amber-400/20 bg-amber-400/5">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
        {t('claimPending')}
      </span>
    );
  }

  // Rejected — allow re-submit
  // Default — show claim button
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user || !isAdmin) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setShowComingSoon({ x: rect.left + rect.width / 2, y: rect.top });
      return;
    }

    setShowModal(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 border border-[var(--border)] text-[#8A8578] hover:text-gold hover:border-gold/30"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </svg>
        {myStatus === 'rejected' ? t('claimAgain') : t('claimPage')}
      </button>

      {showModal && (
        <ClaimModal
          targetType={targetType}
          targetId={targetId}
          targetName={targetName}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}
