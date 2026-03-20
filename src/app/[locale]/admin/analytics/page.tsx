'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { useAdmin } from '@/components/AdminProvider';
import FadeUp from '@/components/animations/FadeUp';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';
import { useTheme } from '@/components/ThemeProvider';

// Fallback hex values — overridden by theme at runtime
const FALLBACK_ACCENT_2 = '#7C9885';
const FALLBACK_ACCENT_3 = '#8B7355';

type Range = '7d' | '28d' | '90d' | '365d';

interface KPI {
  current: number;
  previous: number;
  change: number;
}

interface AnalyticsData {
  kpis: {
    views: KPI;
    users: KPI;
    follows: KPI;
    events: KPI;
    claims: KPI;
  };
  viewsByDay: { date: string; artistViews: number; venueViews: number; total: number }[];
  usersByDay: { date: string; count: number }[];
  followsByDay: { date: string; count: number }[];
  topArtists: { id: string; name: string; views: number }[];
  topVenues: { id: string; name: string; views: number }[];
  topCities: { city: string; views: number }[];
  claimsByDay: { date: string; submitted: number; approved: number }[];
}

// --- Shared chart config ---
const chartTooltipStyle: React.CSSProperties = {
  backgroundColor: 'var(--card, #111111)',
  border: '1px solid var(--border, #333)',
  borderRadius: 12,
  fontSize: 12,
  padding: '8px 12px',
  color: 'var(--foreground, #F0EDE6)',
};
const chartTooltipLabelStyle: React.CSSProperties = { color: 'var(--muted-foreground, #8A8578)' };
const chartCursorStyle = { fill: 'rgba(255,255,255,0.04)' };
const axisTickStyle = { fontSize: 10, fill: '#666' };

function formatDate(dateStr: string, range: Range) {
  const d = new Date(dateStr + 'T00:00:00');
  if (range === '365d') return d.toLocaleDateString(undefined, { month: 'short' });
  if (range === '90d') return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// Downsample data for long ranges to keep charts readable
function downsample<T extends { date: string }>(
  data: T[],
  range: Range,
  aggregate: (group: T[]) => Omit<T, 'date'>,
): T[] {
  if (range === '7d' || range === '28d') return data;
  // For 90d, show weekly. For 365d, show monthly.
  const bucketSize = range === '365d' ? 30 : 7;
  const result: T[] = [];
  for (let i = 0; i < data.length; i += bucketSize) {
    const slice = data.slice(i, i + bucketSize);
    if (slice.length === 0) continue;
    result.push({ date: slice[0].date, ...aggregate(slice) } as T);
  }
  return result;
}

// --- KPI Card ---
function KpiCard({ label, value, change, icon }: {
  label: string;
  value: number;
  change: number;
  icon: React.ReactNode;
}) {
  const isPositive = change > 0;
  const isNeutral = change === 0;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--color-gold)]/30 transition-colors">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-[var(--muted-foreground)]">{icon}</span>
        <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">{value.toLocaleString()}</p>
      <div className="flex items-center gap-1.5 mt-2">
        {!isNeutral && (
          <svg className={`w-3.5 h-3.5 ${isPositive ? 'text-emerald-400' : 'text-red-400'}`} viewBox="0 0 16 16" fill="currentColor">
            {isPositive
              ? <path d="M8 4l4 5H4l4-5z" />
              : <path d="M8 12l4-5H4l4 5z" />
            }
          </svg>
        )}
        <span className={`text-xs font-medium ${isPositive ? 'text-emerald-400' : isNeutral ? 'text-[var(--muted-foreground)]' : 'text-red-400'}`}>
          {isNeutral ? '—' : `${isPositive ? '+' : ''}${change}%`}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)]">vs prev</span>
      </div>
    </div>
  );
}

