'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from './AuthProvider';
import ClaimModal from './ClaimModal';

interface UnclaimedNoticeProps {
  targetType: 'artist' | 'venue';
  targetId: string;
  targetName: string;
}

export default function UnclaimedNotice({ targetType, targetId, targetName }: UnclaimedNoticeProps) {
  const { user, setShowAuthModal } = useAuth();
  const t = useTranslations('common');
  const [showModal, setShowModal] = useState(false);

  const handleClick = () => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setShowModal(true);
  };

  return (
    <>
      <p className="text-[11px] text-[var(--muted-foreground)]/60">
        {t.rich('unclaimedArtistNotice', {
          claimLink: (chunks) => (
            <button
              onClick={handleClick}
              className="underline underline-offset-2 decoration-[var(--muted-foreground)]/40 hover:text-[var(--muted-foreground)] transition-colors"
            >
              {chunks}
            </button>
          )
        })}
      </p>
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
