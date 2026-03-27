import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/owner/revenue — List revenue entries
 * Query params: ?source=stripe&from=2026-01-01&to=2026-12-31
 */
export async function GET(request: NextRequest) {
  const { isOwner } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const source = request.nextUrl.searchParams.get('source');
  const from = request.nextUrl.searchParams.get('from');
  const to = request.nextUrl.searchParams.get('to');

  let query = supabase.from('company_revenue').select('*').order('revenue_date', { ascending: false });

  if (source) {
    query = query.eq('source', source);
  }
  if (from) {
    query = query.gte('revenue_date', from);
  }
  if (to) {
    query = query.lte('revenue_date', to);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revenue: data });
}

/**
 * POST /api/owner/revenue — Create a revenue entry
 */
export async function POST(request: NextRequest) {
  const { isOwner, userId } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner || !userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { source, description, amount, currency, revenue_date, stripe_payment_id, notes } = body;

  if (!source || !description || amount == null || !revenue_date) {
    return NextResponse.json(
      { error: 'source, description, amount, and revenue_date are required' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('company_revenue')
    .insert({
      source,
      description,
      amount,
      currency: currency || 'USD',
      revenue_date,
      stripe_payment_id: stripe_payment_id || null,
      notes: notes || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revenue: data });
}
