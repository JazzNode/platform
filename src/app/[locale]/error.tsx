'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console for debugging; avoid leaking details to the user.
    console.error('[page error]', error.digest ?? error.message);
  }, [error]);

  const router = useRouter();

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center px-6 text-center">
      <p className="text-4xl mb-4 select-none">⚠</p>
      <h1 className="text-xl font-semibold mb-2">Something went wrong</h1>
      <p className="text-sm text-[rgba(240,237,230,0.5)] mb-8 max-w-xs">
        The server encountered a temporary error. Please try again in a moment.
      </p>
      <div className="flex gap-3">
        <button
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-[rgba(240,237,230,0.1)] hover:bg-[rgba(240,237,230,0.15)] text-sm transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-[rgba(240,237,230,0.15)] hover:border-[rgba(240,237,230,0.25)] text-sm transition-colors"
        >
          Go back
        </button>
      </div>
      {error.digest && (
        <p className="mt-6 text-[10px] text-[rgba(240,237,230,0.2)] font-mono">
          {error.digest}
        </p>
      )}
    </div>
  );
}
