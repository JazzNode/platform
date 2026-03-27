'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '@/components/AdminProvider';
import FadeUp from '@/components/animations/FadeUp';

interface Subscription {
  id: string;
  user_id: string;
  venue_name: string;
  venue_address: string | null;
  contact_name: string | null;
  contact_email: string;
  contact_phone: string | null;
  plan: string;
  notes: string | null;
  status: string;
  venue_id: string | null;
  created_at: string;
  user_display: string | null;
  user_avatar: string | null;
}

export default function AdminSubscriptionsPage() {
  const { token } = useAdmin();
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/subscriptions', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => { setSubs(data.subscriptions || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const handleAction = useCallback(async (subId: string, action: string) => {
    if (!token || processing) return;
    setProcessing(subId);
    try {
      const res = await fetch('/api/admin/subscriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subId, action }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubs((prev) =>
          prev.map((s) =>
            s.id === subId
              ? { ...s, status: action === 'activate' ? 'approved' : action === 'contact' ? 'contacted' : 'rejected', venue_id: data.venueId || s.venue_id }
              : s,
          ),
        );
      }
    } catch {}
    setProcessing(null);
  }, [token, processing]);

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const statusStyle: Record<string, string> = {
    pending: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    contacted: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    approved: 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20',
    rejected: 'bg-red-400/10 text-red-400 border-red-400/20',
  };

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">Venue Subscriptions</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage Elite venue subscription requests</p>
      </FadeUp>

      <FadeUp>
        <div className="space-y-3">
          {subs.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">No subscription requests yet.</p>
            </div>
          ) : (
            subs.map((sub) => (
              <div key={sub.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-semibold">{sub.venue_name}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${statusStyle[sub.status] || statusStyle.pending}`}>
                        {sub.status}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {sub.user_display || sub.contact_email} · {new Date(sub.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-[var(--color-gold)]/10 text-[var(--color-gold)] font-bold uppercase">
                    {sub.plan}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs text-[var(--muted-foreground)] mb-3">
                  {sub.venue_address && <div><span className="font-medium text-[var(--foreground)]">Address:</span> {sub.venue_address}</div>}
                  <div><span className="font-medium text-[var(--foreground)]">Email:</span> {sub.contact_email}</div>
                  {sub.contact_phone && <div><span className="font-medium text-[var(--foreground)]">Phone:</span> {sub.contact_phone}</div>}
                  {sub.contact_name && <div><span className="font-medium text-[var(--foreground)]">Contact:</span> {sub.contact_name}</div>}
                </div>

                {sub.notes && (
                  <p className="text-xs text-[var(--muted-foreground)] italic mb-3 bg-[var(--background)] rounded-lg p-3">
                    {sub.notes}
                  </p>
                )}

                {sub.venue_id && (
                  <p className="text-xs text-emerald-400 mb-3">Venue ID: <code className="font-mono">{sub.venue_id}</code></p>
                )}

                {sub.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(sub.id, 'activate')}
                      disabled={processing === sub.id}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
                    >
                      {processing === sub.id ? '...' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleAction(sub.id, 'contact')}
                      disabled={processing === sub.id}
                      className="px-4 py-2 rounded-xl bg-blue-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
                    >
                      Contacted
                    </button>
                    <button
                      onClick={() => handleAction(sub.id, 'reject')}
                      disabled={processing === sub.id}
                      className="px-4 py-2 rounded-xl text-red-400 border border-red-400/30 font-bold text-xs uppercase tracking-widest hover:bg-red-400/10 transition-colors disabled:opacity-30"
                    >
                      Reject
                    </button>
                  </div>
                )}

                {sub.status === 'contacted' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleAction(sub.id, 'activate')}
                      disabled={processing === sub.id}
                      className="px-4 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
                    >
                      {processing === sub.id ? '...' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </FadeUp>
    </div>
  );
}
