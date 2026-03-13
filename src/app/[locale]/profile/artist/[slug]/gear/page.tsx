'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface GearItem {
  id: string;
  gear_name: string;
  gear_type: string;
  brand: string | null;
  model: string | null;
  photo_url: string | null;
  display_order: number;
}

const GEAR_TYPES = ['instrument', 'amp', 'effect', 'accessory', 'other'] as const;

export default function ArtistGearPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const { user } = useAuth();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [gear, setGear] = useState<GearItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ gear_name: '', gear_type: 'instrument', brand: '', model: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from('artists').select('tier').eq('artist_id', slug).single()
      .then(({ data }) => { if (data) setTier(data.tier); });

    fetchGear();
  }, [slug]);

  const fetchGear = async () => {
    if (!slug) return;
    setLoading(true);
    const res = await fetch(`/api/artist/gear?artistId=${slug}`);
    const data = await res.json();
    setGear(data.gear || []);
    setLoading(false);
  };

  const getToken = async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  };

  const handleAdd = async () => {
    if (!form.gear_name.trim()) return;
    setSaving(true);
    const token = await getToken();
    const res = await fetch('/api/artist/gear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ artistId: slug, ...form }),
    });
    const data = await res.json();
    if (data.success) {
      setGear((prev) => [...prev, data.gear]);
      setForm({ gear_name: '', gear_type: 'instrument', brand: '', model: '' });
      setShowForm(false);
    } else {
      alert(data.error);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const token = await getToken();
    await fetch(`/api/artist/gear/${id}?artistId=${slug}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    setGear((prev) => prev.filter((g) => g.id !== id));
  };

  const maxItems = tier < 2 ? 3 : Infinity;

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
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('gear')}</h1>
          {gear.length < maxItems && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              {t('addGear')}
            </button>
          )}
        </div>
        {tier < 2 && (
          <p className="text-xs text-[var(--muted-foreground)] mt-1">
            {t('gearUsed', { count: gear.length, max: 3 })}
          </p>
        )}
      </FadeUp>

      {/* Add Gear Form */}
      {showForm && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <input
              type="text"
              placeholder={t('gearName')}
              value={form.gear_name}
              onChange={(e) => setForm({ ...form, gear_name: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-sm focus:outline-none focus:border-[var(--color-gold)]/40"
            />
            <div className="grid grid-cols-2 gap-4">
              <select
                value={form.gear_type}
                onChange={(e) => setForm({ ...form, gear_type: e.target.value })}
                className="px-4 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-sm focus:outline-none"
              >
                {GEAR_TYPES.map((gt) => (
                  <option key={gt} value={gt}>{gt.charAt(0).toUpperCase() + gt.slice(1)}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder={t('gearBrand')}
                value={form.brand}
                onChange={(e) => setForm({ ...form, brand: e.target.value })}
                className="px-4 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-sm focus:outline-none"
              />
            </div>
            <input
              type="text"
              placeholder={t('gearModel')}
              value={form.model}
              onChange={(e) => setForm({ ...form, model: e.target.value })}
              className="w-full px-4 py-2 rounded-xl bg-[var(--muted)] border border-[var(--border)] text-sm focus:outline-none"
            />
            <div className="flex gap-3">
              <button
                onClick={handleAdd}
                disabled={saving || !form.gear_name.trim()}
                className="px-6 py-2 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase disabled:opacity-50"
              >
                {saving ? '...' : t('addGear')}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              >
                {t('cancel')}
              </button>
            </div>
          </div>
        </FadeUp>
      )}

      {/* Gear List */}
      {gear.length === 0 ? (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-12 text-center">
            <p className="text-[var(--muted-foreground)]">{t('noGear')}</p>
          </div>
        </FadeUp>
      ) : (
        <div className="space-y-3">
          {gear.map((item) => (
            <FadeUp key={item.id}>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {item.photo_url ? (
                    <img src={item.photo_url} alt="" className="w-12 h-12 rounded-xl object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center text-[var(--muted-foreground)]">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M9 19V6l12-3v13M9 19c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2zm12-3c0 1.1-1.34 2-3 2s-3-.9-3-2 1.34-2 3-2 3 .9 3 2z" />
                      </svg>
                    </div>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{item.gear_name}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {[item.brand, item.model].filter(Boolean).join(' · ') || item.gear_type}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </FadeUp>
          ))}
        </div>
      )}

      {/* Tier upgrade nudge */}
      {tier < 2 && gear.length >= 3 && (
        <FadeUp>
          <div className="bg-gradient-to-br from-[var(--color-gold)]/5 to-[var(--color-gold)]/10 border border-[var(--color-gold)]/20 rounded-2xl p-6 text-center">
            <p className="text-sm mb-3">{t('gearLimitReached')}</p>
            <button className="px-6 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {t('upgradePremium')}
            </button>
          </div>
        </FadeUp>
      )}
    </div>
  );
}
