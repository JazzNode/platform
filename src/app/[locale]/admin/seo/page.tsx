'use client';

import { useState, useEffect, useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import { useTheme } from '@/components/ThemeProvider';
import FadeUp from '@/components/animations/FadeUp';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Cell, PieChart, Pie,
} from 'recharts';

// --- Types ---
interface KPI {
  current: number;
  previous: number;
  change: number;
}

interface SeoData {
  kpis: {
    clicks: KPI;
    impressions: KPI;
    ctr: KPI;
    position: KPI;
  };
  daily: { date: string; clicks: number; impressions: number }[];
  topQueries: { query: string; impressions: number; clicks: number; avg_ctr: number; avg_position: number }[];
  topPages: { page: string; impressions: number; clicks: number; avg_ctr: number; avg_position: number }[];
  countries: { country: string; impressions: number; clicks: number; avg_position: number }[];
  devices: { device: string; impressions: number; clicks: number; avg_ctr: number }[];
  pageTypes: { page_type: string; impressions: number; clicks: number; avg_position: number }[];
  opportunities: { page: string; query: string; impressions: number; clicks: number; ctr: number; avg_position: number }[];
  lastSync: { synced_date: string; rows_upserted: number; created_at: string } | null;
}

type Range = '7d' | '14d' | '28d';

// --- Country code to name ---
const COUNTRY_NAMES: Record<string, string> = {
  twn: '台灣', jpn: '日本', hkg: '香港', sgp: '新加坡', mys: '馬來西亞',
  kor: '韓國', usa: '美國', gbr: '英國', tha: '泰國', idn: '印尼',
  aus: '澳洲', can: '加拿大', deu: '德國', fra: '法國', nld: '荷蘭',
  phl: '菲律賓', ind: '印度', chn: '中國',
};

const DEVICE_LABELS: Record<string, string> = {
  MOBILE: 'Mobile', DESKTOP: 'Desktop', TABLET: 'Tablet',
};

const PAGE_TYPE_LABELS: Record<string, string> = {
  artist: 'Artists', venue: 'Venues', event: 'Events', magazine: 'Magazine', other: 'Other',
};

// --- Chart config (matching analytics page) ---
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

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

// --- Reusable components ---
function KpiCard({ label, value, unit, change, icon, invertChange }: {
  label: string;
  value: string | number;
  unit?: string;
  change: number;
  icon: React.ReactNode;
  invertChange?: boolean;
}) {
  const effectiveChange = invertChange ? -change : change;
  const isPositive = effectiveChange > 0;
  const isNeutral = change === 0;

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5 hover:border-[var(--color-gold)]/30 transition-colors">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-[var(--muted-foreground)]">{icon}</span>
        <span className="text-xs text-[var(--muted-foreground)] uppercase tracking-widest">{label}</span>
      </div>
      <p className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">
        {value}{unit && <span className="text-base font-normal text-[var(--muted-foreground)] ml-1">{unit}</span>}
      </p>
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
          {isNeutral ? '—' : `${effectiveChange > 0 ? '+' : ''}${change}%`}
        </span>
        <span className="text-[10px] text-[var(--muted-foreground)]">vs prev</span>
      </div>
    </div>
  );
}

