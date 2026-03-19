import { useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

/**
 * Syncs filter state to URL search params via Next.js router.replace.
 * When the user navigates away and presses back, the browser restores the URL
 * and the server component reads the params to re-initialize filters.
 *
 * @param params - Record of param key → value. Null/undefined/empty values are omitted.
 */
export function useFilterParams(params: Record<string, string | null | undefined>) {
  const router = useRouter();
  const pathname = usePathname();
  const isFirstRender = useRef(true);
  const unmanagedRef = useRef('');
  const lastSyncedRef = useRef('');

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      const sp = new URLSearchParams(window.location.search);
      const managed = new Set(Object.keys(params));
      for (const key of [...sp.keys()]) {
        if (managed.has(key)) sp.delete(key);
      }
      unmanagedRef.current = sp.toString();
      lastSyncedRef.current = window.location.search;
      return;
    }

    const sp = new URLSearchParams(unmanagedRef.current);
    for (const [key, value] of Object.entries(params)) {
      if (value) sp.set(key, value);
    }

    const qs = sp.toString();
    const newSearch = qs ? `?${qs}` : '';

    if (newSearch !== lastSyncedRef.current) {
      lastSyncedRef.current = newSearch;
      router.replace(`${pathname}${newSearch}`, { scroll: false });
    }
  }, [params, router, pathname]);
}
