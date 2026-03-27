import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { createAdminClient } from '@/utils/supabase/admin';

const SLUG_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

const BRANDING_FIELDS = [
  'brand_theme_id',
  'custom_cta_label',
  'custom_cta_url',
  'custom_slug',
  'brand_og_image_url',
  'brand_custom_domain',
  'tier',
] as const;

export async function GET(req: NextRequest) {
  const artistId = req.nextUrl.searchParams.get('artistId');
  if (!artistId) {
    return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });
  }

  const { isAuthorized } = await verifyArtistClaimToken(
    req.headers.get('authorization'),
    artistId,
  );
  if (!isAuthorized) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('artists')
    .select(BRANDING_FIELDS.join(', '))
    .eq('artist_id', artistId)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Artist not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { artistId, fields } = body ?? {};

  if (!artistId || !fields) {
    return NextResponse.json({ error: 'Missing artistId or fields' }, { status: 400 });
  }

  const { isAuthorized, userId } = await verifyArtistClaimToken(
    req.headers.get('authorization'),
    artistId,
  );
  if (!isAuthorized || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();

  // Verify tier >= 3 (Elite)
  const { data: artist } = await supabase
    .from('artists')
    .select('tier')
    .eq('artist_id', artistId)
    .single();

  if (!artist || artist.tier < 3) {
    return NextResponse.json({ error: 'Elite tier required' }, { status: 403 });
  }

  // Validate custom_slug if provided
  if (fields.custom_slug !== undefined && fields.custom_slug !== null && fields.custom_slug !== '') {
    const slug = fields.custom_slug as string;
    if (!SLUG_RE.test(slug)) {
      return NextResponse.json(
        { error: 'Slug must be lowercase, alphanumeric + hyphens, 3-40 characters' },
        { status: 400 },
      );
    }

    // Check uniqueness
    const { data: existing } = await supabase
      .from('artists')
      .select('artist_id')
      .eq('custom_slug', slug)
      .neq('artist_id', artistId)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
    }
  }

  // Build update payload (only allowed fields)
  const allowedKeys = [
    'brand_theme_id',
    'custom_cta_label',
    'custom_cta_url',
    'custom_slug',
    'brand_og_image_url',
    'brand_custom_domain',
  ] as const;

  const update: Record<string, unknown> = {};
  for (const key of allowedKeys) {
    if (key in fields) {
      update[key] = fields[key] ?? null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { error: updateErr } = await supabase
    .from('artists')
    .update(update)
    .eq('artist_id', artistId);

  if (updateErr) {
    console.error('Artist branding update error:', updateErr);
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  revalidateTag('artists', { expire: 0 });

  return NextResponse.json({ success: true });
}
