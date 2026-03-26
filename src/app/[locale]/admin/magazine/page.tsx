'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import Image from 'next/image';

// ---------- Types ----------

interface Article {
  id: string;
  slug: string;
  status: string;
  category: string;
  is_featured: boolean;
  title_en: string | null;
  title_zh: string | null;
  title_ja: string | null;
  title_ko: string | null;
  title_th: string | null;
  title_id: string | null;
  excerpt_en: string | null;
  excerpt_zh: string | null;
  excerpt_ja: string | null;
  excerpt_ko: string | null;
  excerpt_th: string | null;
  excerpt_id: string | null;
  body_en: string | null;
  body_zh: string | null;
  body_ja: string | null;
  body_ko: string | null;
  body_th: string | null;
  body_id: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  linked_artist_ids: string[];
  linked_venue_ids: string[];
  linked_city_ids: string[];
  author_name: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  source_lang: string;
}

const CATEGORY_KEYS = [
  { value: 'artist-feature', key: 'magazineCatArtist' },
  { value: 'venue-spotlight', key: 'magazineCatVenue' },
  { value: 'scene-report', key: 'magazineCatScene' },
  { value: 'culture', key: 'magazineCatCulture' },
] as const;

const LANG_OPTIONS = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
  { value: 'th', label: 'ไทย' },
  { value: 'id', label: 'Indonesia' },
] as const;

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-zinc-500/20 text-zinc-400',
  published: 'bg-emerald-500/20 text-emerald-400',
  archived: 'bg-orange-500/20 text-orange-400',
};

// ---------- Component ----------

