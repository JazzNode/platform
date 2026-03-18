'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';
import { useClaims } from './ClaimsProvider';
import ClaimModal from './ClaimModal';

interface ClaimButtonProps {
  targetType: 'artist' | 'venue';
  targetId: string;
  targetName: string;
}

export default function ClaimButton({ targetType, targetId, targetName }: ClaimButtonProps) {
  const { user, setShowAuthModal } = useAuth();
  const { getMyClaimStatus, isClaimed, cancelClaim } = useClaims();
  const t = useTranslations('claim');
  const locale = useLocale();
  const [showModal, setShowModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const handleCancel = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCancelling(true);
    await cancelClaim(targetType, targetId);
    setCancelling(false);
  }, [cancelClaim, targetType, targetId]);

  const myStatus = user ? getMyClaimStatus(targetType, targetId) : null;
  const entityIsClaimed = isClaimed(targetType, targetId);
  const claimedByOther = entityIsClaimed && myStatus !== 'approved';

  const dashboardPath = targetType === 'artist'
    ? `/${locale}/profile/artist/${targetId}`
    : `/${locale}/profile/venue/${targetId}`;

  // Already approved for this user — show "You manage this page" linking to dashboard
  if (myStatus === 'approved') {
    return (
      <Link
        href={dashboardPath}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide bg-gold/15 text-gold border border-gold/30 hover:bg-gold/25 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 6L9 17l-5-5" />
        </svg>
        {t('managedByYou')}
      </Link>
    );
  }

  // Claimed by someone else — show verified badge + "Also Claim" button
  if (claimedByOther && myStatus !== 'pending') {
    const handleAlsoClaim = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!user) {
        setShowAuthModal(true);
        return;
      }
      setShowModal(true);
    };

    return (
      <>
        <div className="inline-flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide text-[#8A8578] border border-[var(--border)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            {t('verified')}
          </span>
          <button
            onClick={handleAlsoClaim}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium tracking-wide transition-all duration-200 border border-[var(--border)] text-[#8A8578] hover:text-gold hover:border-gold/30"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
            {t('alsoClaim')}
          </button>
        </div>
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

  // Pending claim by current user — show status + cancel button
  if (myStatus === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-xl text-xs font-medium tracking-wide text-amber-400/80 border border-amber-400/20 bg-amber-400/5">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {t('claimPending')}
        </span>
        <button
          onClick={handleCancel}
          disabled={cancelling}
          className="inline-flex items-center gap-1 px-2 py-1.5 border-l border-amber-400/20 text-amber-400/50 hover:text-red-400 hover:bg-red-400/10 transition-colors rounded-r-xl disabled:opacity-50"
          title={t('cancelClaim')}
        >
          {cancelling ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="animate-spin">
              <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeDashoffset="12" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </button>
      </span>
    );
  }

  // Rejected — allow re-submit
  // Default — show claim button
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Not logged in — prompt login
      setShowAuthModal(true);
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
