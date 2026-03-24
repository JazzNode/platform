'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import { useTheme } from '@/components/ThemeProvider';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface FanInsightsData {
  fanGrowth: { week: string; count: number }[];
  topCities: { city: string; count: number }[];
  bestEvents: { eventName: string; date: string; views: number }[];
  peakHours: { hour: number; count: number }[];
}

interface FanInsightsPanelProps {
  entityType: 'venue' | 'artist';
  entityId: string;
  translations: {
    fanInsights: string;
    fanGrowth: string;
    topCities: string;
    bestEvents: string;
    peakHours: string;
    newFollowers: string;
    views: string;
    noData: string;
    noEventsData: string;
  };
}

const tooltipStyle = {
  backgroundColor: 'var(--card, #111111)',
  border: '1px solid var(--border, #333)',
  borderRadius: 12,
  fontSize: 12,
  color: 'var(--foreground, #F0EDE6)',
};

const tooltipLabelStyle = {
  color: 'var(--muted-foreground, #8A8578)',
};

const tooltipCursor = { fill: 'rgba(255,255,255,0.04)' };

function formatHour(hour: number): string {
  if (hour === 0) return '12a';
  if (hour === 12) return '12p';
  return hour < 12 ? `${hour}a` : `${hour - 12}p`;
}

export default function FanInsightsPanel({
  entityType,
  entityId,
  translations: t,
}: FanInsightsPanelProps) {
  const { theme } = useTheme();
  const GOLD = theme.accent;

  const [data, setData] = useState<FanInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(false);

    try {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const paramKey = entityType === 'venue' ? 'venueId' : 'artistId';
      const res = await fetch(
        `/api/${entityType}/fan-insights?${paramKey}=${entityId}`,
        {
          headers: { Authorization: `Bearer ${session?.access_token}` },
        },
      );

      if (!res.ok) {
        setError(true);
        setData(null);
      } else {
        const json = await res.json();
        setData(json);
      }
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [entityType, entityId]);

  useEffect(() => {
    if (entityId) fetchData();
  }, [entityId, fetchData]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">{t.noData}</p>
        </div>
      </FadeUp>
    );
  }

  const maxCityCount = data.topCities[0]?.count || 1;

  return (
    <div className="space-y-6">
      <FadeUp>
        <h2 className="text-xs uppercase tracking-widest text-[var(--color-gold)] font-bold">
          {t.fanInsights}
        </h2>
      </FadeUp>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fan Growth Chart */}
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
              {t.fanGrowth}
            </h3>
            {data.fanGrowth.length > 0 ? (
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={data.fanGrowth}>
                  <defs>
                    <linearGradient id="fanGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={GOLD} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="week"
                    tick={{ fontSize: 10, fill: '#999' }}
                    tickFormatter={(v) => v.slice(5)}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#999' }}
                    width={30}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    cursor={tooltipCursor}
                    formatter={(value) => [value, t.newFollowers]}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke={GOLD}
                    strokeWidth={2}
                    fill="url(#fanGrowthGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                {t.noData}
              </p>
            )}
          </div>
        </FadeUp>

        {/* Top Cities */}
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
              {t.topCities}
            </h3>
            {data.topCities.length > 0 ? (
              <div className="space-y-3">
                {data.topCities.map((c) => {
                  const pct = Math.round((c.count / maxCityCount) * 100);
                  return (
                    <div key={c.city}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="truncate mr-2">{c.city}</span>
                        <span className="text-[var(--muted-foreground)] tabular-nums">
                          {c.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: GOLD,
                            opacity: 0.6,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                {t.noData}
              </p>
            )}
          </div>
        </FadeUp>

        {/* Best-Performing Events */}
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
              {t.bestEvents}
            </h3>
            {data.bestEvents.length > 0 ? (
              <div className="space-y-3">
                {data.bestEvents.map((e, i) => (
                  <div
                    key={`${e.date}-${i}`}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="text-[var(--color-gold)] font-bold text-xs w-5 text-right tabular-nums">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="truncate font-medium">{e.eventName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {e.date}
                      </p>
                    </div>
                    <span className="text-xs text-[var(--muted-foreground)] tabular-nums whitespace-nowrap">
                      {e.views.toLocaleString()} {t.views}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                {t.noEventsData}
              </p>
            )}
          </div>
        </FadeUp>

        {/* Peak Engagement Hours */}
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h3 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
              {t.peakHours}
            </h3>
            {data.peakHours.some((h) => h.count > 0) ? (
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={data.peakHours}>
                  <XAxis
                    dataKey="hour"
                    tick={{ fontSize: 9, fill: '#999' }}
                    tickFormatter={formatHour}
                    interval={2}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#999' }}
                    width={30}
                    allowDecimals={false}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    labelStyle={tooltipLabelStyle}
                    cursor={tooltipCursor}
                    labelFormatter={(h) => formatHour(h as number)}
                    formatter={(value) => [value, t.views]}
                  />
                  <Bar dataKey="count" fill={GOLD} radius={[2, 2, 0, 0]} opacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">
                {t.noData}
              </p>
            )}
          </div>
        </FadeUp>
      </div>
    </div>
  );
}