export default function MagazinePage() {
  const { token, getFreshToken, handleUnauthorized } = useAdmin();
  const t = useTranslations('adminHQ');
  const tc = useTranslations('common');
  const locale = useLocale();

  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Article | null>(null);
  const [saving, setSaving] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [generatingExcerpt, setGeneratingExcerpt] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);

  // Artist/Venue search for linking
  const [artistSearch, setArtistSearch] = useState('');
  const [venueSearch, setVenueSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ artists: { id: string; name: string }[]; venues: { id: string; name: string }[] }>({ artists: [], venues: [] });

  // Recommendations panel
  const [recommendations, setRecommendations] = useState<{
    artistId: string; name: string; photoUrl: string | null; tier: number; score: number;
    followerCount: number; shoutoutCount: number; recentGigs: number; existingArticles: number;
    instruments: string[]; topReason: string;
  }[]>([]);
  const [showRecs, setShowRecs] = useState(false);
  const [recsLoading, setRecsLoading] = useState(false);

  // ---------- Fetch ----------

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/magazine', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled && data.articles) setArticles(data.articles);
      } catch (err) {
        console.error('Failed to fetch articles:', err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Fetch search data for artist/venue linking
  useEffect(() => {
    fetch('/api/search-data')
      .then((r) => r.json())
      .then((data) => {
        setSearchResults({
          artists: (data.artists || []).map((a: { id: string; name: string }) => ({ id: a.id, name: a.name })),
          venues: (data.venues || []).map((v: { id: string; name: string }) => ({ id: v.id, name: v.name })),
        });
      })
      .catch(() => {});
  }, []);

  // ---------- Recommendations ----------

  const fetchRecommendations = async () => {
    setRecsLoading(true);
    try {
      const freshToken = await getFreshToken();
      if (!freshToken) { handleUnauthorized(); return; }
      const res = await fetch('/api/admin/magazine/recommendations', {
        headers: { Authorization: `Bearer ${freshToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRecommendations(data.recommendations || []);
      }
    } catch (err) {
      console.error('Failed to fetch recommendations:', err);
    }
    setRecsLoading(false);
  };

  const handleCreateFeature = async (artistId: string, artistName: string) => {
    const freshToken = await getFreshToken();
    if (!freshToken) { handleUnauthorized(); return; }
    const slug = `feature-${artistName.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 40)}-${Date.now()}`;
    try {
      const res = await fetch('/api/admin/magazine', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug,
          source_lang: 'zh',
          category: 'artist-feature',
          linked_artist_ids: [artistId],
        }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) { alert(`Create failed: ${res.statusText}`); return; }
      const data = await res.json();
      if (data.article) {
        setArticles((prev) => [data.article, ...prev]);
        setEditing(data.article);
      }
    } catch (err) {
      console.error('Failed to create feature:', err);
    }
  };

  // ---------- Helpers ----------

  const getTitle = (a: Article) => {
    const key = `title_${locale}` as keyof Article;
    return (a[key] as string) || a.title_zh || a.title_en || a.slug;
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff-\s]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .slice(0, 80);
  };

  // ---------- CRUD ----------

  const handleCreate = async () => {
    const freshToken = await getFreshToken();
    if (!freshToken) { handleUnauthorized(); return; }
    const slug = `draft-${Date.now()}`;
    try {
      const res = await fetch('/api/admin/magazine', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, source_lang: 'zh' }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) { alert(`Create failed: ${res.statusText}`); return; }
      const data = await res.json();
      if (data.article) {
        setArticles((prev) => [data.article, ...prev]);
        setEditing(data.article);
      }
    } catch (err) {
      console.error('Failed to create:', err);
      alert('Network error — please try again.');
    }
  };

  const handleSave = async () => {
    if (!editing || saving) return;
    const freshToken = await getFreshToken();
    if (!freshToken) { handleUnauthorized(); return; }
    setSaving(true);
    try {
      // Auto-generate slug from title if still a draft slug
      let slug = editing.slug;
      if (slug.startsWith('draft-')) {
        const title = editing.title_en || editing.title_zh || '';
        if (title) slug = generateSlug(title) || slug;
      }

      const res = await fetch('/api/admin/magazine', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editing, slug }),
      });
      if (res.status === 401) { handleUnauthorized(); setSaving(false); return; }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        alert(`Save failed: ${errData.error || res.statusText}`);
        setSaving(false);
        return;
      }
      const data = await res.json();
      if (data.article) {
        setArticles((prev) => prev.map((a) => (a.id === data.article.id ? data.article : a)));
        setEditing(data.article);
      }
    } catch (err) {
      console.error('Failed to save:', err);
      alert('Network error — please try again.');
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('magDeleteConfirm'))) return;
    const freshToken = await getFreshToken();
    if (!freshToken) { handleUnauthorized(); return; }
    try {
      const res = await fetch('/api/admin/magazine', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (res.status === 401) { handleUnauthorized(); return; }
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        alert(`Delete failed: ${errData.error || res.statusText}`);
        return;
      }
      setArticles((prev) => prev.filter((a) => a.id !== id));
      if (editing?.id === id) setEditing(null);
    } catch (err) {
      console.error('Failed to delete:', err);
      alert('Network error — please try again.');
    }
  };

  // ---------- Translation ----------

  const handleTranslate = async () => {
    if (!editing || translating) return;
    const freshToken = await getFreshToken();
    if (!freshToken) { handleUnauthorized(); return; }
    const sourceLang = editing.source_lang || 'zh';
    const title = (editing as unknown as Record<string, unknown>)[`title_${sourceLang}`] as string;
    const body = (editing as unknown as Record<string, unknown>)[`body_${sourceLang}`] as string;

    if (!title?.trim() || !body?.trim()) {
      alert(t('magAlertFillSource'));
      return;
    }

    setTranslating(true);
    try {
      const res = await fetch('/api/admin/magazine/translate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, excerpt: (editing as unknown as Record<string, unknown>)[`excerpt_${sourceLang}`], body, source_lang: sourceLang }),
      });
      const translations = await res.json();
      if (res.ok) {
        setEditing((prev) => prev ? { ...prev, ...translations } : prev);
      } else {
        alert(`${t('magTranslateFailed')}: ${translations.error}`);
      }
    } catch (err) {
      console.error('Translation failed:', err);
    }
    setTranslating(false);
  };

  // ---------- Excerpt Generation ----------

  const handleGenerateExcerpt = async () => {
    if (!editing || generatingExcerpt) return;
    const freshToken = await getFreshToken();
    if (!freshToken) { handleUnauthorized(); return; }
    const sourceLang = editing.source_lang || 'zh';
    const title = (editing as unknown as Record<string, unknown>)[`title_${sourceLang}`] as string;
    const body = (editing as unknown as Record<string, unknown>)[`body_${sourceLang}`] as string;

    if (!body?.trim()) {
      alert(t('magAlertWriteBody'));
      return;
    }

    setGeneratingExcerpt(true);
    try {
      const res = await fetch('/api/admin/magazine/generate-excerpt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, source_lang: sourceLang }),
      });
      const excerpts = await res.json();
      if (res.ok) {
        setEditing((prev) => prev ? { ...prev, ...excerpts } : prev);
      }
    } catch (err) {
      console.error('Excerpt generation failed:', err);
    }
    setGeneratingExcerpt(false);
  };

  // ---------- Image Upload ----------

  const handleImageUpload = async (file: File, type: 'cover' | 'gallery') => {
    if (!editing) return;
    const freshToken = await getFreshToken();
    if (!freshToken) { handleUnauthorized(); return; }
    const setter = type === 'cover' ? setUploadingCover : setUploadingGallery;
    setter(true);

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('articleId', editing.id);
      formData.append('type', type);

      const res = await fetch('/api/admin/magazine/upload-image', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: res.statusText }));
        alert(`Upload failed: ${errData.error || res.statusText}`);
        setter(false);
        return;
      }
      const data = await res.json();
      if (data.url) {
        if (type === 'cover') {
          setEditing((prev) => prev ? { ...prev, cover_image_url: data.url } : prev);
        } else {
          setEditing((prev) => prev ? { ...prev, gallery_urls: [...(prev.gallery_urls || []), data.url] } : prev);
        }
      }
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed — please try again.');
    }
    setter(false);
  };

  const removeGalleryImage = (url: string) => {
    setEditing((prev) => prev ? { ...prev, gallery_urls: prev.gallery_urls.filter((u) => u !== url) } : prev);
  };

  // ---------- Linked entities ----------

  const filteredArtists = artistSearch.length >= 2
    ? searchResults.artists.filter((a) => a.name.toLowerCase().includes(artistSearch.toLowerCase())).slice(0, 8)
    : [];

  const filteredVenues = venueSearch.length >= 2
    ? searchResults.venues.filter((v) => v.name.toLowerCase().includes(venueSearch.toLowerCase())).slice(0, 8)
    : [];

  const addLinkedArtist = (id: string) => {
    setEditing((prev) => prev && !prev.linked_artist_ids.includes(id) ? { ...prev, linked_artist_ids: [...prev.linked_artist_ids, id] } : prev);
    setArtistSearch('');
  };

  const removeLinkedArtist = (id: string) => {
    setEditing((prev) => prev ? { ...prev, linked_artist_ids: prev.linked_artist_ids.filter((a) => a !== id) } : prev);
  };

  const addLinkedVenue = (id: string) => {
    setEditing((prev) => prev && !prev.linked_venue_ids.includes(id) ? { ...prev, linked_venue_ids: [...prev.linked_venue_ids, id] } : prev);
    setVenueSearch('');
  };

  const removeLinkedVenue = (id: string) => {
    setEditing((prev) => prev ? { ...prev, linked_venue_ids: prev.linked_venue_ids.filter((v) => v !== id) } : prev);
  };

  // ---------- Render ----------

  if (loading) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // ===== Article Editor Modal =====
  if (editing) {
    const sourceLang = editing.source_lang || 'zh';
    return (
      <div className="space-y-6 pb-16">
        {/* Editor Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setEditing(null)}
              className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--muted)] transition-all"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="font-serif text-2xl font-bold">{getTitle(editing)}</h1>
              <p className="text-xs text-[var(--muted-foreground)] font-mono mt-0.5">/{editing.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleTranslate}
              disabled={translating}
              className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${
                translating
                  ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-wait'
                  : 'bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25'
              }`}
            >
              {translating ? t('magTranslating') : t('magTranslateAll')}
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2 rounded-xl text-xs font-bold uppercase tracking-widest bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90 transition-all"
            >
              {saving ? '...' : t('magSave')}
            </button>
          </div>
        </div>

        {/* Settings Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Status */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-1.5">{t('magStatus')}</label>
            <select
              value={editing.status}
              onChange={(e) => setEditing({ ...editing, status: e.target.value })}
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 [&>option]:bg-[var(--muted)] [&>option]:text-[var(--foreground)]"
            >
              <option value="draft">{t('magDraft')}</option>
              <option value="published">{t('magPublished')}</option>
              <option value="archived">{t('magArchived')}</option>
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-1.5">{t('magCategory')}</label>
            <select
              value={editing.category}
              onChange={(e) => setEditing({ ...editing, category: e.target.value })}
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 [&>option]:bg-[var(--muted)] [&>option]:text-[var(--foreground)]"
            >
              {CATEGORY_KEYS.map((c) => <option key={c.value} value={c.value}>{tc(c.key)}</option>)}
            </select>
          </div>

          {/* Source Language */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-1.5">{t('magSourceLang')}</label>
            <select
              value={editing.source_lang}
              onChange={(e) => setEditing({ ...editing, source_lang: e.target.value })}
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 [&>option]:bg-[var(--muted)] [&>option]:text-[var(--foreground)]"
            >
              {LANG_OPTIONS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </div>

          {/* Author + Featured */}
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-1.5">{t('magAuthor')}</label>
            <input
              type="text"
              value={editing.author_name || ''}
              onChange={(e) => setEditing({ ...editing, author_name: e.target.value })}
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 [&>option]:bg-[var(--muted)] [&>option]:text-[var(--foreground)]"
              placeholder={t('magAuthorPlaceholder')}
            />
          </div>
        </div>

        {/* Featured toggle */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setEditing({ ...editing, is_featured: !editing.is_featured })}
            className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${
              editing.is_featured ? 'bg-[var(--color-gold)]' : 'bg-zinc-600'
            }`}
          >
            <span
              className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform"
              style={{ left: editing.is_featured ? '22px' : '2px' }}
            />
          </button>
          <span className="text-sm text-[var(--muted-foreground)]">{t('magFeaturedToggle')}</span>
        </div>

        {/* Cover Image */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-2">
            {t('magCoverImage')}
            <span className="normal-case tracking-normal font-normal ml-2 opacity-60">({t('magCoverHint')})</span>
          </label>
          <div className="flex items-start gap-4">
            {editing.cover_image_url ? (
              <div className="relative w-48 aspect-video rounded-xl overflow-hidden bg-[var(--muted)]">
                <Image src={editing.cover_image_url} alt="Cover" fill className="object-cover" sizes="192px" />
                <button
                  onClick={() => setEditing({ ...editing, cover_image_url: null })}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center text-xs hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ) : (
              <label className={`flex items-center justify-center w-48 aspect-video rounded-xl border-2 border-dashed border-[var(--border)] cursor-pointer hover:border-[var(--color-gold)]/50 transition-colors ${uploadingCover ? 'opacity-50 pointer-events-none' : ''}`}>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, 'cover');
                  }}
                />
                <span className="text-xs text-[var(--muted-foreground)]">{uploadingCover ? t('magUploading') : t('magUploadCover')}</span>
              </label>
            )}
          </div>
        </div>

        {/* Gallery Images */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-2">
            {t('magGallery')}
            <span className="normal-case tracking-normal font-normal ml-2 opacity-60">({t('magGalleryHint')})</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {(editing.gallery_urls || []).map((url, i) => (
              <div key={i} className="relative w-28 aspect-square rounded-xl overflow-hidden bg-[var(--muted)]">
                <Image src={url} alt={`Gallery ${i + 1}`} fill className="object-cover" sizes="112px" />
                <button
                  onClick={() => removeGalleryImage(url)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-[10px] hover:bg-black/80"
                >
                  ×
                </button>
              </div>
            ))}
            <label className={`flex items-center justify-center w-28 aspect-square rounded-xl border-2 border-dashed border-[var(--border)] cursor-pointer hover:border-[var(--color-gold)]/50 transition-colors ${uploadingGallery ? 'opacity-50 pointer-events-none' : ''}`}>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImageUpload(f, 'gallery');
                }}
              />
              <span className="text-xs text-[var(--muted-foreground)]">{uploadingGallery ? '...' : t('magGalleryAdd')}</span>
            </label>
          </div>
        </div>

        {/* Linked Artists */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-2">{t('magLinkedArtists')}</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {editing.linked_artist_ids.map((id) => {
              const artist = searchResults.artists.find((a) => a.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[var(--color-gold)]/10 text-[var(--color-gold)] text-xs">
                  {artist?.name || id.slice(0, 8)}
                  <button onClick={() => removeLinkedArtist(id)} className="hover:text-white">×</button>
                </span>
              );
            })}
          </div>
          <div className="relative">
            <input
              type="text"
              value={artistSearch}
              onChange={(e) => setArtistSearch(e.target.value)}
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 [&>option]:bg-[var(--muted)] [&>option]:text-[var(--foreground)]"
              placeholder={t('magSearchArtists')}
            />
            {filteredArtists.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {filteredArtists.map((a) => (
                  <button key={a.id} onClick={() => addLinkedArtist(a.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors">
                    {a.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Linked Venues */}
        <div>
          <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-2">{t('magLinkedVenues')}</label>
          <div className="flex flex-wrap gap-2 mb-2">
            {editing.linked_venue_ids.map((id) => {
              const venue = searchResults.venues.find((v) => v.id === id);
              return (
                <span key={id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 text-xs">
                  {venue?.name || id.slice(0, 8)}
                  <button onClick={() => removeLinkedVenue(id)} className="hover:text-white">×</button>
                </span>
              );
            })}
          </div>
          <div className="relative">
            <input
              type="text"
              value={venueSearch}
              onChange={(e) => setVenueSearch(e.target.value)}
              className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 [&>option]:bg-[var(--muted)] [&>option]:text-[var(--foreground)]"
              placeholder={t('magSearchVenues')}
            />
            {filteredVenues.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {filteredVenues.map((v) => (
                  <button key={v.id} onClick={() => addLinkedVenue(v.id)} className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--muted)] transition-colors">
                    {v.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Title (source language) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold">
              {t('magTitle')} <span className="text-[var(--color-gold)]">({sourceLang.toUpperCase()})</span>
            </label>
          </div>
          <input
            type="text"
            value={((editing as unknown as Record<string, unknown>)[`title_${sourceLang}`] as string) || ''}
            onChange={(e) => setEditing({ ...editing, [`title_${sourceLang}`]: e.target.value })}
            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-base text-[var(--foreground)] font-serif focus:outline-none focus:border-[var(--color-gold)]/50"
            placeholder={t('magTitlePlaceholder')}
          />
        </div>

        {/* Body (source language) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold">
              {t('magBody')} <span className="text-[var(--color-gold)]">({sourceLang.toUpperCase()}) — Markdown</span>
            </label>
          </div>
          <textarea
            value={((editing as unknown as Record<string, unknown>)[`body_${sourceLang}`] as string) || ''}
            onChange={(e) => setEditing({ ...editing, [`body_${sourceLang}`]: e.target.value })}
            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-4 py-3 text-sm text-[var(--foreground)] font-mono leading-relaxed focus:outline-none focus:border-[var(--color-gold)]/50 min-h-[400px] resize-y"
            placeholder={t('magBodyPlaceholder')}
          />
        </div>

        {/* Excerpt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold">
              {t('magExcerpt')} <span className="normal-case tracking-normal font-normal opacity-60">({t('magExcerptAuto')})</span>
            </label>
            <button
              onClick={handleGenerateExcerpt}
              disabled={generatingExcerpt}
              className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                generatingExcerpt
                  ? 'bg-[var(--muted)] text-[var(--muted-foreground)] cursor-wait'
                  : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25'
              }`}
            >
              {generatingExcerpt ? t('magGenerating') : t('magGenerateExcerpt')}
            </button>
          </div>
          <textarea
            value={((editing as unknown as Record<string, unknown>)[`excerpt_${sourceLang}`] as string) || ''}
            onChange={(e) => setEditing({ ...editing, [`excerpt_${sourceLang}`]: e.target.value })}
            className="w-full bg-[var(--muted)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 min-h-[60px] resize-y"
            placeholder={t('magExcerptPlaceholder')}
          />
        </div>

        {/* Translated Titles Preview */}
        {LANG_OPTIONS.filter((l) => l.value !== sourceLang).some((l) => (editing as unknown as Record<string, unknown>)[`title_${l.value}`]) && (
          <div>
            <label className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-semibold block mb-2">{t('magTranslatedTitles')}</label>
            <div className="space-y-1.5">
              {LANG_OPTIONS.filter((l) => l.value !== sourceLang).map((l) => {
                const val = (editing as unknown as Record<string, unknown>)[`title_${l.value}`] as string;
                if (!val) return null;
                return (
                  <div key={l.value} className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-[var(--muted-foreground)] w-5 shrink-0">{l.value.toUpperCase()}</span>
                    <span className="text-sm text-[var(--foreground)] truncate">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Danger Zone */}
        <div className="pt-6 border-t border-[var(--border)]">
          <button
            onClick={() => handleDelete(editing.id)}
            className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-widest text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all"
          >
            {t('magDelete')}
          </button>
        </div>
      </div>
    );
  }

  // ===== Article List =====
  return (
    <div className="space-y-8 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-bold">{t('magazineTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('magazineDesc')}</p>
        </div>
        <button
          onClick={handleCreate}
          className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90 transition-all"
        >
          {t('magNewArticle')}
        </button>
      </div>

      {/* Recommended Artists Panel */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <button
          onClick={() => {
            setShowRecs(!showRecs);
            if (!showRecs && recommendations.length === 0) fetchRecommendations();
          }}
          className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-[var(--muted)]/30 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-base">✨</span>
            <span className="text-sm font-bold uppercase tracking-widest">{t('magRecommendedArtists')}</span>
          </div>
          <svg className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${showRecs ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9" /></svg>
        </button>
        {showRecs && (
          <div className="px-5 pb-5">
            {recsLoading ? (
              <div className="py-6 text-center">
                <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
              </div>
            ) : recommendations.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)] py-4">{t('magNoRecommendations')}</p>
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
                {recommendations.slice(0, 10).map((rec) => (
                  <div
                    key={rec.artistId}
                    className="flex-shrink-0 w-48 bg-[var(--background)] border border-[var(--border)] rounded-xl p-3 space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-[var(--muted)] flex-shrink-0">
                        {rec.photoUrl ? (
                          <Image src={rec.photoUrl} alt={rec.name} width={32} height={32} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-[var(--muted-foreground)]">
                            {rec.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold truncate">{rec.name}</p>
                        <p className="text-[10px] text-[var(--muted-foreground)]">
                          {rec.tier >= 2 ? '⭐ Pro' : 'Claimed'} · {rec.score}pts
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--color-gold)]/10 text-[var(--color-gold)]">{rec.topReason}</span>
                    </div>
                    <div className="text-[10px] text-[var(--muted-foreground)] space-y-0.5">
                      <div>👥 {rec.followerCount} fans · 📣 {rec.shoutoutCount} shoutouts</div>
                      <div>🎵 {rec.recentGigs} gigs (90d) · 📰 {rec.existingArticles} articles</div>
                    </div>
                    <button
                      onClick={() => handleCreateFeature(rec.artistId, rec.name)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-opacity"
                    >
                      {t('magCreateFeature')}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {articles.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[var(--muted-foreground)] text-sm mb-4">{t('magNoArticles')}</p>
          <button
            onClick={handleCreate}
            className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest bg-[var(--color-gold)] text-[#0A0A0A] hover:opacity-90 transition-all"
          >
            {t('magCreateFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {articles.map((article) => (
            <button
              key={article.id}
              onClick={() => setEditing(article)}
              className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all hover:bg-[var(--card)]/60 text-left"
            >
              {/* Cover thumbnail */}
              <div className="w-16 h-10 rounded-lg overflow-hidden bg-[var(--muted)] shrink-0">
                {article.cover_image_url ? (
                  <Image src={article.cover_image_url} alt="" width={64} height={40} className="w-full h-full object-cover" sizes="64px" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--muted-foreground)]">{t('magNoImg')}</div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{getTitle(article)}</span>
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${STATUS_COLORS[article.status] || ''}`}>
                    {article.status === 'draft' ? t('magDraft') : article.status === 'published' ? t('magPublished') : t('magArchived')}
                  </span>
                  {article.is_featured && (
                    <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[var(--color-gold)]/20 text-[var(--color-gold)]">
                      {t('magFeatured')}
                    </span>
                  )}
                </div>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  {(() => { const cat = CATEGORY_KEYS.find((c) => c.value === article.category); return cat ? tc(cat.key) : article.category; })()}
                  {article.author_name ? ` · ${article.author_name}` : ''}
                  {article.published_at ? ` · ${new Date(article.published_at).toLocaleDateString()}` : ''}
                </p>
              </div>

              {/* Edit arrow */}
              <svg className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
