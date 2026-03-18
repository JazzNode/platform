'use client';

import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useAuth } from './AuthProvider';

type TargetType = 'artist' | 'venue';
type ClaimStatus = 'pending' | 'approved' | 'rejected';

interface ClaimRecord {
  target_type: TargetType;
  target_id: string;
  status: ClaimStatus;
}

interface ClaimsContextType {
  /** Get the current user's claim status for a target */
  getMyClaimStatus: (type: TargetType, id: string) => ClaimStatus | null;
  /** Check if a target has been claimed by anyone (approved) */
  isClaimed: (type: TargetType, id: string) => boolean;
  /** Get the number of approved managers for a target */
  getManagerCount: (type: TargetType, id: string) => number;
  /** Submit a new claim */
  submitClaim: (type: TargetType, id: string, evidenceText: string) => Promise<{ error?: string }>;
  /** Cancel a pending claim */
  cancelClaim: (type: TargetType, id: string) => Promise<{ error?: string }>;
  loading: boolean;
}

const ClaimsContext = createContext<ClaimsContextType | null>(null);

export default function ClaimsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [myClaims, setMyClaims] = useState<ClaimRecord[]>([]);
  const [approvedCounts, setApprovedCounts] = useState<Map<string, number>>(new Map());
  const [fetched, setFetched] = useState(false);

  // Fetch user's own claims + all approved claims
  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    const supabase = createClient();

    // Fetch user's own claims
    const fetchMyClaims = supabase
      .from('claims')
      .select('target_type, target_id, status')
      .eq('user_id', user.id);

    // Fetch all approved claims (public via RLS) — now there can be multiple per entity
    const fetchApproved = supabase
      .from('claims')
      .select('target_type, target_id')
      .eq('status', 'approved');

    Promise.all([fetchMyClaims, fetchApproved]).then(([myRes, approvedRes]) => {
      if (cancelled) return;
      if (myRes.data) {
        setMyClaims(myRes.data as ClaimRecord[]);
      }
      if (approvedRes.data) {
        const counts = new Map<string, number>();
        for (const r of approvedRes.data) {
          const key = `${r.target_type}:${r.target_id}`;
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        setApprovedCounts(counts);
      }
      setFetched(true);
    });

    return () => { cancelled = true; };
  }, [user]);

  // Derive effective claims — empty when logged out
  const effectiveMyClaims = useMemo(() => user ? myClaims : [], [user, myClaims]);
  const loading = !!user && !fetched;

  const getMyClaimStatus = useCallback(
    (type: TargetType, id: string): ClaimStatus | null => {
      const matches = effectiveMyClaims.filter((c) => c.target_type === type && c.target_id === id);
      if (matches.length === 0) return null;
      // Priority: approved > pending > rejected
      const priority: ClaimStatus[] = ['approved', 'pending', 'rejected'];
      for (const s of priority) {
        if (matches.some((c) => c.status === s)) return s;
      }
      return matches[0].status;
    },
    [effectiveMyClaims],
  );

  const isClaimed = useCallback(
    (type: TargetType, id: string) => (approvedCounts.get(`${type}:${id}`) || 0) > 0,
    [approvedCounts],
  );

  const getManagerCount = useCallback(
    (type: TargetType, id: string) => approvedCounts.get(`${type}:${id}`) || 0,
    [approvedCounts],
  );

  const submitClaim = useCallback(
    async (type: TargetType, id: string, evidenceText: string): Promise<{ error?: string }> => {
      if (!user) return { error: 'Not logged in' };

      const claimId = `claim-${type}-${id}-${Date.now()}`;

      const supabase = createClient();
      const { error } = await supabase.from('claims').insert({
        claim_id: claimId,
        user_id: user.id,
        target_type: type,
        target_id: id,
        evidence_text: evidenceText,
        status: 'pending',
      });

      if (error) {
        console.error('Claim submission failed:', error);
        return { error: error.message };
      }

      // Optimistic update
      setMyClaims((prev) => [...prev, { target_type: type, target_id: id, status: 'pending' }]);

      return {};
    },
    [user],
  );

  const cancelClaim = useCallback(
    async (type: TargetType, id: string): Promise<{ error?: string }> => {
      if (!user) return { error: 'Not logged in' };

      const supabase = createClient();
      const { error } = await supabase
        .from('claims')
        .delete()
        .eq('user_id', user.id)
        .eq('target_type', type)
        .eq('target_id', id)
        .eq('status', 'pending');

      if (error) {
        console.error('Claim cancellation failed:', error);
        return { error: error.message };
      }

      // Optimistic update — remove from local state
      setMyClaims((prev) => prev.filter((c) => !(c.target_type === type && c.target_id === id && c.status === 'pending')));

      return {};
    },
    [user],
  );

  return (
    <ClaimsContext.Provider value={{ getMyClaimStatus, isClaimed, getManagerCount, submitClaim, cancelClaim, loading }}>
      {children}
    </ClaimsContext.Provider>
  );
}

export function useClaims() {
  const ctx = useContext(ClaimsContext);
  if (!ctx) throw new Error('useClaims must be used within ClaimsProvider');
  return ctx;
}
