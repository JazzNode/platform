import { NextRequest, NextResponse } from 'next/server';
import { verifyOwnerToken } from '@/lib/admin-auth';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * PATCH /api/owner/revenue/[id] — Update a revenue entry
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

  // Verify revenue entry exists
  const { data: existing } = await supabase
    .from('company_revenue')
    .select('id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Revenue entry not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('company_revenue')
    .update({ ...body, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ revenue: data });
}

/**
 * DELETE /api/owner/revenue/[id] — Delete a revenue entry
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

  // Verify revenue entry exists
  const { data: existing } = await supabase
    .from('company_revenue')
    .select('id')
    .eq('id', id)
    .single();

  if (!existing) {
    return NextResponse.json({ error: 'Revenue entry not found' }, { status: 404 });
  }

  const { error } = await supabase
    .from('company_revenue')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
