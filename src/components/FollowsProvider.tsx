'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

type TargetType = 'artist' | 'venue' | 'event' | 'user';

interface FollowsContextType {
  isFollowing: (type: TargetType, id: string) => boolean;
  toggleFollow: (type: TargetType, id: string) => Promise<void>;
  loading: boolean;
  /** Increments when the jazz cat easter egg should fire */
  catEggTrigger: number;
}

const FollowsContext = createContext<FollowsContextType | null>(null);

export default function FollowsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [keys, setKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [catEggTrigger, setCatEggTrigger] = useState(0);

  // Fetch all follows on login
  useEffect(() => {
    if (!user) {
      setKeys(new Set()); // eslint-disable-line react-hooks/set-state-in-effect -- intentional reset on logout
      return;
    }

    let cancelled = false;
    setLoading(true);

    const supabase = createClient();
    supabase
      .from('follows')
      .select('target_type, target_id')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (cancelled) return;
        if (data) {
          setKeys(new Set(data.map((r) => `${r.target_type}:${r.target_id}`)));
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  const isFollowing = useCallback(
    (type: TargetType, id: string) => keys.has(`${type}:${id}`),
    [keys],
  );

  const toggleFollow = useCallback(
    async (type: TargetType, id: string) => {
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
          .from('follows')
          .delete()
          .eq('user_id', user.id)
          .eq('target_id', id)
          .eq('target_type', type);

        if (error) {
          setKeys((prev) => new Set(prev).add(key));
        }
      } else {
        const { error } = await supabase
          .from('follows')
          .insert({ user_id: user.id, target_id: id, target_type: type });

        if (error) {
          setKeys((prev) => {
            const next = new Set(prev);
            next.delete(key);
            return next;
          });
        } else if (type === 'artist') {
          // Jazz cat easter egg: count artist follows after successful add
          setKeys((current) => {
            const artistCount = Array.from(current).filter((k) => k.startsWith('artist:')).length;
            if (artistCount === 10) {
              setCatEggTrigger((n) => n + 1);
            }
            return current;
          });
        }
      }
    },
    [user, keys],
  );

  return (
    <FollowsContext.Provider value={{ isFollowing, toggleFollow, loading, catEggTrigger }}>
      {children}
    </FollowsContext.Provider>
  );
}

export function useFollows() {
  const ctx = useContext(FollowsContext);
  if (!ctx) throw new Error('useFollows must be used within FollowsProvider');
  return ctx;
}

/** @deprecated Use useFollows instead — backward compat alias */
export function useFavorites() {
  const { isFollowing, toggleFollow, loading, catEggTrigger } = useFollows();
  return {
    isFavorite: isFollowing,
    toggleFavorite: toggleFollow,
    loading,
    catEggTrigger,
  };
}
