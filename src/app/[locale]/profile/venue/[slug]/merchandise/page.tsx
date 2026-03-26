'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { useAdmin } from '@/components/AdminProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

interface MerchItem {
  id: string;
  venue_id: string;
  name: string;
  description: string | null;
  price: number | null;
  image_url: string | null;
  external_url: string | null;
  available: boolean;
  sort_order: number;
  created_at: string;
}

async function getFreshToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token;
}

export default function VenueMerchandisePage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const locale = useLocale();
  const { user, loading } = useAuth();
  const { previewVenueTier, adminModeEnabled } = useAdmin();
  const { isUnlocked, minTier } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [items, setItems] = useState<MerchItem[]>([]);
  const [fetching, setFetching] = useState(true);

  // Form state
  const [composing, setComposing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [available, setAvailable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();
    supabase
      .from('venues')
      .select('tier')
      .eq('venue_id', slug)
      .single()
      .then(({ data }) => { if (data) setTier(data.tier); });

    fetch(`/api/venue/merchandise?venueId=${slug}`)
      .then((res) => res.json())
      .then((data) => { setItems(data.items || []); setFetching(false); })
      .catch(() => setFetching(false));
  }, [slug, user]);

  const resetForm = () => {
    setName(''); setDescription(''); setPrice(''); setExternalUrl('');
    setImageUrl(null); setAvailable(true); setEditingId(null); setComposing(false);
  };

  const handleUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slug) return;
    setUploading(true);
    try {
      const freshToken = await getFreshToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('venueId', slug);
      const res = await fetch('/api/venue/merchandise/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      });
      const data = await res.json();
      if (res.ok && data.image_url) {
        setImageUrl(data.image_url);
      }
    } catch {}
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [slug]);

  const handleSave = useCallback(async () => {
    if (!name.trim() || !slug || !user || saving) return;
    setSaving(true);
    try {
      if (editingId) {
        const res = await fetch('/api/venue/merchandise', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId, venueId: slug,
            name: name.trim(),
            description: description.trim() || null,
            price: price ? parseInt(price, 10) : null,
            imageUrl: imageUrl,
            externalUrl: externalUrl.trim() || null,
            available,
          }),
        });
        if (res.ok) {
          setItems((prev) => prev.map((i) =>
            i.id === editingId ? {
              ...i, name: name.trim(), description: description.trim() || null,
              price: price ? parseInt(price, 10) : null, image_url: imageUrl,
              external_url: externalUrl.trim() || null, available,
            } : i,
          ));
          resetForm();
        }
      } else {
        const res = await fetch('/api/venue/merchandise', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            venueId: slug, name: name.trim(),
            description: description.trim() || null,
            price: price ? parseInt(price, 10) : null,
            imageUrl: imageUrl,
            externalUrl: externalUrl.trim() || null,
            available,
          }),
        });
        const data = await res.json();
        if (res.ok && data.id) {
          setItems((prev) => [...prev, {
            id: data.id, venue_id: slug, name: name.trim(),
            description: description.trim() || null,
            price: price ? parseInt(price, 10) : null,
            image_url: imageUrl, external_url: externalUrl.trim() || null,
            available, sort_order: prev.length, created_at: new Date().toISOString(),
          }]);
          resetForm();
        }
      }
    } catch {}
    setSaving(false);
  }, [name, description, price, externalUrl, imageUrl, available, slug, user, saving, editingId]);

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch('/api/venue/merchandise', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, venueId: slug }),
    });
    if (res.ok) setItems((prev) => prev.filter((i) => i.id !== id));
  }, [slug]);

  const handleToggleAvailable = useCallback(async (item: MerchItem) => {
    const res = await fetch('/api/venue/merchandise', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: item.id, venueId: slug, available: !item.available }),
    });
    if (res.ok) {
      setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, available: !i.available } : i));
    }
  }, [slug]);

  const startEdit = (item: MerchItem) => {
    setEditingId(item.id);
    setName(item.name);
    setDescription(item.description || '');
    setPrice(item.price != null ? String(item.price) : '');
    setExternalUrl(item.external_url || '');
    setImageUrl(item.image_url);
    setAvailable(item.available);
    setComposing(true);
  };

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const effectiveTier = previewVenueTier ?? tier;
  const merchMinTier = minTier('venue', 'merchandise');

  if (!isUnlocked('venue', 'merchandise', effectiveTier, adminModeEnabled)) {
    return (
      <div className="space-y-6">
        <FadeUp><h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('merchandiseTitle')}</h1></FadeUp>
        <FadeUp>
          <div className="bg-gradient-to-br from-purple-400/5 to-purple-400/10 border border-purple-400/20 rounded-2xl p-8 text-center">
            <svg className="w-16 h-16 text-purple-400/30 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 0 1-8 0" />
            </svg>
            <h2 className="text-lg font-bold mb-2">{t('merchandiseLocked')}</h2>
            <p className="text-sm text-[var(--muted-foreground)] mb-1">{t('merchandiseLockedDesc')}</p>
            <p className="text-xs text-[var(--muted-foreground)]/60 mb-6">{t('premiumLockedHint')}</p>
            <Link href={`/${locale}/tiers`} className="inline-block px-6 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity">
              {merchMinTier <= 2 ? t('upgradePremium') : t('upgradeElite')}
            </Link>
          </div>
        </FadeUp>
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-purple-400/50 transition-colors';

  return (
    <div className="space-y-6">
      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('merchandiseTitle')}</h1>
          {!composing && (
            <button
              onClick={() => { resetForm(); setComposing(true); }}
              className="px-4 py-2 rounded-xl bg-purple-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity"
            >
              {t('newProduct')}
            </button>
          )}
        </div>
      </FadeUp>

      {/* Compose / Edit Form */}
      {composing && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
              {editingId ? t('editProduct') : t('newProduct')}
            </h2>

            {/* Image upload */}
            <div>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
              {imageUrl ? (
                <div className="relative w-32 h-32 rounded-xl overflow-hidden border border-[var(--border)] group">
                  <img src={imageUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => { setImageUrl(null); if (fileInputRef.current) fileInputRef.current.click(); }}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                  >
                    {t('changeImage')}
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-32 h-32 rounded-xl border-2 border-dashed border-[var(--border)] hover:border-purple-400/50 flex flex-col items-center justify-center gap-2 transition-colors"
                >
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                  ) : (
                    <>
                      <svg className="w-6 h-6 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="8.5" cy="8.5" r="1.5" />
                        <polyline points="21 15 16 10 5 21" />
                      </svg>
                      <span className="text-xs text-[var(--muted-foreground)]">{t('uploadImage')}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className={inputClass} placeholder={t('productNamePlaceholder')}
            />
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3} className={`${inputClass} resize-none`}
              placeholder={t('productDescPlaceholder')}
            />
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number" value={price} onChange={(e) => setPrice(e.target.value)}
                className={inputClass} placeholder={t('pricePlaceholder')}
                min="0" step="1"
              />
              <input
                type="url" value={externalUrl} onChange={(e) => setExternalUrl(e.target.value)}
                className={inputClass} placeholder={t('externalUrlPlaceholder')}
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox" checked={available} onChange={(e) => setAvailable(e.target.checked)}
                className="w-4 h-4 rounded border-[var(--border)] accent-purple-500"
              />
              <span className="text-sm text-[var(--muted-foreground)]">{t('productAvailable')}</span>
            </label>

            <div className="flex gap-3">
              <button
                onClick={handleSave} disabled={!name.trim() || saving}
                className="px-6 py-2.5 rounded-xl bg-purple-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
              >
                {saving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : editingId ? t('saveChanges') : t('addProduct')}
              </button>
              <button onClick={resetForm} className="px-4 py-2.5 rounded-xl text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                {t('cancel')}
              </button>
            </div>
          </div>
        </FadeUp>
      )}

      {/* Product List */}
      <FadeUp>
        <div className="space-y-3">
          {items.length === 0 && !composing ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">{t('noProducts')}</p>
              <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{t('noProductsHint')}</p>
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className={`bg-[var(--card)] border rounded-2xl p-4 flex gap-4 ${
                item.available ? 'border-[var(--border)]' : 'border-[var(--border)] opacity-50'
              }`}>
                {/* Thumbnail */}
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="w-16 h-16 rounded-xl object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-xl bg-[var(--muted)] flex items-center justify-center shrink-0">
                    <svg className="w-6 h-6 text-[var(--muted-foreground)]/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                )}

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold truncate">{item.name}</h3>
                    {!item.available && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--muted)] text-[var(--muted-foreground)] shrink-0">
                        {t('unavailable')}
                      </span>
                    )}
                  </div>
                  {item.price != null && (
                    <p className="text-sm text-purple-400 font-medium">${item.price}</p>
                  )}
                  {item.description && (
                    <p className="text-xs text-[var(--muted-foreground)] line-clamp-1 mt-0.5">{item.description}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => handleToggleAvailable(item)}
                    className={`p-1.5 rounded-lg text-xs transition-colors ${
                      item.available ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)]'
                    }`} title={item.available ? t('markUnavailable') : t('markAvailable')}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {item.available ? <><polyline points="20 6 9 17 4 12" /></> : <><circle cx="12" cy="12" r="10" /><line x1="4.93" y1="4.93" x2="19.07" y2="19.07" /></>}
                    </svg>
                  </button>
                  <button onClick={() => startEdit(item)} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded-lg text-[var(--muted-foreground)] hover:text-red-400 hover:bg-red-400/10 transition-colors">
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </FadeUp>
    </div>
  );
}