function Section({ title, children, className, action }: {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <FadeUp>
      <div className={`bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 ${className || ''}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">{title}</h2>
          {action}
        </div>
        {children}
      </div>
    </FadeUp>
  );
}

// Extract slug from full URL for display
function pageSlug(url: string): string {
  try {
    const u = new URL(url);
    // Remove locale prefix and return path
    return u.pathname.replace(/^\/(en|zh|ja|ko|th|id)/, '') || '/';
  } catch {
    return url;
  }
}

function pageTypeFromUrl(url: string): string {
  if (url.includes('/artists/')) return 'artist';
  if (url.includes('/venues/')) return 'venue';
  if (url.includes('/events/')) return 'event';
  if (url.includes('/magazine/')) return 'magazine';
  return 'other';
}

const TYPE_COLORS: Record<string, string> = {
  artist: '#D4A853',
  venue: '#7C9885',
  event: '#8B7355',
  magazine: '#6B8CA8',
  other: '#666',
};

export default function AdminSeoPage() {
  const t = useTranslations('adminHQ');
  const locale = useLocale();
  const { token } = useAdmin();
  const { theme } = useTheme();
  const [range, setRange] = useState<Range>('14d');
  const [data, setData] = useState<SeoData | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'queries' | 'pages'>('queries');

  const GOLD = theme.accent;
  const ACCENT_2 = theme.accent2 || '#7C9885';

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(`/api/admin/seo?range=${range}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled) setData(json);
      } catch (err) {
        console.error('Failed to fetch SEO data:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token, range]);

  // Pie chart data for page types
  const pieData = useMemo(() => {
    if (!data) return [];
    return data.pageTypes.map((pt) => ({
      name: PAGE_TYPE_LABELS[pt.page_type] || pt.page_type,
      value: Number(pt.impressions),
      color: TYPE_COLORS[pt.page_type] || '#666',
    }));
  }, [data]);

  if (loading || !data) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const ranges: { key: Range; label: string }[] = [
    { key: '7d', label: '7D' },
    { key: '14d', label: '14D' },
    { key: '28d', label: '28D' },
  ];

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <FadeUp>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('seoTitle')}</h1>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('seoDesc')}</p>
          </div>
          <div className="flex items-center gap-3 self-start">
            {data.lastSync && (
              <span className="text-[10px] text-[var(--muted-foreground)]">
                Last sync: {new Date(data.lastSync.created_at).toLocaleDateString()}
              </span>
            )}
            <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1">
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
        </div>
      </FadeUp>

      {/* KPI Cards */}
      <FadeUp>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <KpiCard
            label={t('seoClicks')}
            value={data.kpis.clicks.current.toLocaleString()}
            change={data.kpis.clicks.change}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
              </svg>
            }
          />
          <KpiCard
            label={t('seoImpressions')}
            value={data.kpis.impressions.current.toLocaleString()}
            change={data.kpis.impressions.change}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
              </svg>
            }
          />
          <KpiCard
            label={t('seoCtr')}
            value={data.kpis.ctr.current}
            unit="%"
            change={data.kpis.ctr.change}
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
              </svg>
            }
          />
          <KpiCard
            label={t('seoPosition')}
            value={data.kpis.position.current}
            change={data.kpis.position.change}
            invertChange
            icon={
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="20" x2="12" y2="10" /><polyline points="18 14 12 8 6 14" />
              </svg>
            }
          />
        </div>
      </FadeUp>

      {/* Clicks & Impressions Trend */}
      <Section title={t('seoTrend')}>
        {data.daily.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={data.daily}>
                <defs>
                  <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={GOLD} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={ACCENT_2} stopOpacity={0.3} />
                    <stop offset="100%" stopColor={ACCENT_2} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="date" tick={axisTickStyle} tickFormatter={formatDate} interval="preserveStartEnd" />
                <YAxis yAxisId="clicks" tick={axisTickStyle} width={36} />
                <YAxis yAxisId="imp" orientation="right" tick={axisTickStyle} width={36} />
                <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} cursor={chartCursorStyle} labelFormatter={(v) => formatDate(v as string)} />
                <Area yAxisId="clicks" type="monotone" dataKey="clicks" name={t('seoClicks')} stroke={GOLD} fill="url(#gradClicks)" strokeWidth={2} dot={false} />
                <Area yAxisId="imp" type="monotone" dataKey="impressions" name={t('seoImpressions')} stroke={ACCENT_2} fill="url(#gradImp)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-5 mt-3 ml-1">
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: GOLD }} />
                {t('seoClicks')}
              </div>
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <div className="w-3 h-[3px] rounded-full" style={{ backgroundColor: ACCENT_2 }} />
                {t('seoImpressions')}
              </div>
            </div>
          </>
        ) : (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-12">{t('noData')}</p>
        )}
      </Section>

      {/* Top Queries / Pages - tabbed */}
      <Section
        title={tab === 'queries' ? t('seoTopQueries') : t('seoTopPages')}
        action={
          <div className="flex gap-1 bg-[var(--muted)] rounded-lg p-0.5">
            <button
              onClick={() => setTab('queries')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                tab === 'queries' ? 'bg-[var(--card)] text-[var(--color-gold)] font-semibold shadow-sm' : 'text-[var(--muted-foreground)]'
              }`}
            >
              {t('seoQueries')}
            </button>
            <button
              onClick={() => setTab('pages')}
              className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                tab === 'pages' ? 'bg-[var(--card)] text-[var(--color-gold)] font-semibold shadow-sm' : 'text-[var(--muted-foreground)]'
              }`}
            >
              {t('seoPages')}
            </button>
          </div>
        }
      >
        {tab === 'queries' ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="text-left pb-3 font-medium">{t('seoQuery')}</th>
                  <th className="text-right pb-3 font-medium w-20">{t('seoImp')}</th>
                  <th className="text-right pb-3 font-medium w-16">{t('seoClk')}</th>
                  <th className="text-right pb-3 font-medium w-16">CTR</th>
                  <th className="text-right pb-3 font-medium w-16">Pos</th>
                </tr>
              </thead>
              <tbody>
                {data.topQueries.map((q, i) => (
                  <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--muted-foreground)] font-mono w-4">{i + 1}</span>
                        <span className="truncate max-w-[260px]">{q.query}</span>
                      </div>
                    </td>
                    <td className="text-right tabular-nums text-[var(--muted-foreground)]">{Number(q.impressions).toLocaleString()}</td>
                    <td className="text-right tabular-nums">{Number(q.clicks).toLocaleString()}</td>
                    <td className="text-right tabular-nums text-[var(--muted-foreground)]">{(q.avg_ctr * 100).toFixed(1)}%</td>
                    <td className="text-right tabular-nums text-[var(--muted-foreground)]">{q.avg_position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.topQueries.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="text-left pb-3 font-medium">{t('seoPage')}</th>
                  <th className="text-left pb-3 font-medium w-16">Type</th>
                  <th className="text-right pb-3 font-medium w-20">{t('seoImp')}</th>
                  <th className="text-right pb-3 font-medium w-16">{t('seoClk')}</th>
                  <th className="text-right pb-3 font-medium w-16">Pos</th>
                </tr>
              </thead>
              <tbody>
                {data.topPages.map((p, i) => {
                  const type = pageTypeFromUrl(p.page);
                  return (
                    <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors">
                      <td className="py-2.5 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--muted-foreground)] font-mono w-4">{i + 1}</span>
                          <span className="truncate max-w-[260px] text-xs font-mono">{pageSlug(p.page)}</span>
                        </div>
                      </td>
                      <td>
                        <span
                          className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                          style={{ backgroundColor: TYPE_COLORS[type] + '20', color: TYPE_COLORS[type] }}
                        >
                          {type}
                        </span>
                      </td>
                      <td className="text-right tabular-nums text-[var(--muted-foreground)]">{Number(p.impressions).toLocaleString()}</td>
                      <td className="text-right tabular-nums">{Number(p.clicks).toLocaleString()}</td>
                      <td className="text-right tabular-nums text-[var(--muted-foreground)]">{p.avg_position.toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {data.topPages.length === 0 && (
              <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
            )}
          </div>
        )}
      </Section>

      {/* Country + Device + Page Type - 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Country */}
        <Section title={t('seoCountries')}>
          {data.countries.length > 0 ? (
            <div className="space-y-2">
              {data.countries.map((c, i) => {
                const maxImp = Number(data.countries[0]?.impressions) || 1;
                const pct = Math.max(6, Math.round((Number(c.impressions) / maxImp) * 100));
                return (
                  <div key={c.country} className="py-0.5">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="flex items-center gap-2">
                        <span className="text-[10px] text-[var(--muted-foreground)] font-mono w-3">{i + 1}</span>
                        <span>{COUNTRY_NAMES[c.country] || c.country.toUpperCase()}</span>
                      </span>
                      <span className="text-[var(--muted-foreground)] tabular-nums">{Number(c.impressions).toLocaleString()}</span>
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

        {/* Device */}
        <Section title={t('seoDevices')}>
          {data.devices.length > 0 ? (
            <div className="space-y-4">
              {data.devices.map((d) => {
                const totalImp = data.devices.reduce((s, x) => s + Number(x.impressions), 0) || 1;
                const pct = Math.round((Number(d.impressions) / totalImp) * 100);
                return (
                  <div key={d.device}>
                    <div className="flex items-center justify-between text-sm mb-1.5">
                      <span>{DEVICE_LABELS[d.device] || d.device}</span>
                      <span className="text-[var(--muted-foreground)] tabular-nums text-xs">{pct}%</span>
                    </div>
                    <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--color-gold)]/60 rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[var(--muted-foreground)]">
                      <span>{Number(d.impressions).toLocaleString()} imp</span>
                      <span>{Number(d.clicks).toLocaleString()} clicks</span>
                      <span>CTR {(d.avg_ctr * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
          )}
        </Section>

        {/* Page Types */}
        <Section title={t('seoPageTypes')}>
          {pieData.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={chartTooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-4 gap-y-1 justify-center mt-2">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-1.5 text-[11px] text-[var(--muted-foreground)]">
                    <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: entry.color }} />
                    <span>{entry.name}</span>
                    <span className="tabular-nums">{entry.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-[var(--muted-foreground)] text-center py-8">{t('noData')}</p>
          )}
        </Section>
      </div>

      {/* Opportunities: High Impression, Low CTR */}
      {data.opportunities.length > 0 && (
        <Section title={t('seoOpportunities')}>
          <p className="text-xs text-[var(--muted-foreground)] -mt-3 mb-4">{t('seoOpportunitiesDesc')}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] border-b border-[var(--border)]">
                  <th className="text-left pb-3 font-medium">{t('seoPage')}</th>
                  <th className="text-left pb-3 font-medium">{t('seoQuery')}</th>
                  <th className="text-right pb-3 font-medium w-20">{t('seoImp')}</th>
                  <th className="text-right pb-3 font-medium w-16">CTR</th>
                  <th className="text-right pb-3 font-medium w-16">Pos</th>
                </tr>
              </thead>
              <tbody>
                {data.opportunities.map((o, i) => (
                  <tr key={i} className="border-b border-[var(--border)]/50 hover:bg-[var(--muted)]/30 transition-colors">
                    <td className="py-2.5 pr-3">
                      <span className="truncate max-w-[200px] text-xs font-mono block">{pageSlug(o.page)}</span>
                    </td>
                    <td className="pr-3">
                      <span className="truncate max-w-[180px] block">{o.query}</span>
                    </td>
                    <td className="text-right tabular-nums text-[var(--muted-foreground)]">{Number(o.impressions).toLocaleString()}</td>
                    <td className="text-right tabular-nums text-red-400">{(o.ctr * 100).toFixed(1)}%</td>
                    <td className="text-right tabular-nums text-[var(--muted-foreground)]">{o.avg_position.toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}
    </div>
  );
}
