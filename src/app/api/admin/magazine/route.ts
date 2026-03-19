import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { verifyAdminToken } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

/**
 * GET /api/admin/magazine
 * List all articles (admin view — includes drafts)
 */
export async function GET(req: NextRequest) {
  const { isAdmin } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('magazine_articles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ articles: data });
}

/**
 * POST /api/admin/magazine
 * Create a new article
 */
export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { slug, title_en, title_zh, category, source_lang, author_name, body_en, body_zh, ...rest } = body;

  if (!slug?.trim()) {
    return NextResponse.json({ error: 'slug is required' }, { status: 400 });
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('magazine_articles')
    .insert({
      slug: slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-'),
      title_en,
      title_zh,
      category: category || 'artist-feature',
      source_lang: source_lang || 'zh',
      author_name,
      body_en,
      body_zh,
      created_by: userId,
      ...rest,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  writeAuditLog({
    adminUserId: userId,
    action: 'create_magazine_article',
    entityType: 'magazine',
    entityId: data.id,
    details: { slug: data.slug },
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  revalidateTag('magazine', { expire: 0 });
  return NextResponse.json({ article: data });
}

/**
 * PUT /api/admin/magazine
 * Update an existing article
 */
export async function PUT(req: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json();
  const { id, ...fields } = body;

  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  // If publishing, set published_at
  if (fields.status === 'published' && !fields.published_at) {
    fields.published_at = new Date().toISOString();
  }

  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from('magazine_articles')
    .update(fields)
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  writeAuditLog({
    adminUserId: userId,
    action: 'update_magazine_article',
    entityType: 'magazine',
    entityId: id,
    details: { fields: Object.keys(fields) },
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  revalidateTag('magazine', { expire: 0 });
  return NextResponse.json({ article: data });
}

/**
 * DELETE /api/admin/magazine
 * Delete an article (hard delete)
 */
export async function DELETE(req: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const sb = getSupabaseAdmin();
  const { error } = await sb.from('magazine_articles').delete().eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  writeAuditLog({
    adminUserId: userId,
    action: 'delete_magazine_article',
    entityType: 'magazine',
    entityId: id,
    details: {},
    ipAddress: req.headers.get('x-forwarded-for'),
  });

  revalidateTag('magazine', { expire: 0 });
  return NextResponse.json({ success: true });
}
