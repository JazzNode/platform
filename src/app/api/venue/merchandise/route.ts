import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { r2KeyFromUrl, deleteFromR2 } from '@/lib/r2';

/**
 * GET /api/venue/merchandise?venueId=xxx
 * Public: available products only. Owner/admin: all.
 */
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venueId');
  if (!venueId) {
    return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });
  }

  const adminClient = createAdminClient();

  let isOwner = false;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('claimed_venue_ids, role')
        .eq('id', user.id)
        .single();
      isOwner = !!(
        profile?.claimed_venue_ids?.includes(venueId) ||
        profile?.role === 'admin' ||
        profile?.role === 'owner'
      );
    }
  } catch {}

  let query = adminClient
    .from('venue_merchandise')
    .select('id, venue_id, name, description, price, image_url, external_url, available, sort_order, created_at, updated_at')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false });

  if (!isOwner) {
    query = query.eq('available', true);
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: 'Failed to fetch merchandise' }, { status: 500 });
  }

  return NextResponse.json({ items: data || [] });
}

/**
 * POST /api/venue/merchandise
 * Body: { venueId, name, description?, price?, imageUrl?, externalUrl?, available? }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId, name, description, price, imageUrl, externalUrl, available } = await request.json();

  if (!venueId || !name?.trim()) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Check tier
  const { data: venue } = await adminClient
    .from('venues')
    .select('tier')
    .eq('venue_id', venueId)
    .single();
  if (!isAdmin && (!venue || (venue.tier ?? 0) < 2)) {
    return NextResponse.json({ error: 'Premium tier required' }, { status: 403 });
  }

  // Determine next sort_order
  const { data: maxRow } = await adminClient
    .from('venue_merchandise')
    .select('sort_order')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single();
  const nextSort = (maxRow?.sort_order ?? -1) + 1;

  const { data: item, error: insertError } = await adminClient
    .from('venue_merchandise')
    .insert({
      venue_id: venueId,
      name: name.trim(),
      description: description?.trim() || null,
      price: price ?? null,
      image_url: imageUrl || null,
      external_url: externalUrl?.trim() || null,
      available: available ?? true,
      sort_order: nextSort,
      created_by: user.id,
    })
    .select('id')
    .single();

  if (insertError || !item) {
    return NextResponse.json({ error: 'Failed to create merchandise' }, { status: 500 });
  }

  return NextResponse.json({ id: item.id });
}

/**
 * PATCH /api/venue/merchandise
 * Body: { id, venueId, name?, description?, price?, imageUrl?, externalUrl?, available?, sortOrder? }
 */
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, venueId, name, description, price, imageUrl, externalUrl, available, sortOrder } = await request.json();
  if (!id || !venueId) {
    return NextResponse.json({ error: 'Missing id or venueId' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (name !== undefined) updates.name = name.trim();
  if (description !== undefined) updates.description = description?.trim() || null;
  if (price !== undefined) updates.price = price;
  if (imageUrl !== undefined) updates.image_url = imageUrl || null;
  if (externalUrl !== undefined) updates.external_url = externalUrl?.trim() || null;
  if (available !== undefined) updates.available = available;
  if (sortOrder !== undefined) updates.sort_order = sortOrder;

  const { error } = await adminClient
    .from('venue_merchandise')
    .update(updates)
    .eq('id', id)
    .eq('venue_id', venueId);

  if (error) {
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

/**
 * DELETE /api/venue/merchandise
 * Body: { id, venueId }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id, venueId } = await request.json();
  if (!id || !venueId) {
    return NextResponse.json({ error: 'Missing id or venueId' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Get the item to delete its image from R2
  const { data: item } = await adminClient
    .from('venue_merchandise')
    .select('image_url')
    .eq('id', id)
    .eq('venue_id', venueId)
    .single();

  if (item?.image_url) {
    try {
      await deleteFromR2(r2KeyFromUrl(item.image_url));
    } catch {}
  }

  const { error } = await adminClient
    .from('venue_merchandise')
    .delete()
    .eq('id', id)
    .eq('venue_id', venueId);

  if (error) {
    return NextResponse.json({ error: 'Failed to delete' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
