import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * GET /api/owner/expenses — List all expenses
 * Query params: ?category=cloud (optional filter)
 */
export async function GET(request: NextRequest) {
  const { isOwner } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createAdminClient();
  const category = request.nextUrl.searchParams.get('category');

  let query = supabase.from('company_expenses').select('*').order('name');

  if (category) {
    query = query.eq('category', category);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expenses: data });
}

/**
 * POST /api/owner/expenses — Create a new expense
 */
export async function POST(request: NextRequest) {
  const { isOwner, userId } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner || !userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { name, amount, category, currency, is_recurring, billing_cycle, start_date, end_date, notes } = body;

  if (!name || amount == null || !category || !start_date) {
    return NextResponse.json(
      { error: 'name, amount, category, and start_date are required' },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('company_expenses')
    .insert({
      name,
      amount,
      category,
      currency: currency || 'USD',
      is_recurring: is_recurring ?? true,
      billing_cycle: billing_cycle || 'monthly',
      start_date,
      end_date: end_date || null,
      notes: notes || null,
      created_by: userId,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expense: data });
}
