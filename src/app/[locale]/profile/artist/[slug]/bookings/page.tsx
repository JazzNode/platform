'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface BookingInquiry {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  event_type: string | null;
  event_date: string | null;
  venue: string | null;
  budget_range: string | null;
  message: string | null;
  status: 'pending' | 'accepted' | 'declined' | 'archived';
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  accepted: 'bg-green-500/15 text-green-400 border-green-500/30',
  declined: 'bg-red-500/15 text-red-400 border-red-500/30',
  archived: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
};

export default function ArtistBookingsPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');

  const [slug, setSlug] = useState('');
  const [available, setAvailable] = useState(false);
  const [inquiries, setInquiries] = useState<BookingInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  const getToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const fetchInquiries = async () => {
    if (!slug) return;
    const token = await getToken();
    const res = await fetch(`/api/artist/booking?artistId=${slug}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setInquiries(data.inquiries || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from('artists').select('available_for_hire').eq('artist_id', slug).single()
      .then(({ data }) => { if (data) setAvailable(data.available_for_hire || false); });
    fetchInquiries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  const updateStatus = async (id: string, status: string) => {
    const token = await getToken();
    await fetch(`/api/artist/booking/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ artistId: slug, status }),
    });
    setInquiries((prev) =>
      prev.map((inq) => (inq.id === id ? { ...inq, status: status as BookingInquiry['status'] } : inq))
    );
  };

  const filtered = filter === 'all' ? inquiries : inquiries.filter((i) => i.status === filter);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('bookings')}</h1>
      </FadeUp>

      {!available && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 text-center">
            <p className="text-sm text-[var(--muted-foreground)] mb-3">{t('enableHireFirst')}</p>
          </div>
        </FadeUp>
      )}

      {/* Filter pills */}
      <FadeUp>
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {['all', 'pending', 'accepted', 'declined', 'archived'].map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-all ${
                filter === s
                  ? 'bg-[var(--color-gold)]/15 text-[var(--color-gold)] font-semibold'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {s === 'all' ? t('all') : t(s)} ({s === 'all' ? inquiries.length : inquiries.filter((i) => i.status === s).length})
            </button>
          ))}
        </div>
      </FadeUp>

      {/* Inquiry List */}
      {filtered.length === 0 ? (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
            <p className="text-[var(--muted-foreground)]">{t('noBookings')}</p>
          </div>
        </FadeUp>
      ) : (
        <div className="space-y-3">
          {filtered.map((inq) => (
            <FadeUp key={inq.id}>
              <div
                className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 cursor-pointer hover:border-[var(--color-gold)]/20 transition-colors"
                onClick={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-semibold text-sm">{inq.name}</span>
                    <span className="text-xs text-[var(--muted-foreground)] ml-2">{inq.email}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold border ${STATUS_COLORS[inq.status]}`}>
                    {t(inq.status)}
                  </span>
                </div>
                <div className="flex gap-4 text-xs text-[var(--muted-foreground)]">
                  {inq.event_type && <span>{inq.event_type}</span>}
                  {inq.event_date && <span>{new Date(inq.event_date).toLocaleDateString()}</span>}
                  {inq.budget_range && <span>{inq.budget_range}</span>}
                  <span>{new Date(inq.created_at).toLocaleDateString()}</span>
                </div>

                {/* Expanded details */}
                {expandedId === inq.id && (
                  <div className="mt-4 pt-4 border-t border-[var(--border)] space-y-3">
                    {inq.message && <p className="text-sm">{inq.message}</p>}
                    {inq.venue && <p className="text-xs text-[var(--muted-foreground)]">Venue: {inq.venue}</p>}
                    {inq.phone && <p className="text-xs text-[var(--muted-foreground)]">Phone: {inq.phone}</p>}

                    <div className="flex gap-2 pt-2">
                      {inq.status !== 'accepted' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(inq.id, 'accepted'); }}
                          className="px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-xs font-bold hover:bg-green-500/25"
                        >
                          {t('accepted')}
                        </button>
                      )}
                      {inq.status !== 'declined' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(inq.id, 'declined'); }}
                          className="px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 text-xs font-bold hover:bg-red-500/25"
                        >
                          {t('declined')}
                        </button>
                      )}
                      {inq.status !== 'archived' && (
                        <button
                          onClick={(e) => { e.stopPropagation(); updateStatus(inq.id, 'archived'); }}
                          className="px-3 py-1.5 rounded-lg bg-zinc-500/15 text-zinc-400 text-xs font-bold hover:bg-zinc-500/25"
                        >
                          {t('archived')}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </FadeUp>
          ))}
        </div>
      )}
    </div>
  );
}
