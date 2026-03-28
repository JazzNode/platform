'use client';

import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAdmin } from '@/components/AdminProvider';

interface ReportData {
  kpis: {
    views?: { current: number; change: number };
    followers?: { current: number; change: number };
    shoutouts?: { current: number };
    gigs?: { current: number; change: number };
    topCities?: { city: string; count: number }[];
  };
  report: string;
  generatedAt: string;
  cached?: boolean;
}

interface HistoryItem { id: string; generated_at: string; preview: string; }

function ChangeChip({ change }: { change: number }) {
  const positive = change >= 0;
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md ${positive ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
      {positive ? '+' : ''}{change}%
    </span>
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
                ? <strong key={j} className="font-semibold">{part.slice(2, -2)}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

export default function ArtistAIReportPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { token } = useAdmin();
  const [artistId, setArtistId] = useState<string | null>(null);
  const [data, setData] = useState<ReportData | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    if (!slug) return;
    import('@/utils/supabase/client').then(({ createClient }) => {
      const supabase = createClient();
      supabase.from('artists').select('artist_id').eq('artist_id', slug).single()
        .then(({ data }) => setArtistId(data?.artist_id || slug));
    });
  }, [slug]);

  const fetchReport = useCallback(async (id?: string) => {
    if (!token || !artistId) return;
    setLoading(true);
    setError(null);
    try {
      const url = id
        ? `/api/artist/ai-report?artistId=${artistId}&id=${id}`
        : `/api/artist/ai-report?artistId=${artistId}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Failed');
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [token, artistId]);

  const fetchHistory = useCallback(async () => {
    if (!token || !artistId) return;
    try {
      const res = await fetch(`/api/artist/ai-report?artistId=${artistId}&history=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (res.ok) setHistory(json.reports || []);
    } catch {}
  }, [token, artistId]);

  useEffect(() => {
    if (token && artistId) {
      fetchReport();
      fetchHistory();
    }
  }, [token, artistId, fetchReport, fetchHistory]);

  return (
    <div className="max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold">AI 月度報告</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">藝人過去 30 天數據摘要與 AI 分析建議</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {history.length > 0 && (
            <button onClick={() => setShowHistory(!showHistory)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
              歷史
            </button>
          )}
          <button
            onClick={() => { fetchReport(); fetchHistory(); }}
            disabled={loading || data?.cached === true}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--color-gold)]/10 hover:bg-[var(--color-gold)]/20 text-[var(--color-gold)] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <><span className="w-4 h-4 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />分析中…</>
            ) : data?.cached ? '今日已生成' : data ? '重新生成' : '生成報告'}
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mb-6 bg-[var(--muted)] rounded-xl p-3 space-y-1">
          <p className="text-xs text-[var(--muted-foreground)] font-semibold mb-2">歷史報告</p>
          {history.map((h) => (
            <button key={h.id} onClick={() => { fetchReport(h.id); setShowHistory(false); }} className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-[rgba(240,237,230,0.06)] transition-colors">
              <span className="text-xs text-[var(--muted-foreground)]">{new Date(h.generated_at).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <p className="text-[var(--foreground)] truncate mt-0.5">{h.preview}</p>
            </button>
          ))}
        </div>
      )}

      {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

      {!data && !loading && !error && (
        <div className="py-24 text-center text-[var(--muted-foreground)]">
          <svg className="w-12 h-12 mx-auto mb-4 opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" /></svg>
          <p className="text-sm">載入中…</p>
        </div>
      )}

      {data && (
        <div className="space-y-8">
          <section>
            <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">關鍵指標（過去 30 天）</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {data.kpis.views && (
                <div className="bg-[var(--muted)] rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-xs text-[var(--muted-foreground)]">頁面瀏覽</p>
                  <p className="text-2xl font-bold tabular-nums">{data.kpis.views.current.toLocaleString()}</p>
                  <ChangeChip change={data.kpis.views.change} />
                </div>
              )}
              {data.kpis.followers && (
                <div className="bg-[var(--muted)] rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-xs text-[var(--muted-foreground)]">新增追蹤</p>
                  <p className="text-2xl font-bold tabular-nums">{data.kpis.followers.current.toLocaleString()}</p>
                  <ChangeChip change={data.kpis.followers.change} />
                </div>
              )}
              {data.kpis.shoutouts && (
                <div className="bg-[var(--muted)] rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-xs text-[var(--muted-foreground)]">推薦</p>
                  <p className="text-2xl font-bold tabular-nums">{data.kpis.shoutouts.current.toLocaleString()}</p>
                </div>
              )}
              {data.kpis.gigs && (
                <div className="bg-[var(--muted)] rounded-xl p-4 flex flex-col gap-2">
                  <p className="text-xs text-[var(--muted-foreground)]">演出場次</p>
                  <p className="text-2xl font-bold tabular-nums">{data.kpis.gigs.current.toLocaleString()}</p>
                  <ChangeChip change={data.kpis.gigs.change} />
                </div>
              )}
            </div>
          </section>

          {data.kpis.topCities && data.kpis.topCities.length > 0 && (
            <section className="bg-[var(--muted)] rounded-xl p-4">
              <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider mb-3">主要城市</h2>
              <ol className="space-y-2">
                {data.kpis.topCities.map((c, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2"><span className="text-xs text-[var(--muted-foreground)] w-4">{i + 1}</span>{c.city}</span>
                    <span className="text-xs text-[var(--muted-foreground)]">{c.count}</span>
                  </li>
                ))}
              </ol>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">AI 分析報告</h2>
              <span className="text-xs text-[var(--muted-foreground)]">
                {new Date(data.generatedAt).toLocaleString('zh-TW', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="bg-[var(--muted)] rounded-xl p-5 border border-[var(--color-gold)]/10">
              <ReportText text={data.report} />
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
