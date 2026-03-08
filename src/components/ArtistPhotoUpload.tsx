'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { useAdmin } from './AdminProvider';

interface Props {
  artistId: string;
  artistName: string;
  currentPhotoUrl: string | null;
  size: 'sm' | 'md';
}

export default function ArtistPhotoUpload({ artistId, artistName, currentPhotoUrl, size }: Props) {
  const { isAdmin, token, handleUnauthorized } = useAdmin();
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const dimensions = size === 'sm' ? 'w-14 h-14' : 'w-48 h-48';
  const rounded = size === 'sm' ? 'rounded-xl' : 'rounded-2xl';
  const textSize = size === 'sm' ? 'text-xl' : 'text-6xl';
  const imgSizes = size === 'sm' ? '56px' : '192px';
  const displayUrl = previewUrl || currentPhotoUrl;

  const handleClick = useCallback(() => {
    if (!isAdmin || uploading) return;
    fileInputRef.current?.click();
  }, [isAdmin, uploading]);

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !token) return;

      // Client-side preview
      const objectUrl = URL.createObjectURL(file);
      setPreviewUrl(objectUrl);
      setUploading(true);
      setError(null);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('artistId', artistId);

        const res = await fetch('/api/admin/upload-photo', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
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

        // Success — reload to pick up revalidated data
        window.location.reload();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Upload failed');
        setPreviewUrl(null);
        URL.revokeObjectURL(objectUrl);
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [artistId, token, handleUnauthorized],
  );

  return (
    <div className="relative">
      <div
        className={`${dimensions} ${rounded} overflow-hidden shrink-0 border border-[var(--border)] relative ${
          isAdmin ? 'cursor-pointer group/upload' : ''
        }`}
        onClick={handleClick}
      >
        {displayUrl ? (
          <Image src={displayUrl} alt={artistName} fill className="object-cover" sizes={imgSizes} />
        ) : (
          <div className={`w-full h-full bg-[var(--card)] flex items-center justify-center ${textSize}`}>
            ♪
          </div>
        )}

        {/* Admin overlay: camera icon on hover */}
        {isAdmin && (
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/upload:opacity-100 transition-opacity flex items-center justify-center">
            {uploading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Hidden file input */}
      {isAdmin && (
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
        <p className="absolute -bottom-6 left-0 text-xs text-red-400 whitespace-nowrap">{error}</p>
      )}
    </div>
  );
}
