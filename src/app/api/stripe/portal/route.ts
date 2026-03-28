import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { stripe } from '@/lib/stripe';

/**
 * POST /api/stripe/portal
 * Body: { entityType: 'artist'|'venue', entityId: string }
 *
 * Returns a Stripe Customer Portal URL for managing subscription.
 * Caller must be the owner.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { entityType, entityId } = await request.json();
  if (!entityType || !entityId) {
    return NextResponse.json({ error: 'Missing entityType or entityId' }, { status: 400 });
  }

  const adminClient = createAdminClient();
  const table = entityType === 'artist' ? 'artists' : 'venues';
  const idCol  = entityType === 'artist' ? 'artist_id' : 'venue_id';

  // Only owner can access billing portal
  const { data: membership } = await adminClient
    .from('team_members')
    .select('role')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .eq('user_id', user.id)
    .eq('status', 'accepted')
    .single();

  if (membership?.role !== 'owner') {
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

  const { data: entity } = await adminClient
    .from(table)
    .select('stripe_customer_id')
    .eq(idCol, entityId)
    .single();

  if (!entity?.stripe_customer_id) {
    return NextResponse.json({ error: 'No billing account found' }, { status: 404 });
  }

  const origin = request.headers.get('origin') ?? 'https://jazznode.com';
  const returnUrl = `${origin}/profile/${entityType}/${entityId}/billing`;

  const session = await stripe.billingPortal.sessions.create({
    customer: entity.stripe_customer_id,
    return_url: returnUrl,
  });

  return NextResponse.json({ url: session.url });
}
