'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useCanEdit } from '@/hooks/useCanEdit';
import { createClient } from '@/utils/supabase/client';

interface Props {
  eventId: string;
  eventTitle: string;
  currentPosterUrl: string | null;
}

export default function EventPosterUpload({ eventId, eventTitle, currentPosterUrl }: Props) {
  const { canEdit, handleUnauthorized } = useCanEdit('event', eventId);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayUrl = previewUrl || currentPosterUrl;

  const handleClick = useCallback(() => {
    if (!canEdit || uploading) return;
    fileInputRef.current?.click();
  }, [canEdit, uploading]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const freshToken = session?.access_token;
      if (!freshToken) {
        handleUnauthorized();
        return;
      }

      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('eventId', eventId);

        const res = await fetch('/api/admin/upload-poster', {
          method: 'POST',
          headers: { Authorization: `Bearer ${freshToken}` },
          body: formData,
        });

        if (!res.ok) {
          if (res.status === 401) {
            handleUnauthorized();
            throw new Error('Token 已過期，請重新登入');
          }
          const data = await res.json();
          throw new Error(data.error || 'Upload failed');
        }

        const data = await res.json();
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(data.posterUrl);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setPreviewUrl(null);
        URL.revokeObjectURL(objectUrl);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [eventId, handleUnauthorized],
  );

  // Non-admin with no poster: render nothing (matches original behavior)
  if (!canEdit && !displayUrl) return null;

  return (
    <div className="w-full lg:w-[400px] shrink-0">
      <div
        className={`overflow-hidden rounded-2xl relative ${canEdit ? 'cursor-pointer group/poster' : ''}`}
        onClick={handleClick}
      >
        {displayUrl ? (
          <Image
            src={displayUrl}
            alt={eventTitle}
            width={800}
            height={600}
            className="w-full h-auto object-cover"
            sizes="(min-width: 1024px) 400px, 100vw"
          />
        ) : (
          <div className="w-full aspect-[4/3] bg-[var(--card)] border border-dashed border-[var(--border)] rounded-2xl flex flex-col items-center justify-center gap-2 text-[var(--muted-foreground)]">
            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <span className="text-sm">點擊上傳海報</span>
          </div>
        )}

        {/* Edit overlay */}
        {canEdit && displayUrl && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-white">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <span className="text-sm font-medium">更換海報</span>
              </div>
            )}
          </div>
        )}

        {/* Upload overlay for empty state */}
        {canEdit && !displayUrl && uploading && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center rounded-2xl">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </div>

      {/* Hidden file input */}
      {canEdit && (
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      )}

      {/* Error message */}
      {error && (
        <p className="mt-2 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
