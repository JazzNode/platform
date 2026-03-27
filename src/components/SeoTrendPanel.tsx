'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from '@/components/ThemeProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface QueryTrend {
  query: string;
  totalClicks: number;
  totalImpressions: number;
  avgPosition: number;
  trend: { date: string; position: number; clicks: number }[];
}

export default function SeoTrendPanel({ entityId }: { entityId: string }) {
  const t = useTranslations('artistStudio');
  const { theme } = useTheme();
  const GOLD = theme.accent;

  const [data, setData] = useState<QueryTrend[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/api/artist/seo-trends?artistId=${entityId}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json.topQueries || []);
        if (json.topQueries?.length > 0) setSelectedQuery(json.topQueries[0].query);
      }
      setLoading(false);
    };
    fetchData();
  }, [entityId]);

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold mb-4">
            {t('seoTrends')}
          </h2>
          <p className="text-sm text-[var(--muted-foreground)] text-center py-4">{t('noData')}</p>
        </div>
      </FadeUp>
    );
  }

  const selected = data.find((q) => q.query === selectedQuery);

  return (
    <FadeUp>
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
        <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
          {t('seoTrends')}
        </h2>

        {/* Query selector pills */}
        <div className="flex flex-wrap gap-2">
          {data.slice(0, 8).map((q) => (
            <button
              key={q.query}
              onClick={() => setSelectedQuery(q.query)}
              className={`px-3 py-1 rounded-lg text-xs transition-all ${
                selectedQuery === q.query
                  ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-semibold border border-[var(--color-gold)]/30'
                  : 'bg-[var(--muted)] text-[var(--muted-foreground)] border border-transparent'
              }`}
            >
              {q.query}
            </button>
          ))}
        </div>

        {/* Stats row for selected query */}
        {selected && (
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-[var(--background)] rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t('seoClicks')}</p>
              <p className="text-lg font-bold">{selected.totalClicks}</p>
            </div>
            <div className="bg-[var(--background)] rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t('seoImpressions')}</p>
              <p className="text-lg font-bold">{selected.totalImpressions.toLocaleString()}</p>
            </div>
            <div className="bg-[var(--background)] rounded-xl p-3">
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">{t('seoAvgPosition')}</p>
              <p className="text-lg font-bold">{selected.avgPosition.toFixed(1)}</p>
            </div>
          </div>
        )}

        {/* Position trend chart */}
        {selected && selected.trend.length > 0 && (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={selected.trend}>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: '#999' }}
                tickFormatter={(v) => v.slice(5)}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                reversed
                tick={{ fontSize: 10, fill: '#999' }}
                width={30}
                axisLine={false}
                tickLine={false}
                domain={['dataMin - 1', 'dataMax + 1']}
                label={{ value: t('seoPosition'), angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#999' } }}
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
              />
              <Line
                type="monotone"
                dataKey="position"
                stroke={GOLD}
                strokeWidth={2}
                dot={false}
                name={t('seoPosition')}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </FadeUp>
  );
}
