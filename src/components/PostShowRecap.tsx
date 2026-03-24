'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

interface RecapData {
  eventId: string;
  title: string;
  venueName?: string;
  startAt: string;
  endAt: string | null;
  tooRecent: boolean;
  viewsBefore: number;
  viewsAfter: number;
  liftPct: number;
  newFollowers: number;
  topReferrers: { source: string; count: number }[];
  citiesReached: number;
  lineupBoost?: { artistId: string; name: string; viewsBefore: number; viewsAfter: number }[];
}

interface PostShowRecapProps {
  entityId: string;
  entityType: 'venue' | 'artist';
}

export default function PostShowRecap({ entityId, entityType }: PostShowRecapProps) {
  const { theme } = useTheme();
  const GOLD = theme.accent;

  const [recaps, setRecaps] = useState<RecapData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!entityId) return;

    const fetchRecaps = async () => {
      setLoading(true);
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      const param = entityType === 'venue' ? 'venueId' : 'artistId';
      const res = await fetch(`/api/${entityType}/post-show-recap?${param}=${entityId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (res.ok) {
        const json = await res.json();
        setRecaps(json.recaps || []);
      } else {
        setRecaps([]);
      }
      setLoading(false);
    };

    fetchRecaps();
  }, [entityId, entityType]);

  const toggleExpanded = (eventId: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (recaps.length === 0) {
    return (
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-3">
            Post-Show Recaps
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] text-center py-6">
            No recent events to recap. Recaps appear after your events end.
          </p>
        </div>
      </FadeUp>
    );
  }

  return (
    <div className="space-y-4">
      <FadeUp>
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
          Post-Show Recaps
        </h2>
      </FadeUp>

      {recaps.map((recap) => {
        const isExpanded = expandedIds.has(recap.eventId);
        const eventDate = new Date(recap.startAt).toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

        return (
          <FadeUp key={recap.eventId}>
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
              {/* Header - always visible, clickable */}
              <button
                onClick={() => toggleExpanded(recap.eventId)}
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-[var(--muted)]/30 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate">{recap.title}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                    {eventDate}
                    {recap.venueName ? ` \u00B7 ${recap.venueName}` : ''}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {/* Page view lift badge */}
                  {recap.tooRecent ? (
                    <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2.5 py-1 rounded-lg">
                      Pending...
                    </span>
                  ) : (
                    <span
                      className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                        recap.liftPct > 0
                          ? 'text-[var(--color-gold)] bg-[var(--color-gold)]/10'
                          : recap.liftPct < 0
                            ? 'text-red-400 bg-red-400/10'
                            : 'text-[var(--muted-foreground)] bg-[var(--muted)]'
                      }`}
                    >
                      {recap.liftPct > 0 ? '\u2191' : recap.liftPct < 0 ? '\u2193' : '\u2013'}{' '}
                      {Math.abs(recap.liftPct)}% views
                    </span>
                  )}

                  {/* New followers badge */}
                  {recap.newFollowers > 0 && (
                    <span className="text-xs font-bold text-[var(--color-gold)] bg-[var(--color-gold)]/10 px-2.5 py-1 rounded-lg">
                      +{recap.newFollowers} follower{recap.newFollowers !== 1 ? 's' : ''}
                    </span>
                  )}

                  {/* Expand/collapse arrow */}
                  <svg
                    className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {/* Expanded detail section */}
              {isExpanded && (
                <div className="px-5 pb-5 space-y-5 border-t border-[var(--border)]">
                  {/* Too recent notice */}
                  {recap.tooRecent && (
                    <div className="mt-4 bg-[var(--muted)]/50 rounded-xl p-3 text-xs text-[var(--muted-foreground)] text-center">
                      This event ended less than 3 days ago. Full recap data will be available soon.
                    </div>
                  )}

                  {/* Before / After bar chart */}
                  <div className="mt-4">
                    <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-3">
                      Page Views: Before vs After
                    </p>
                    <ResponsiveContainer width="100%" height={120}>
                      <BarChart
                        data={[
                          { label: '3 days before', count: recap.viewsBefore },
                          { label: '3 days after', count: recap.viewsAfter },
                        ]}
                        layout="vertical"
                        margin={{ left: 90, right: 20, top: 5, bottom: 5 }}
                      >
                        <XAxis type="number" tick={{ fontSize: 10, fill: '#999' }} />
                        <YAxis
                          type="category"
                          dataKey="label"
                          tick={{ fontSize: 11, fill: '#999' }}
                          width={85}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'var(--card, #111111)',
                            border: '1px solid var(--border, #333)',
                            borderRadius: 12,
                            fontSize: 12,
                            color: 'var(--foreground, #F0EDE6)',
                          }}
                          labelStyle={{ color: 'var(--muted-foreground, #8A8578)' }}
                          cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                        />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                          <Cell fill={theme.accentDim + '99'} />
                          <Cell fill={GOLD} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Stats row */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-[var(--muted)]/30 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-[var(--color-gold)]">{recap.newFollowers}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">New Followers</p>
                    </div>
                    <div className="bg-[var(--muted)]/30 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-[var(--color-gold)]">{recap.citiesReached}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Cities Reached</p>
                    </div>
                    <div className="bg-[var(--muted)]/30 rounded-xl p-3 text-center">
                      <p className="text-lg font-bold text-[var(--color-gold)]">{recap.topReferrers.length}</p>
                      <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Traffic Sources</p>
                    </div>
                  </div>

                  {/* Top Referrers */}
                  {recap.topReferrers.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-2">
                        Top Referrers
                      </p>
                      <div className="space-y-1.5">
                        {recap.topReferrers.slice(0, 3).map((r) => {
                          const maxCount = recap.topReferrers[0].count;
                          const pct = Math.round((r.count / maxCount) * 100);
                          return (
                            <div key={r.source}>
                              <div className="flex justify-between text-xs mb-0.5">
                                <span className="truncate">{r.source}</span>
                                <span className="text-[var(--muted-foreground)] ml-2 shrink-0">{r.count}</span>
                              </div>
                              <div className="h-1 bg-[var(--muted)] rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[var(--color-gold)]/60 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Lineup Boost (venue only) */}
                  {recap.lineupBoost && recap.lineupBoost.length > 0 && (
                    <div>
                      <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-2">
                        Lineup Impact
                      </p>
                      <div className="space-y-2">
                        {recap.lineupBoost.map((artist) => {
                          const diff = artist.viewsAfter - artist.viewsBefore;
                          const pct = artist.viewsBefore > 0
                            ? Math.round((diff / artist.viewsBefore) * 100)
                            : (artist.viewsAfter > 0 ? 100 : 0);

                          return (
                            <div key={artist.artistId} className="flex items-center justify-between text-xs">
                              <span className="truncate flex-1">{artist.name}</span>
                              <span className="flex items-center gap-2 shrink-0 ml-2">
                                <span className="text-[var(--muted-foreground)]">
                                  {artist.viewsBefore} &rarr; {artist.viewsAfter}
                                </span>
                                <span
                                  className={`font-bold ${
                                    pct > 0
                                      ? 'text-[var(--color-gold)]'
                                      : pct < 0
                                        ? 'text-red-400'
                                        : 'text-[var(--muted-foreground)]'
                                  }`}
                                >
                                  {pct > 0 ? '+' : ''}{pct}%
                                </span>
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </FadeUp>
        );
      })}
    </div>
  );
}
