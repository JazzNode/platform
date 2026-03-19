'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/utils/supabase/client';

interface NewEvent {
  event_id: string;
  title_local: string | null;
  title_en: string | null;
  start_at: string | null;
  timezone: string | null;
  created_at: string;
  venue_id: string | null;
  venue_name: string | null;
  venue_city: string | null;
  audit_status: string | null;
}

type AuditStatus = 'need_fix' | 'checked' | null;

export default function AdminNewEventsPage() {
  const t = useTranslations('adminHQ');
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const [events, setEvents] = useState<NewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(14);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const supabase = createClient();
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);

      const { data, error } = await supabase
        .from('events')
        .select(`
          event_id,
          title_local,
          title_en,
          start_at,
          timezone,
          created_at,
          audit_status,
          venue_id,
          venues!events_venue_id_fkey ( display_name, name_local, name_en, city_id, cities!venues_city_id_fkey ( name_en, name_local ) )
        `)
        .gte('created_at', cutoff.toISOString())
        .order('created_at', { ascending: false });

      if (!cancelled && data) {
        const mapped: NewEvent[] = data.map((row: Record<string, unknown>) => {
          const venue = row.venues as Record<string, unknown> | null;
          const city = venue?.cities as Record<string, unknown> | null;
          return {
            event_id: row.event_id as string,
            title_local: row.title_local as string | null,
            title_en: row.title_en as string | null,
            start_at: row.start_at as string | null,
            timezone: (row.timezone as string | null) || 'Asia/Taipei',
            created_at: row.created_at as string,
            venue_id: row.venue_id as string | null,
            venue_name: (venue?.display_name || venue?.name_local || venue?.name_en || null) as string | null,
            venue_city: (city?.name_local || city?.name_en || null) as string | null,
            audit_status: (row.audit_status as string | null) || null,
          };
        });
        setEvents(mapped);
      }
      if (error) console.error('Failed to fetch new events:', error);
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [days]);

  const toggleAudit = useCallback(async (eventId: string, newStatus: AuditStatus) => {
    const supabase = createClient();
    // Capture previous status before optimistic update
    const prevStatus = events.find((e) => e.event_id === eventId)?.audit_status ?? null;
    // Optimistic update
    setEvents((prev) =>
      prev.map((e) =>
        e.event_id === eventId ? { ...e, audit_status: newStatus } : e
      )
    );
    const { error } = await supabase
      .from('events')
      .update({ audit_status: newStatus })
      .eq('event_id', eventId);
    if (error) {
      console.error('Failed to update audit status:', error);
      // Revert to captured previous status
      setEvents((prev) =>
        prev.map((e) =>
          e.event_id === eventId ? { ...e, audit_status: prevStatus } : e
        )
      );
    }
  }, [events]);

  // Group by created_at date
  const grouped = useMemo(() => {
    const map = new Map<string, NewEvent[]>();
    for (const e of events) {
      const dateKey = e.created_at.slice(0, 10);
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey)!.push(e);
    }
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [events]);

  function relativeDate(dateStr: string): string {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    if (dateStr === todayStr) return tCommon('today');
    if (dateStr === yesterdayStr) return tCommon('yesterday');
    return dateStr;
  }

  function formatEventDate(iso: string | null, tz: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', weekday: 'short',
      timeZone: tz,
    });
  }

  function formatEventTime(iso: string | null, tz: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: tz,
    });
  }

  const eventTitle = (e: NewEvent) => e.title_local || e.title_en || '(untitled)';

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold font-serif">{t('newEvents')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {tCommon('newEventsCount')}: {events.length}
          </p>
        </div>
        {/* Day range filter */}
        <div className="flex items-center gap-2">
          {[3, 7, 14, 30].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                days === d
                  ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] border border-[var(--color-gold)]/30'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)] border border-[var(--border)]'
              }`}
            >
              {d}d
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
        </div>
      )}

      {!loading && events.length === 0 && (
        <p className="text-[var(--muted-foreground)] py-8 text-center">{tCommon('noNewEvents')}</p>
      )}

      {!loading && grouped.map(([dateKey, dateEvents]) => (
        <section key={dateKey}>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-lg font-bold font-serif text-[var(--color-gold)]">
              {relativeDate(dateKey)}
            </h2>
            <span className="text-xs text-[var(--muted-foreground)] bg-[var(--muted)] px-2 py-0.5 rounded-full">
              +{dateEvents.length}
            </span>
          </div>
          <div className="space-y-2">
            {dateEvents.map((event) => {
              const tz = event.timezone || 'Asia/Taipei';
              return (
                <div
                  key={event.event_id}
                  className="flex items-center gap-4 p-4 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:border-[var(--color-gold)]/30 transition-colors group"
                >
                  {/* Clickable event info area */}
                  <Link
                    href={`/${locale}/events/${event.event_id}`}
                    target="_blank"
                    className="flex items-start gap-4 flex-1 min-w-0"
                  >
                    {/* Time column */}
                    <div className="shrink-0 w-20 text-right">
                      <p className="text-xs text-[var(--color-gold)] font-medium">
                        {formatEventDate(event.start_at, tz)}
                      </p>
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        {formatEventTime(event.start_at, tz)}
                      </p>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="font-serif font-bold text-sm group-hover:text-[var(--color-gold)] transition-colors truncate">
                        {eventTitle(event)}
                      </p>
                      {event.venue_name && (
                        <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                          {event.venue_city ? `${event.venue_city} · ` : ''}{event.venue_name}
                        </p>
                      )}
                    </div>

                    {/* Created time */}
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-[var(--muted-foreground)]">
                        {new Date(event.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}
                      </p>
                    </div>
                  </Link>

                  {/* Audit buttons */}
                  <div className="shrink-0 flex items-center gap-1.5">
                    <button
                      onClick={() =>
                        toggleAudit(event.event_id, event.audit_status === 'need_fix' ? null : 'need_fix')
                      }
                      title="Need Fix"
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all border ${
                        event.audit_status === 'need_fix'
                          ? 'bg-red-500/15 text-red-400 border-red-500/30'
                          : 'text-[var(--muted-foreground)] border-[var(--border)] hover:text-red-400 hover:border-red-500/30'
                      }`}
                    >
                      need fix
                    </button>
                    <button
                      onClick={() =>
                        toggleAudit(event.event_id, event.audit_status === 'checked' ? null : 'checked')
                      }
                      title="Checked"
                      className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all border ${
                        event.audit_status === 'checked'
                          ? 'bg-green-500/15 text-green-400 border-green-500/30'
                          : 'text-[var(--muted-foreground)] border-[var(--border)] hover:text-green-400 hover:border-green-500/30'
                      }`}
                    >
                      checked
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
