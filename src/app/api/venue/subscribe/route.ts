import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * POST /api/venue/subscribe
 * Submit an Elite venue subscription request.
 * Creates a venue_subscriptions record + admin notification + push notification.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueName, venueAddress, contactName, contactEmail, contactPhone, notes } = await request.json();

  if (!venueName?.trim() || !contactEmail?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  // Check for existing pending subscription from this user
  const { data: existing } = await adminClient
    .from('venue_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .single();

  if (existing) {
    return NextResponse.json({ error: 'You already have a pending subscription request' }, { status: 409 });
  }

  // Create subscription request
  const { data: sub, error: insertErr } = await adminClient
    .from('venue_subscriptions')
    .insert({
      user_id: user.id,
      venue_name: venueName.trim(),
      venue_address: venueAddress?.trim() || null,
      contact_name: contactName?.trim() || null,
      contact_email: contactEmail.trim(),
      contact_phone: contactPhone?.trim() || null,
      notes: notes?.trim() || null,
      plan: 'elite',
      status: 'pending',
    })
    .select('id')
    .single();

  if (insertErr || !sub) {
    return NextResponse.json({ error: 'Failed to create subscription' }, { status: 500 });
  }

  // Notify admin via HQ notification
  // Find admin/owner users to notify
  const { data: admins } = await adminClient
    .from('profiles')
    .select('id')
    .in('role', ['admin', 'owner']);

  if (admins && admins.length > 0) {
    const notifications = admins.map((admin) => ({
      user_id: admin.id,
      type: 'venue_subscription',
      title: `🏪 New Elite Venue Request: ${venueName.trim()}`,
      body: `${contactName || user.email} wants to create an Elite venue.\nEmail: ${contactEmail}\nAddress: ${venueAddress || 'Not provided'}`,
      reference_type: 'venue_subscription',
      reference_id: sub.id,
      status: 'sent',
    }));
    await adminClient.from('notifications').insert(notifications);
  }

  return NextResponse.json({ id: sub.id });
}
