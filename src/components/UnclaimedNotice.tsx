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
      <p className="text-[11px] text-[#8A8578]/60">
        {t.rich('unclaimedArtistNotice', {
          claimLink: (chunks) => (
            <button
              onClick={handleClick}
              className="underline underline-offset-2 decoration-[#8A8578]/40 hover:text-[#8A8578] transition-colors"
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
