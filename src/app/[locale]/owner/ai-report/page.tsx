'use client';

import { useState, useCallback } from 'react';
import { useAdmin } from '@/components/AdminProvider';

interface KpiMetric {
  current: number;
  previous: number;
  change: number;
  approved?: number;
}

interface ReportData {
  kpis: {
    views: KpiMetric;
    users: KpiMetric;
    follows: KpiMetric;
    events: KpiMetric;
    claims: KpiMetric;
    newSubs: number;
    totals: { artists: number; venues: number; events: number };
  };
  topArtists: { name: string; views: number }[];
  topVenues: { name: string; views: number }[];
  topCities: { city: string; views: number }[];
  report: string;
  generatedAt: string;
  monthLabel: string;
}

function ChangeChip({ change }: { change: number }) {
  const positive = change >= 0;
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
      {positive ? '+' : ''}{change}%
    </span>
  );
}

function KpiCard({ label, value, change, sub }: { label: string; value: number; change: number; sub?: string }) {
  return (
    <div className="bg-[var(--muted)] rounded-xl p-4 flex flex-col gap-2">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
      <div className="flex items-center gap-2">
        <ChangeChip change={change} />
        {sub && <span className="text-xs text-[var(--muted-foreground)]">{sub}</span>}
      </div>
    </div>
  );
}

function ReportText({ text }: { text: string }) {
  // Render **bold** and line breaks
  const lines = text.split('\n');
  return (
    <div className="space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
        // Bold headings (**text**)
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i}>
            {parts.map((part, j) =>
              part.startsWith('**') && part.endsWith('**')
                ? <strong key={j} className="text-[var(--foreground)] font-semibold">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function OwnerAIReportPage() {
  const { token } = useAdmin();
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/owner/ai-report', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  return (
    <div className="max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">AI 月度報告</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            平台過去 30 天營運數據摘要與 AI 分析建議
          </p>
        </div>
        <button
          onClick={generate}
          disabled={loading}
          className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
              分析中…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
              </svg>
              {data ? '重新生成' : '生成報告'}
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="py-24 text-center text-[var(--muted-foreground)]">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
          </svg>
          <p className="text-sm">點擊「生成報告」以分析本月平台數據</p>
        </div>
      )}

      {/* Data */}
      {data && (
        <div className="space-y-8">
          {/* KPI Grid */}
          <section>
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">關鍵指標（過去 30 天）</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <KpiCard label="頁面瀏覽" value={data.kpis.views.current} change={data.kpis.views.change} />
              <KpiCard label="新增用戶" value={data.kpis.users.current} change={data.kpis.users.change} />
              <KpiCard label="新增追蹤" value={data.kpis.follows.current} change={data.kpis.follows.change} />
              <KpiCard label="新增活動" value={data.kpis.events.current} change={data.kpis.events.change} />
              <KpiCard
                label="認領申請"
                value={data.kpis.claims.current}
                change={data.kpis.claims.change}
                sub={`已核准 ${data.kpis.claims.approved}`}
              />
              <KpiCard label="新增訂閱" value={data.kpis.newSubs} change={0} />
            </div>
          </section>

          {/* Totals */}
          <section>
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">平台規模</h2>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: '藝人總數', value: data.kpis.totals.artists },
                { label: '場地總數', value: data.kpis.totals.venues },
                { label: '活動總數', value: data.kpis.totals.events },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[var(--muted)] rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">{label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Top lists */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Top Artists */}
            <section className="bg-[var(--muted)] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">熱門藝人</h2>
              {data.topArtists.length === 0
                ? <p className="text-xs text-[var(--muted-foreground)]">無數據</p>
                : <ol className="space-y-2">
                  {data.topArtists.map((a, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[var(--muted-foreground)] w-4 shrink-0">{i + 1}</span>
                        <span className="truncate">{a.name}</span>
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)] shrink-0">{a.views.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              }
            </section>

            {/* Top Venues */}
            <section className="bg-[var(--muted)] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">熱門場地</h2>
              {data.topVenues.length === 0
                ? <p className="text-xs text-[var(--muted-foreground)]">無數據</p>
                : <ol className="space-y-2">
                  {data.topVenues.map((v, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[var(--muted-foreground)] w-4 shrink-0">{i + 1}</span>
                        <span className="truncate">{v.name}</span>
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)] shrink-0">{v.views.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              }
            </section>

            {/* Top Cities */}
            <section className="bg-[var(--muted)] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">主要城市</h2>
              {data.topCities.length === 0
                ? <p className="text-xs text-[var(--muted-foreground)]">無 GeoIP 數據</p>
                : <ol className="space-y-2">
                  {data.topCities.map((c, i) => (
                    <li key={i} className="flex items-center justify-between gap-2 text-sm">
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-[var(--muted-foreground)] w-4 shrink-0">{i + 1}</span>
                        <span className="truncate">{c.city}</span>
                      </span>
                      <span className="text-xs text-[var(--muted-foreground)] shrink-0">{c.views.toLocaleString()}</span>
                    </li>
                  ))}
                </ol>
              }
            </section>
          </div>

          {/* AI Report */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">AI 分析報告</h2>
              <span className="text-xs text-[var(--muted-foreground)]">
                {new Date(data.generatedAt).toLocaleString('zh-TW', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-5 border border-red-500/10">
              <ReportText text={data.report} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
