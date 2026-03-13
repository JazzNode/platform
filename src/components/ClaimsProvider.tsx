'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
  const [approvedKeys, setApprovedKeys] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Fetch user's own claims + all approved claims
  useEffect(() => {
    if (!user) {
      setMyClaims([]);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const supabase = createClient();

    // Fetch user's own claims
    const fetchMyClaims = supabase
      .from('claims')
      .select('target_type, target_id, status')
      .eq('user_id', user.id);

    // Fetch all approved claims (public via RLS)
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
        setApprovedKeys(new Set(approvedRes.data.map((r) => `${r.target_type}:${r.target_id}`)));
      }
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, [user]);

  const getMyClaimStatus = useCallback(
    (type: TargetType, id: string): ClaimStatus | null => {
      const claim = myClaims.find((c) => c.target_type === type && c.target_id === id);
      return claim?.status ?? null;
    },
    [myClaims],
  );

  const isClaimed = useCallback(
    (type: TargetType, id: string) => approvedKeys.has(`${type}:${id}`),
    [approvedKeys],
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
    <ClaimsContext.Provider value={{ getMyClaimStatus, isClaimed, submitClaim, cancelClaim, loading }}>
      {children}
    </ClaimsContext.Provider>
  );
}

export function useClaims() {
  const ctx = useContext(ClaimsContext);
  if (!ctx) throw new Error('useClaims must be used within ClaimsProvider');
  return ctx;
}
