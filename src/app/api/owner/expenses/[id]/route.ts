import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * PATCH /api/owner/expenses/[id] — Update an expense
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { isOwner } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const supabase = createAdminClient();

  // Verify expense exists
  const { data: existing } = await supabase
    .from('company_expenses')
    .select('id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('company_expenses')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ expense: data });
}

/**
 * DELETE /api/owner/expenses/[id] — Delete an expense
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { isOwner } = await verifyOwnerToken(
    request.headers.get('authorization'),
  );
  if (!isOwner) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // Verify expense exists
  const { data: existing } = await supabase
    .from('company_expenses')
    .select('id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Expense not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('company_expenses')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
