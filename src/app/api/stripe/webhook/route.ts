import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, resolveProductTier } from '@/lib/stripe';
import { createAdminClient } from '@/utils/supabase/admin';
import { sendEmail } from '@/lib/email';

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
        await handleSubscriptionChange(supabase, sub, event.type === 'customer.subscription.created');
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

      case 'invoice.paid':
        // Renewal confirmed — subscription.updated already handles tier
        break;

      default:
        break;
    }
  } catch (err) {
    console.error(`[stripe/webhook] error handling ${event.type}:`, err);
    return NextResponse.json({ error: 'Handler error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getBillingUser(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  idCol: string,
  entityId: string,
): Promise<{ userId: string; email: string | undefined } | null> {
  const { data: entity } = await supabase
    .from(table)
    .select('billing_user_id')
    .eq(idCol, entityId)
    .single();

  if (!entity?.billing_user_id) return null;

  const { data: { user } } = await supabase.auth.admin.getUserById(entity.billing_user_id);
  return { userId: entity.billing_user_id, email: user?.email };
}

// ─── Handlers ────────────────────────────────────────────────────────────────

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription,
  isNew: boolean,
) {
  const { entityType, entityId } = sub.metadata ?? {};
  if (!entityType || !entityId) {
    console.warn('[stripe/webhook] subscription missing metadata:', sub.id);
    return;
  }

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

  const { error } = await supabase
    .from(table)
    .update({
      stripe_customer_id: sub.customer as string,
      stripe_subscription_id: sub.id,
      stripe_subscription_status: sub.status,
      tier,
      updated_at: new Date().toISOString(),
    })
    .eq(idCol, entityId);

  if (error) {
    console.error(`[stripe/webhook] failed to update ${table}:`, error.message);
    throw error;
  }

  console.log(`[stripe/webhook] updated ${entityType} ${entityId} → tier ${tier}`);

  // Send welcome email on new subscription
  if (isNew && sub.status === 'active') {
    const billingUser = await getBillingUser(supabase, table, idCol, entityId);
    if (billingUser?.email) {
      const tierName = tier === 3 ? 'Elite' : 'Premium';
      await sendEmail({
        to: billingUser.email,
        subject: `Welcome to JazzNode ${tierName} 🎵`,
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#1a1a1a">
            <h1 style="font-size:24px;margin-bottom:8px">You're on JazzNode ${tierName}!</h1>
            <p style="color:#666;margin-bottom:24px">Your subscription is now active. Head to your dashboard to explore all the features included in your plan.</p>
            <a href="https://jazznode.com/profile/${entityType}/${entityId}/billing"
               style="display:inline-block;background:#C9A84C;color:#0A0A0A;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
              Go to Dashboard
            </a>
            <p style="color:#999;font-size:12px;margin-top:32px">JazzNode · jazz lives here</p>
          </div>
        `,
      });
    }
  }
}

async function handleSubscriptionDeleted(
  supabase: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription,
) {
  const { entityType, entityId } = sub.metadata ?? {};
  if (!entityType || !entityId) return;

  const table = entityType === 'artist' ? 'artists' : 'venues';
  const idCol = entityType === 'artist' ? 'artist_id' : 'venue_id';

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

  // Notify billing user
  const billingUser = await getBillingUser(supabase, table, idCol, entityId);
  if (billingUser) {
    await supabase.from('notifications').insert({
      user_id: billingUser.userId,
      type: 'subscription_canceled',
      title: 'Subscription canceled',
      body: 'Your JazzNode subscription has been canceled. Your account has been downgraded to the free plan.',
      reference_type: entityType,
      reference_id: entityId,
      status: 'sent',
    });
  }
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice,
) {
  const subscriptionId = (invoice as unknown as { subscription?: string }).subscription ?? null;
  const sub = subscriptionId ? await stripe.subscriptions.retrieve(subscriptionId) : null;

  const { entityType, entityId } = sub?.metadata ?? {};
  if (!entityType || !entityId) return;

  const table = entityType === 'artist' ? 'artists' : 'venues';
  const idCol = entityType === 'artist' ? 'artist_id' : 'venue_id';

  const billingUser = await getBillingUser(supabase, table, idCol, entityId);
  if (!billingUser) return;

  // In-app notification
  await supabase.from('notifications').insert({
    user_id: billingUser.userId,
    type: 'payment_failed',
    title: 'Payment failed',
    body: 'Your JazzNode subscription payment failed. Please update your payment method to keep your account active.',
    reference_type: entityType,
    reference_id: entityId,
    status: 'sent',
  });

  // Email
  if (billingUser.email) {
    await sendEmail({
      to: billingUser.email,
      subject: 'Action required: JazzNode payment failed',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;color:#1a1a1a">
          <h1 style="font-size:24px;margin-bottom:8px">Payment failed</h1>
          <p style="color:#666;margin-bottom:24px">We were unable to process your JazzNode subscription payment. Please update your payment method to avoid losing access to your plan features.</p>
          <a href="https://jazznode.com/profile/${entityType}/${entityId}/billing"
             style="display:inline-block;background:#ef4444;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px">
            Update Payment Method
          </a>
          <p style="color:#999;font-size:12px;margin-top:32px">JazzNode · jazz lives here</p>
        </div>
      `,
    });
  }

  console.log(`[stripe/webhook] payment_failed notification + email sent for ${entityType} ${entityId}`);
}
