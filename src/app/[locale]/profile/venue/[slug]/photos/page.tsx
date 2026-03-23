'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import ImageLightbox from '@/components/ImageLightbox';

interface GalleryPhoto {
  id: string;
  photo_url: string;
  caption: string | null;
  sort_order: number;
}

const MAX_PHOTOS = 12;

export default function VenuePhotosPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('venueDashboard');
  const { loading } = useAuth();

  const [slug, setSlug] = useState('');
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [fetching, setFetching] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve params
  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  // Fetch photos
  const fetchPhotos = useCallback(async () => {
    if (!slug) return;
    try {
      const res = await fetch(`/api/venue/gallery?venueId=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setPhotos(data.photos ?? []);
    } catch { /* silent */ }
    setFetching(false);
  }, [slug]);

  useEffect(() => { fetchPhotos(); }, [fetchPhotos]);

  const getFreshToken = useCallback(async () => {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token;
  }, []);

  const showMessage = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 2500);
  };

  // Upload handler
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !slug) return;
    e.target.value = ''; // reset so same file can be re-selected

    if (photos.length >= MAX_PHOTOS) {
      showMessage(t('maxPhotosReached', { max: MAX_PHOTOS }), 'error');
      return;
    }

    setUploading(true);
    try {
      const freshToken = await getFreshToken();
      const formData = new FormData();
      formData.append('file', file);
      formData.append('venueId', slug);

      const res = await fetch('/api/venue/upload-gallery-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${freshToken}` },
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }

      const photo = await res.json();
      setPhotos((prev) => [...prev, photo]);
      showMessage(t('photoUploaded'), 'success');
    } catch (err) {
      showMessage(err instanceof Error ? err.message : t('uploadFailed'), 'error');
    } finally {
      setUploading(false);
    }
  }, [slug, photos.length, getFreshToken, t]);

  // Delete handler
  const handleDelete = useCallback(async (photoId: string) => {
    try {
      const freshToken = await getFreshToken();
      const res = await fetch('/api/venue/gallery', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({ photoId, venueId: slug }),
      });

      if (!res.ok) throw new Error('Delete failed');

      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      setConfirmDeleteId(null);
      showMessage(t('photoDeleted'), 'success');
    } catch {
      showMessage(t('uploadFailed'), 'error');
    }
  }, [slug, getFreshToken, t]);

  // Reorder handlers
  const handleMove = useCallback(async (index: number, direction: 'up' | 'down') => {
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= photos.length) return;

    const newPhotos = [...photos];
    [newPhotos[index], newPhotos[swapIndex]] = [newPhotos[swapIndex], newPhotos[index]];

    // Update sort_order values
    const reordered = newPhotos.map((p, i) => ({ ...p, sort_order: i }));
    setPhotos(reordered);

    try {
      const freshToken = await getFreshToken();
      await fetch('/api/venue/gallery', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          venueId: slug,
          photos: reordered.map((p) => ({ id: p.id, sort_order: p.sort_order })),
        }),
      });
      showMessage(t('reorderSaved'), 'success');
    } catch {
      showMessage(t('uploadFailed'), 'error');
    }
  }, [photos, slug, getFreshToken, t]);

  // Set as cover (move to index 0)
  const handleSetCover = useCallback(async (index: number) => {
    if (index === 0) return;

    const newPhotos = [...photos];
    const [photo] = newPhotos.splice(index, 1);
    newPhotos.unshift(photo);

    const reordered = newPhotos.map((p, i) => ({ ...p, sort_order: i }));
    setPhotos(reordered);

    try {
      const freshToken = await getFreshToken();
      await fetch('/api/venue/gallery', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${freshToken}`,
        },
        body: JSON.stringify({
          venueId: slug,
          photos: reordered.map((p) => ({ id: p.id, sort_order: p.sort_order })),
        }),
      });
      showMessage(t('reorderSaved'), 'success');
    } catch {
      showMessage(t('uploadFailed'), 'error');
    }
  }, [photos, slug, getFreshToken, t]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {lightboxIndex !== null && (
        <ImageLightbox
          images={photos.map((p) => p.photo_url)}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      <FadeUp>
        <div className="flex items-center justify-between">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <svg className="w-6 h-6 text-gold" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            {t('photoGallery')}
          </h1>
          <span className="text-sm text-[var(--muted-foreground)]">
            {t('maxPhotos', { count: photos.length, max: MAX_PHOTOS })}
          </span>
        </div>
      </FadeUp>

      {/* Status message */}
      {message && (
        <div className={`text-sm px-4 py-2 rounded-xl ${
          message.type === 'success'
            ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20'
            : 'bg-red-400/10 text-red-400 border border-red-400/20'
        }`}>
          {message.text}
        </div>
      )}

      <FadeUp>
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 sm:p-8 space-y-6">
          {/* Upload zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="hidden"
          />

          {photos.length < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full border-2 border-dashed border-[var(--border)] hover:border-[var(--color-gold)]/40 rounded-2xl p-8 flex flex-col items-center gap-3 transition-colors group disabled:opacity-50"
            >
              {uploading ? (
                <div className="w-8 h-8 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
              ) : (
                <svg className="w-8 h-8 text-[var(--muted-foreground)] group-hover:text-[var(--color-gold)] transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
              <span className="text-sm text-[var(--muted-foreground)] group-hover:text-[var(--foreground)] transition-colors">
                {t('dragToUpload')}
              </span>
            </button>
          )}

          {/* Empty state */}
          {photos.length === 0 && !uploading && (
            <p className="text-center text-sm text-[var(--muted-foreground)] py-4">
              {t('noPhotos')}
            </p>
          )}

          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {photos.map((photo, index) => (
                <div
                  key={photo.id}
                  className="relative aspect-square rounded-xl overflow-hidden group border border-[var(--border)]"
                >
                  {/* Image */}
                  <button
                    type="button"
                    onClick={() => setLightboxIndex(index)}
                    className="w-full h-full"
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || ''}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  {/* Cover badge */}
                  {index === 0 && (
                    <span className="absolute top-2 left-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[var(--color-gold)] text-[#0A0A0A]">
                      {t('coverPhoto')}
                    </span>
                  )}

                  {/* Hover overlay with actions */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    {/* Set as cover */}
                    {index !== 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleSetCover(index); }}
                        title={t('setAsCover')}
                        className="w-8 h-8 rounded-full bg-black/60 text-[var(--color-gold)] flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                        </svg>
                      </button>
                    )}

                    {/* Move up */}
                    {index > 0 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMove(index, 'up'); }}
                        title={t('moveUp')}
                        className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="18 15 12 9 6 15" />
                        </svg>
                      </button>
                    )}

                    {/* Move down */}
                    {index < photos.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleMove(index, 'down'); }}
                        title={t('moveDown')}
                        className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </button>
                    )}

                    {/* Delete */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirmDeleteId === photo.id) {
                          handleDelete(photo.id);
                        } else {
                          setConfirmDeleteId(photo.id);
                        }
                      }}
                      title={t('deletePhoto')}
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        confirmDeleteId === photo.id
                          ? 'bg-red-500 text-white'
                          : 'bg-black/60 text-red-400 hover:bg-red-500/80 hover:text-white'
                      }`}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeUp>
    </div>
  );
}
