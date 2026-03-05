'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

type ItemType = 'artist' | 'venue' | 'event';

interface FavoritesContextType {
  isFavorite: (type: ItemType, id: string) => boolean;
  toggleFavorite: (type: ItemType, id: string) => Promise<void>;
  loading: boolean;
  /** Increments when the jazz cat easter egg should fire 🐱 */
  catEggTrigger: number;
}

const FavoritesContext = createContext<FavoritesContextType | null>(null);

export default function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [catEggTrigger, setCatEggTrigger] = useState(0);

  // Fetch all favorites on login
  useEffect(() => {
    if (!user) {
      setKeys(new Set());
      return;
    }

    let cancelled = false;
    setLoading(true);

    const supabase = createClient();
    supabase
      .from('favorites')
      .select('item_type, item_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setKeys(new Set(data.map((r) => `${r.item_type}:${r.item_id}`)));
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  const isFavorite = useCallback(
    (type: ItemType, id: string) => keys.has(`${type}:${id}`),
    [keys],
  );

  const toggleFavorite = useCallback(
    async (type: ItemType, id: string) => {
      if (!user) return;

      const key = `${type}:${id}`;
      const removing = keys.has(key);

      // Optimistic update
      setKeys((prev) => {
        const next = new Set(prev);
        if (removing) next.delete(key);
        else next.add(key);
        return next;
      });

      const supabase = createClient();

      if (removing) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', id)
          .eq('item_type', type);

        if (error) {
          // Revert on failure
          setKeys((prev) => new Set(prev).add(key));
        }
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: user.id, item_id: id, item_type: type });

        if (error) {
          // Revert on failure
          setKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        } else if (type === 'artist') {
          // 🐱 Jazz cat easter egg: count artist follows after successful add
          setKeys((current) => {
            const artistCount = Array.from(current).filter((k) => k.startsWith('artist:')).length;
            if (artistCount === 10) {
              setCatEggTrigger((n) => n + 1);
            }
            return current; // no mutation, just reading
          });
        }
      }
    },
    [user, keys],
  );

  return (
    <FavoritesContext.Provider value={{ isFavorite, toggleFavorite, loading, catEggTrigger }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
