'use client';

import { useState, useRef, useEffect } from 'react';

interface Props {
  title: string;
  startAt: string; // ISO string
  endAt?: string | null;
  timezone: string;
  venueName?: string;
  address?: string;
  description?: string;
  sourceUrl?: string;
  /** 'icon' = small icon button (for cards), 'full' = button with text */
  variant?: 'icon' | 'full';
  label?: string;
}

function formatICSDate(iso: string): string {
  // Format: YYYYMMDDTHHMMSSZ (UTC)
  const d = new Date(iso);
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function generateICS({ title, startAt, endAt, timezone, venueName, address, description, sourceUrl }: Props): string {
  const start = formatICSDate(startAt);
  // Default end = start + 2 hours if not provided
  const end = endAt ? formatICSDate(endAt) : formatICSDate(new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString());
  const location = [venueName, address].filter(Boolean).join(', ');
  const desc = [description, sourceUrl ? `Details: ${sourceUrl}` : ''].filter(Boolean).join('\\n');

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//JazzNode//Events//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${title}`,
    location && `LOCATION:${location}`,
    desc && `DESCRIPTION:${desc}`,
    `URL:${sourceUrl || ''}`,
    `STATUS:CONFIRMED`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].filter(Boolean).join('\r\n');
}

function generateGoogleCalendarUrl({ title, startAt, endAt, timezone, venueName, address, description, sourceUrl }: Props): string {
  const start = formatICSDate(startAt);
  const end = endAt ? formatICSDate(endAt) : formatICSDate(new Date(new Date(startAt).getTime() + 2 * 60 * 60 * 1000).toISOString());
  const location = [venueName, address].filter(Boolean).join(', ');
  const details = [description, sourceUrl ? `Details: ${sourceUrl}` : ''].filter(Boolean).join('\n');

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${start}/${end}`,
    ...(location && { location }),
    ...(details && { details }),
    ctz: timezone,
  });
  return `https://www.google.com/calendar/render?${params.toString()}`;
}

export default function AddToCalendar(props: Props) {
  const { variant = 'full', label = 'Add to Calendar' } = props;
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleICS = () => {
    const ics = generateICS(props);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${props.title.replace(/[^a-zA-Z0-9\u4e00-\u9fff]/g, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
    setOpen(false);
  };

  const handleGoogle = () => {
    window.open(generateGoogleCalendarUrl(props), '_blank', 'noopener');
    setOpen(false);
  };

  const CalendarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M12 14v4" />
      <path d="M10 16h4" />
    </svg>
  );

  return (
    <div ref={ref} className="relative inline-block">
      {variant === 'icon' ? (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
          className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-gold hover:bg-gold/10 transition-all duration-200"
          aria-label={label}
          title={label}
        >
          <CalendarIcon />
        </button>
      ) : (
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium uppercase tracking-widest rounded-xl border border-[var(--border)] text-[var(--muted-foreground)] hover:text-gold hover:border-gold/40 hover:bg-gold/5 transition-all duration-300"
        >
          <CalendarIcon />
          <span>{label}</span>
        </button>
      )}

      {open && (
        <div
          className="absolute right-0 top-full mt-2 min-w-[180px] rounded-xl bg-[var(--card)] border border-[var(--border)] shadow-xl py-1.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
          style={{ zIndex: 60 }}
        >
          <button
            onClick={handleGoogle}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)] transition-colors duration-200"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.5 4h-3V2.5a.5.5 0 00-1 0V4h-7V2.5a.5.5 0 00-1 0V4h-3A2.5 2.5 0 002 6.5v13A2.5 2.5 0 004.5 22h15a2.5 2.5 0 002.5-2.5v-13A2.5 2.5 0 0019.5 4zM20 19.5a.5.5 0 01-.5.5h-15a.5.5 0 01-.5-.5V10h16v9.5z" />
            </svg>
            Google Calendar
          </button>
          <button
            onClick={handleICS}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[rgba(240,237,230,0.06)] transition-colors duration-200"
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Apple / Outlook (.ics)
          </button>
        </div>
      )}
    </div>
  );
}
