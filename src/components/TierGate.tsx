'use client';

import { useTierConfig } from './TierConfigProvider';

interface TierGateProps {
  entityType: 'artist' | 'venue';
  featureKey: string;
  currentTier: number;
  children: React.ReactNode;
  /** Render nothing (default) or a fallback when gated */
  fallback?: React.ReactNode;
}

/**
 * Client component that conditionally renders children based on the
 * dynamic tier config fetched from /api/admin/tier-config.
 *
 * Usage on public pages (server components) — wrap the gated section:
 *   <TierGate entityType="venue" featureKey="inbox" currentTier={venue.tier}>
 *     <MessageButton />
 *   </TierGate>
 */
export default function TierGate({ entityType, featureKey, currentTier, children, fallback = null }: TierGateProps) {
  const { isUnlocked } = useTierConfig();

  if (!isUnlocked(entityType, featureKey, currentTier)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
