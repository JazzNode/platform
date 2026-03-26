'use client';

import { useTranslations } from 'next-intl';

interface IntentOption {
  type: 'booking' | 'lesson' | 'collaboration' | null;
  icon: string;
  labelKey: string;
  prefillKey: string;
}

interface MessageIntentSelectorProps {
  artistName: string;
  availableForHire: boolean;
  acceptingStudents: boolean;
  isOpen: boolean;
  onSelect: (intentType: string | null, prefillMessage: string) => void;
  onClose: () => void;
}

export default function MessageIntentSelector({
  artistName,
  availableForHire,
  acceptingStudents,
  isOpen,
  onSelect,
  onClose,
}: MessageIntentSelectorProps) {
  const t = useTranslations('messaging');

  if (!isOpen) return null;

  const options: IntentOption[] = [];

  if (availableForHire) {
    options.push(
      { type: 'booking', icon: '💼', labelKey: 'intentBooking', prefillKey: 'bookingPrefill' },
      { type: 'collaboration', icon: '🤝', labelKey: 'intentCollaboration', prefillKey: 'collaborationPrefill' },
    );
  }

  if (acceptingStudents) {
    options.push(
      { type: 'lesson', icon: '🎓', labelKey: 'intentLesson', prefillKey: 'lessonPrefill' },
    );
  }

  // Always show "Just saying hi"
  options.push(
    { type: null, icon: '💬', labelKey: 'intentGeneral', prefillKey: '' },
  );

  const handleSelect = (option: IntentOption) => {
    const prefill = option.prefillKey ? t(option.prefillKey as any, { artistName }) : '';
    onSelect(option.type, prefill);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-[#0F0F0F] border border-[var(--border)] rounded-2xl p-6">
        <h3 className="font-serif text-lg font-bold mb-1">{t('intentSelectorTitle')}</h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-5">{t('intentSelectorSubtitle', { artistName })}</p>

        <div className="space-y-2">
          {options.map((option) => (
            <button
              key={option.type || 'general'}
              onClick={() => handleSelect(option)}
              className="w-full flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] hover:border-gold/30 hover:bg-[var(--card)] transition-all text-left group"
            >
              <span className="text-xl">{option.icon}</span>
              <span className="text-sm font-medium group-hover:text-gold transition-colors">
                {t(option.labelKey as any)}
              </span>
            </button>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors py-2"
        >
          {t('cancel')}
        </button>
      </div>
    </div>
  );
}
