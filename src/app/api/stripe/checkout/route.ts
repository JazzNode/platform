import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/stripe/checkout
 * Body: { entityType: 'artist'|'venue', entityId: string, priceId: string, returnUrl?: string }
 *
 * Creates a Stripe Checkout Session and returns { url }.
 * The user must be the owner of the entity (only owner can change billing).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entityType, entityId, priceId, returnUrl } = await request.json();
  if (!entityType || !entityId || !priceId) {
    return NextResponse.json({ error: 'Missing entityType, entityId, or priceId' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const table = entityType === 'artist' ? 'artists' : 'venues';
  const idCol  = entityType === 'artist' ? 'artist_id' : 'venue_id';

  // Verify caller is the owner (only owner controls billing)
  const { data: membership } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  if (membership?.role !== 'owner') {
    // Fallback: check claimed_*_ids (legacy owners before team_members)
    const { data: profile } = await supabase
      .from('profiles')
      .select('claimed_artist_ids, claimed_venue_ids')
      .eq('id', user.id)
      .single();

    const ids = entityType === 'artist'
      ? profile?.claimed_artist_ids ?? []
      : profile?.claimed_venue_ids ?? [];

    if (!ids.includes(entityId)) {
      return NextResponse.json({ error: 'Only the owner can manage billing' }, { status: 403 });
    }
  }

  // Get or create Stripe customer linked to billing user
  const { data: entity } = await adminClient
    .from(table)
    .select('stripe_customer_id, billing_user_id')
    .eq(idCol, entityId)
    .single();

  let customerId = entity?.stripe_customer_id;

  if (!customerId) {
    // Get user's email from auth.users and display_name from profiles
    const billingUserId = entity?.billing_user_id ?? user.id;
    const { data: { user: billingUser } } = await adminClient.auth.admin.getUserById(billingUserId);
    const { data: profile } = await adminClient
      .from('profiles')
      .select('display_name')
      .eq('id', billingUserId)
      .single();

    const customer = await stripe.customers.create({
      email: billingUser?.email ?? undefined,
      name: profile?.display_name ?? undefined,
      metadata: { entityType, entityId, userId: user.id },
    });
    customerId = customer.id;

    // Store customer ID on entity
    await adminClient
      .from(table)
      .update({ stripe_customer_id: customerId })
      .eq(idCol, entityId);
  }

  // Determine success/cancel URLs
  const origin = request.headers.get('origin') ?? 'https://jazznode.com';
  const basePath = entityType === 'artist'
    ? `/profile/artist/${entityId}`
    : `/profile/venue/${entityId}`;
  const successUrl = returnUrl ?? `${origin}${basePath}/billing?success=1`;
  const cancelUrl  = `${origin}${basePath}/billing?canceled=1`;

  // Create Checkout Session
  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    subscription_data: {
      metadata: { entityType, entityId },
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
  });

  return NextResponse.json({ url: session.url });
}
