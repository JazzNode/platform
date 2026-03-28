import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/stripe/connect
 * Body: { venueId }
 *
 * Creates or retrieves a Stripe Connect account for the venue,
 * then generates an Account Link for onboarding.
 * Caller must be owner of the venue and on Elite tier.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId } = await request.json();
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  const adminClient = createAdminClient();

  // Must be owner
  const { data: membership } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', 'venue')
    .eq('entity_id', venueId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  if (membership?.role !== 'owner') {
    return NextResponse.json({ error: 'Only the owner can set up ticketing' }, { status: 403 });
  }

  // Must be Elite tier
  const { data: venue } = await adminClient
    .from('venues')
    .select('tier, stripe_connect_account_id')
    .eq('venue_id', venueId)
    .single();

  if (!venue || venue.tier < 3) {
    return NextResponse.json({ error: 'Stripe Connect requires Elite tier' }, { status: 403 });
  }

  // Get or create Connect account
  let accountId = venue.stripe_connect_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'standard',
      metadata: { venueId },
    });
    accountId = account.id;

    await adminClient
      .from('venues')
      .update({ stripe_connect_account_id: accountId })
      .eq('venue_id', venueId);
  }

  // Generate Account Link for onboarding
  const origin = request.headers.get('origin') ?? 'https://jazznode.com';
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/profile/venue/${venueId}/billing?connect=refresh`,
    return_url: `${origin}/profile/venue/${venueId}/billing?connect=success`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: accountLink.url });
}

/**
 * GET /api/stripe/connect?venueId=xxx
 * Returns Connect account status for the venue.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const venueId = request.nextUrl.searchParams.get('venueId');
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  const adminClient = createAdminClient();
  const { data: venue } = await adminClient
    .from('venues')
    .select('stripe_connect_account_id, stripe_connect_onboarded')
    .eq('venue_id', venueId)
    .single();

  if (!venue?.stripe_connect_account_id) {
    return NextResponse.json({ connected: false, onboarded: false });
  }

  // Verify with Stripe
  const account = await stripe.accounts.retrieve(venue.stripe_connect_account_id);
  const onboarded = account.details_submitted && account.charges_enabled;

  // Sync onboarded status
  if (onboarded && !venue.stripe_connect_onboarded) {
    await adminClient
      .from('venues')
      .update({ stripe_connect_onboarded: true })
      .eq('venue_id', venueId);
  }

  return NextResponse.json({
    connected: true,
    onboarded,
    accountId: venue.stripe_connect_account_id,
  });
}
