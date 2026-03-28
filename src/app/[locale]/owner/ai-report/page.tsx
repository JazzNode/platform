'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAdmin } from '@/components/AdminProvider';

interface KpiMetric { current: number; previous: number; change: number; approved?: number; }

interface ReportData {
  kpis: Record<string, unknown>;
  report: string;
  generatedAt: string;
  monthLabel?: string;
  cached?: boolean;
}

interface HistoryItem {
  id: string;
  generated_at: string;
  preview: string;
}

function ChangeChip({ change }: { change: number }) {
  const positive = change >= 0;
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
      {positive ? '+' : ''}{change}%
    </span>
  );
}

function KpiCard({ label, value, change, sub }: { label: string; value: number; change?: number; sub?: string }) {
  return (
    <div className="bg-[var(--muted)] rounded-xl p-4 flex flex-col gap-2">
      <p className="text-xs text-[var(--muted-foreground)]">{label}</p>
      <p className="text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
      <div className="flex items-center gap-2">
        {change !== undefined && <ChangeChip change={change} />}
        {sub && <span className="text-xs text-[var(--muted-foreground)]">{sub}</span>}
      </div>
    </div>
  );
}

function ReportText({ text }: { text: string }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-3 text-sm leading-relaxed text-[var(--foreground)]">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;
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
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const fetchReport = useCallback(async (id?: string) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const url = id ? `/api/owner/ai-report?id=${id}` : '/api/owner/ai-report';
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchHistory = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/owner/ai-report?history=true', { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (res.ok) setHistory(json.reports || []);
    } catch {}
  }, [token]);

  // Auto-load today's report + history on mount
  useEffect(() => {
    if (token) {
      fetchReport();
      fetchHistory();
    }
  }, [token, fetchReport, fetchHistory]);

  const kpis = data?.kpis as Record<string, KpiMetric & { topArtists?: { name: string; views: number }[]; topVenues?: { name: string; views: number }[]; topCities?: { city: string; views: number }[] }> | null;

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
        <div className="flex items-center gap-2 shrink-0">
          {history.length > 0 && (
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              歷史
            </button>
          )}
          <button
            onClick={() => { fetchReport(); fetchHistory(); }}
            disabled={loading || data?.cached === true}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                分析中…
              </>
            ) : data?.cached ? '今日已生成' : data ? '重新生成' : '生成報告'}
          </button>
        </div>
      </div>

      {/* History dropdown */}
      {showHistory && history.length > 0 && (
        <div className="mb-6 bg-[var(--muted)] rounded-xl p-3 space-y-1">
          <p className="text-xs text-[var(--muted-foreground)] font-semibold mb-2">歷史報告</p>
          {history.map((h) => (
            <button
              key={h.id}
              onClick={() => { fetchReport(h.id); setShowHistory(false); }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[rgba(240,237,230,0.06)] transition-colors"
            >
              <span className="text-xs text-[var(--muted-foreground)]">
                {new Date(h.generated_at).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
              <p className="text-[var(--foreground)] truncate mt-0.5">{h.preview}</p>
            </button>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>
      )}

      {/* Empty state */}
      {!data && !loading && !error && (
        <div className="py-24 text-center text-[var(--muted-foreground)]">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
          </svg>
          <p className="text-sm">載入中…</p>
        </div>
      )}

      {/* Report */}
      {data && (
        <div className="space-y-8">
          {/* KPI Grid */}
          {kpis?.views && (
            <section>
              <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">關鍵指標（過去 30 天）</h2>
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {kpis.views && <KpiCard label="頁面瀏覽" value={(kpis.views as KpiMetric).current} change={(kpis.views as KpiMetric).change} />}
                {kpis.users && <KpiCard label="新增用戶" value={(kpis.users as KpiMetric).current} change={(kpis.users as KpiMetric).change} />}
                {kpis.follows && <KpiCard label="新增追蹤" value={(kpis.follows as KpiMetric).current} change={(kpis.follows as KpiMetric).change} />}
                {kpis.events && <KpiCard label="新增活動" value={(kpis.events as KpiMetric).current} change={(kpis.events as KpiMetric).change} />}
                {kpis.claims && <KpiCard label="認領申請" value={(kpis.claims as KpiMetric).current} change={(kpis.claims as KpiMetric).change} sub={`已核准 ${(kpis.claims as KpiMetric).approved}`} />}
              </div>
            </section>
          )}

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
