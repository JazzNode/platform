'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export default function LegalPageModal({ isOpen, onClose, title, children }: Props) {
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // ESC to close
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleBackdropClick = useCallback(() => {
    onClose();
  }, [onClose]);

  if (!mounted) return null;

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-[60] transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(8px)' }}
        onClick={handleBackdropClick}
      />

      {/* Panel */}
      <div
        className={`fixed inset-0 z-[61] flex items-start justify-center transition-all duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        style={{ paddingTop: 'max(env(safe-area-inset-top, 0px), 12px)' }}
        onClick={handleBackdropClick}
      >
        <div
          className={`relative w-full max-w-2xl mx-3 sm:mx-auto mt-4 sm:mt-[8vh] rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden transition-all duration-300 ${
            isOpen ? 'translate-y-0 scale-100' : '-translate-y-4 scale-[0.98]'
          }`}
          style={{
            background: 'color-mix(in srgb, var(--background) 95%, transparent)',
            backdropFilter: 'blur(40px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(40px) saturate(1.6)',
            maxHeight: 'min(80vh, 700px)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 z-10 w-8 h-8 flex items-center justify-center rounded-full text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--color-gold)]/10 transition-all duration-200"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </button>

          {/* Scrollable content */}
          <div className="overflow-y-auto px-6 py-6" style={{ maxHeight: 'min(80vh, 700px)' }}>
            <h3 className="font-serif text-sm font-bold uppercase tracking-widest text-gold mb-6">{title}</h3>
            <div className="space-y-6 text-sm leading-relaxed text-[var(--muted-foreground)]">
              {children}
            </div>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
