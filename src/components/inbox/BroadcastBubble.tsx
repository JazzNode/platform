import { useTranslations } from 'next-intl';

interface BroadcastBubbleProps {
  body: string;
  createdAt: string;
  children?: React.ReactNode; // for translate button etc.
}

export default function BroadcastBubble({ body, createdAt, children }: BroadcastBubbleProps) {
  const t = useTranslations('artistStudio');
  return (
    <div className="max-w-[85%] sm:max-w-[70%]">
      <div className="border-l-2 border-emerald-400 bg-emerald-400/5 rounded-r-xl rounded-tl-xl px-4 py-3">
        <p className="text-[10px] text-emerald-400/70 font-semibold uppercase tracking-widest mb-1.5">
          {t('broadcastLabel')}
        </p>
        <p className="text-sm whitespace-pre-wrap break-words">{body}</p>
      </div>
      <div className="flex items-center gap-2 mt-1 px-1">
        <span className="text-[10px] text-[var(--muted-foreground)]/60">
          {new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {children}
      </div>
    </div>
  );
}
