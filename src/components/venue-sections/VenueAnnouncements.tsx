'use client';

import { useState, useEffect } from 'react';

interface Announcement {
  id: string;
  title: string;
  body: string;
  pinned: boolean;
  created_at: string;
  expires_at: string | null;
}

interface VenueAnnouncementsProps {
  venueId: string;
  t: (key: string) => string;
}

export default function VenueAnnouncements({ venueId, t }: VenueAnnouncementsProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch(`/api/venue/announcements?venueId=${venueId}`)
      .then((res) => res.json())
      .then((data) => {
        setAnnouncements(data.announcements || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [venueId]);

  if (loading || announcements.length === 0) return null;

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('today');
    if (diffDays === 1) return t('yesterday');
    if (diffDays < 7) return t('daysAgo').replace('{count}', String(diffDays));
    return date.toLocaleDateString();
  };

  return (
    <section>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-amber-400 text-lg">📢</span>
        <h2 className="font-serif text-xl sm:text-2xl font-bold">{t('announcements')}</h2>
      </div>

      <div className="space-y-3">
        {announcements.map((a) => {
          const isLong = a.body.length > 200;
          const isExpanded = expanded.has(a.id);

          return (
            <div
              key={a.id}
              className={`rounded-2xl p-5 transition-colors ${
                a.pinned
                  ? 'bg-amber-400/5 border border-amber-400/20'
                  : 'bg-[var(--card)] border border-[var(--border)]'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {a.pinned && <span className="text-amber-400 text-xs">📌</span>}
                  <h3 className="text-sm font-semibold">{a.title}</h3>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] shrink-0 ml-3">
                  {formatDate(a.created_at)}
                </span>
              </div>
              <p className={`text-sm text-[var(--muted-foreground)] whitespace-pre-line ${
                !isExpanded && isLong ? 'line-clamp-3' : ''
              }`}>
                {a.body}
              </p>
              {isLong && (
                <button
                  onClick={() => toggleExpand(a.id)}
                  className="text-xs text-amber-400 hover:text-amber-300 mt-2 transition-colors"
                >
                  {isExpanded ? t('showLess') : t('readMore')}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