// --- Section wrapper ---
function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <FadeUp>
      <div className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 ${className || ''}`}>
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-5">{title}</h2>
        {children}
      </div>
    </FadeUp>
  );
}

// --- Rank bar ---
function RankBar({ rank, name, value, max, href }: {
  rank: number;
  name: string;
  value: number;
  max: number;
  href: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  return (
    <Link href={href} className="group flex items-center gap-3 py-1.5">
      <span className="text-[10px] text-[var(--muted-foreground)] w-4 text-right font-mono">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm truncate group-hover:text-[var(--color-gold)] transition-colors">{name}</span>
          <span className="text-xs text-[var(--muted-foreground)] tabular-nums ml-2">{value.toLocaleString()}</span>
        </div>
        <div className="h-1 bg-[var(--muted)] rounded-full overflow-hidden">
          <div className="h-full bg-[var(--color-gold)]/50 rounded-full transition-all" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </Link>
  );
}

export default function AdminAnalyticsPage() {
  const t = useTranslations('adminHQ');
  const locale = useLocale();
  const { token } = useAdmin();
  const { theme } = useTheme();
  const [range, setRange] = useState<Range>('28d');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Derive chart colors from active theme
  const GOLD = theme.accent;
  const GOLD_DIM = theme.accent + '40';
  const ACCENT_2 = theme.accent2 || FALLBACK_ACCENT_2;
  const ACCENT_2_DIM = ACCENT_2 + '40';
  const ACCENT_3 = theme.accentDim || FALLBACK_ACCENT_3;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/analytics?range=${range}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error('Failed to fetch analytics:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, range]);

  // Downsample chart data for long ranges
  const chartViews = useMemo(() => {
    if (!data) return [];
    return downsample(data.viewsByDay, range, (group) => ({
      artistViews: group.reduce((s, d) => s + d.artistViews, 0),
      venueViews: group.reduce((s, d) => s + d.venueViews, 0),
      total: group.reduce((s, d) => s + d.total, 0),
    }));
  }, [data, range]);

  const chartUsers = useMemo(() => {
    if (!data) return [];
    return downsample(data.usersByDay, range, (group) => ({
      count: group.reduce((s, d) => s + d.count, 0),
    }));
  }, [data, range]);

  const chartFollows = useMemo(() => {
    if (!data) return [];
    return downsample(data.followsByDay, range, (group) => ({
      count: group.reduce((s, d) => s + d.count, 0),
    }));
  }, [data, range]);

  const chartClaims = useMemo(() => {
    if (!data) return [];
    return downsample(data.claimsByDay, range, (group) => ({
      submitted: group.reduce((s, d) => s + d.submitted, 0),
      approved: group.reduce((s, d) => s + d.approved, 0),
    }));
  }, [data, range]);

  if (loading || !data) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const ranges: { key: Range; label: string }[] = [
    { key: '7d', label: t('range7d') },
    { key: '28d', label: t('range28d') },
    { key: '90d', label: t('range90d') },
    { key: '365d', label: t('range365d') },
  ];

  const maxArtistViews = data.topArtists[0]?.views || 1;
  const maxVenueViews = data.topVenues[0]?.views || 1;
  const maxCityViews = data.topCities[0]?.views || 1;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <FadeUp>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-bold">{t('analyticsTitle')}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('analyticsDesc')}</p>
          </div>
          <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1 self-start">
            {ranges.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-all ${
                  range === r.key
                    ? 'bg-[var(--card)] text-[var(--color-gold)] font-semibold shadow-sm'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </FadeUp>

      {/* KPI Cards */}
      <FadeUp>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard
            label={t('kpiViews')}
            value={data.kpis.views.current}
            change={data.kpis.views.change}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
          <KpiCard
            label={t('kpiUsers')}
            value={data.kpis.users.current}
            change={data.kpis.users.change}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              </svg>
            }
          />
          <KpiCard
            label={t('kpiFollows')}
            value={data.kpis.follows.current}
            change={data.kpis.follows.change}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
            }
          />
          <KpiCard
            label={t('kpiEvents')}
            value={data.kpis.events.current}
            change={data.kpis.events.change}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            }
          />
          <KpiCard
            label={t('kpiClaims')}
            value={data.kpis.claims.current}
            change={data.kpis.claims.change}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="M9 12l2 2 4-4" />
              </svg>
            }
          />
        </div>
      </FadeUp>

      {/* Traffic Overview */}
      <Section title={t('trafficOverview')}>
        {chartViews.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartViews}>
              <defs>
                <linearGradient id="gradGold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gradGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={ACCENT_2} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={ACCENT_2} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={axisTickStyle} tickFormatter={(v) => formatDate(v, range)} interval="preserveStartEnd" />
              <YAxis tick={axisTickStyle} width={36} />
              <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} cursor={chartCursorStyle} labelFormatter={(v) => formatDate(v as string, range)} />
              <Area type="monotone" dataKey="artistViews" name={t('artistViews')} stroke={GOLD} fill="url(#gradGold)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="venueViews" name={t('venueViews')} stroke={ACCENT_2} fill="url(#gradGreen)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t('noData')}</p>
        )}
        <div className="flex items-center gap-5 mt-3 ml-1">
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: GOLD }} />
            {t('artistViews')}
          </div>
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: ACCENT_2 }} />
            {t('venueViews')}
          </div>
        </div>
      </Section>

      {/* User Growth + Follow Trends - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title={t('userGrowth')}>
          {chartUsers.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartUsers}>
                <defs>
                  <linearGradient id="gradUser" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickFormatter={(v) => formatDate(v, range)} interval="preserveStartEnd" />
                <YAxis tick={axisTickStyle} width={30} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} cursor={chartCursorStyle} labelFormatter={(v) => formatDate(v as string, range)} />
                <Area type="monotone" dataKey="count" name={t('kpiUsers')} stroke={GOLD} fill="url(#gradUser)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
          )}
        </Section>

        <Section title={t('followTrends')}>
          {chartFollows.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartFollows}>
                <defs>
                  <linearGradient id="gradFollow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT_2} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={ACCENT_2} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickFormatter={(v) => formatDate(v, range)} interval="preserveStartEnd" />
                <YAxis tick={axisTickStyle} width={30} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} cursor={chartCursorStyle} labelFormatter={(v) => formatDate(v as string, range)} />
                <Area type="monotone" dataKey="count" name={t('kpiFollows')} stroke={ACCENT_2} fill="url(#gradFollow)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
          )}
        </Section>
      </div>

      {/* Top Artists + Top Venues - side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section title={t('topArtists')}>
          {data.topArtists.length > 0 ? (
            <div className="space-y-1">
              {data.topArtists.map((a, i) => (
                <RankBar
                  key={a.id}
                  rank={i + 1}
                  name={a.name}
                  value={a.views}
                  max={maxArtistViews}
                  href={`/${locale}/artists/${a.id}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
          )}
        </Section>

        <Section title={t('topVenues')}>
          {data.topVenues.length > 0 ? (
            <div className="space-y-1">
              {data.topVenues.map((v, i) => (
                <RankBar
                  key={v.id}
                  rank={i + 1}
                  name={v.name}
                  value={v.views}
                  max={maxVenueViews}
                  href={`/${locale}/venues/${v.id}`}
                />
              ))}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
          )}
        </Section>
      </div>

      {/* Geographic Distribution */}
      <Section title={t('geoDistribution')}>
        {data.topCities.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-2">
            {data.topCities.map((c, i) => {
              const pct = Math.max(6, Math.round((c.views / maxCityViews) * 100));
              return (
                <div key={c.city} className="py-1">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[10px] text-[var(--muted-foreground)] font-mono w-3">{i + 1}</span>
                      <span className="truncate">{c.city}</span>
                    </span>
                    <span className="text-[var(--muted-foreground)] tabular-nums">{c.views.toLocaleString()}</span>
                  </div>
                  <div className="h-1.5 bg-[var(--muted)] rounded-full overflow-hidden">
                    <div className="h-full bg-[var(--color-gold)]/50 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
        )}
      </Section>

      {/* Claims Activity */}
      <Section title={t('claimsActivity')}>
        {chartClaims.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartClaims}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickFormatter={(v) => formatDate(v, range)} interval="preserveStartEnd" />
                <YAxis tick={axisTickStyle} width={30} allowDecimals={false} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} cursor={chartCursorStyle} labelFormatter={(v) => formatDate(v as string, range)} />
                <Bar dataKey="submitted" name={t('claimsSubmitted')} fill={GOLD_DIM} stroke={GOLD} strokeWidth={1} radius={[3, 3, 0, 0]} />
                <Bar dataKey="approved" name={t('claimsApproved')} fill={ACCENT_2_DIM} stroke={ACCENT_2} strokeWidth={1} radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3 ml-1">
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: GOLD_DIM, border: `1px solid ${GOLD}` }} />
                {t('claimsSubmitted')}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: ACCENT_2_DIM, border: `1px solid ${ACCENT_2}` }} />
                {t('claimsApproved')}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
        )}
      </Section>
    </div>
  );
}
