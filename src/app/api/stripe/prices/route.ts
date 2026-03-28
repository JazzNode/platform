import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

/**
 * GET /api/stripe/prices
 * Returns available subscription prices grouped by product.
 */
export async function GET() {
  const productIds = [
    process.env.STRIPE_PRODUCT_ARTIST_PREMIUM!,
    process.env.STRIPE_PRODUCT_ARTIST_ELITE!,
    process.env.STRIPE_PRODUCT_VENUE_PREMIUM!,
    process.env.STRIPE_PRODUCT_VENUE_ELITE!,
  ];

  const results = await Promise.all(
    productIds.map((id) =>
      stripe.prices.list({ product: id, active: true, expand: ['data.product'] })
    )
  );

  const plans = productIds.map((productId, i) => {
    const prices = results[i].data;
    const product = prices[0]?.product as { id: string; name: string; description: string | null } | undefined;

    const monthly = prices.find((p) => p.recurring?.interval === 'month');
    const yearly  = prices.find((p) => p.recurring?.interval === 'year');

    return {
      productId,
      name: product?.name ?? '',
      description: product?.description ?? '',
      monthly: monthly ? { priceId: monthly.id, amount: monthly.unit_amount, nickname: monthly.nickname } : null,
      yearly:  yearly  ? { priceId: yearly.id,  amount: yearly.unit_amount,  nickname: yearly.nickname  } : null,
    };
  });

  return NextResponse.json({ plans });
}
