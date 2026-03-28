import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, resolveProductTier } from '@/lib/stripe';
import { createAdminClient } from '@/utils/supabase/admin';

export const runtime = 'nodejs';

// Stripe requires the raw body for signature verification
export async function POST(request: NextRequest) {
  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig!, webhookSecret);
  } catch (err) {
    console.error('[stripe/webhook] signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionChange(supabase, sub);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(supabase, sub);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(supabase, invoice);
        break;
      }

      case 'invoice.paid': {
        // Renewal confirmed — no action needed, subscription.updated covers tier
        break;
      }

      default:
        // Unhandled event types — ignore
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription,
) {
  const { entityType, entityId } = sub.metadata ?? {};
  if (!entityType || !entityId) {
    console.warn('[stripe/webhook] subscription missing metadata:', sub.id);
    return;
  }

  // Get the first subscription item's product
  const productId = sub.items.data[0]?.price?.product as string | undefined;
  if (!productId) return;

  const resolved = resolveProductTier(productId);
  if (!resolved) {
    console.warn('[stripe/webhook] unknown product:', productId);
    return;
  }

  const { tier } = resolved;
  const table = entityType === 'artist' ? 'artists' : 'venues';
  const idCol = entityType === 'artist' ? 'artist_id' : 'venue_id';

  const stripeFields = {
    stripe_customer_id: sub.customer as string,
    stripe_subscription_id: sub.id,
    stripe_subscription_status: sub.status,
    tier,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from(table)
    .update(stripeFields)
    .eq(idCol, entityId);

  if (error) {
    console.error(`[stripe/webhook] failed to update ${table}:`, error.message);
    throw error;
  }

  console.log(`[stripe/webhook] updated ${entityType} ${entityId} → tier ${tier}`);
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription,
) {
  const { entityType, entityId } = sub.metadata ?? {};
  if (!entityType || !entityId) return;

  const table = entityType === 'artist' ? 'artists' : 'venues';
  const idCol = entityType === 'artist' ? 'artist_id' : 'venue_id';

  // Downgrade to tier 1 (claimed, free)
  await supabase
    .from(table)
    .update({
      tier: 1,
      stripe_subscription_id: null,
      stripe_subscription_status: 'canceled',
      updated_at: new Date().toISOString(),
    })
    .eq(idCol, entityId);

  console.log(`[stripe/webhook] subscription canceled → ${entityType} ${entityId} downgraded to tier 1`);
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
) {
  const sub = invoice.subscription
    ? await stripe.subscriptions.retrieve(invoice.subscription as string)
    : null;

  const { entityType, entityId } = sub?.metadata ?? {};
  if (!entityType || !entityId) return;

  // Find billing_user_id from the entity
  const table = entityType === 'artist' ? 'artists' : 'venues';
  const idCol = entityType === 'artist' ? 'artist_id' : 'venue_id';

  const { data: entity } = await supabase
    .from(table)
    .select('billing_user_id')
    .eq(idCol, entityId)
    .single();

  if (!entity?.billing_user_id) return;

  await supabase.from('notifications').insert({
    user_id: entity.billing_user_id,
    type: 'payment_failed',
    title: 'Payment failed',
    body: 'Your JazzNode subscription payment failed. Please update your payment method to keep your account active.',
    reference_type: entityType,
    reference_id: entityId,
    status: 'sent',
  });

  console.log(`[stripe/webhook] payment_failed notification sent for ${entityType} ${entityId}`);
}
