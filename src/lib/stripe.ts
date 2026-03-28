import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-03-25.dahlia',
});

// Map product ID → { entityType, tier }
const PRODUCT_MAP: Record<string, { entityType: 'artist' | 'venue'; tier: number }> = {
  [process.env.STRIPE_PRODUCT_ARTIST_PREMIUM!]: { entityType: 'artist', tier: 2 },
  [process.env.STRIPE_PRODUCT_ARTIST_ELITE!]:   { entityType: 'artist', tier: 3 },
  [process.env.STRIPE_PRODUCT_VENUE_PREMIUM!]:  { entityType: 'venue',  tier: 2 },
  [process.env.STRIPE_PRODUCT_VENUE_ELITE!]:    { entityType: 'venue',  tier: 3 },
};

export function resolveProductTier(productId: string) {
  return PRODUCT_MAP[productId] ?? null;
}
