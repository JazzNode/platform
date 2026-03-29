import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

/** Whitelist of fields a claimed venue owner can directly update */
const ALLOWED_FIELDS = new Set([
  // Basic info (Claimed+)
  'display_name',
  'description_en',
  'description_zh',
  'description_ja',
  'description_short_en',
  'description_short_zh',
  'description_short_ja',
  'website_url',
  'instagram',
  'facebook_url',
  'phone',
  'contact_email',
  'business_hour',
  'address_local',
  'address_en',
  'capacity',
  'venue_type',
  'payment_method',
  'friendly_en',
  'friendly_zh',
  'friendly_ja',
  'friendly_ko',
  'friendly_th',
  'friendly_id',
  // Premium+ (managed by dedicated pages)
  'brand_theme_id',
  'brand_accent_color',
  'brand_font_pair',
  'brand_hero_style',
  'brand_hero_text_align',
  'brand_hero_overlay_opacity',
  'brand_cta_text',
  'brand_sections_visible',
  'brand_og_image_url',
  'brand_favicon_url',
  'custom_slug',
]);

export async function POST(req: NextRequest) {
  try {
    const { venueId, fields } = await req.json();

    if (!venueId || !fields || typeof fields !== 'object') {
      return NextResponse.json({ error: 'Missing venueId or fields' }, { status: 400 });
    }

    const { isAuthorized, userId } = await verifyVenueClaimToken(
      req.headers.get('authorization'),
      venueId,
    );
    if (!isAuthorized || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const sanitized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (!ALLOWED_FIELDS.has(key)) continue;
      // Preserve non-string types (numbers, objects, arrays, booleans)
      if (value === null || value === undefined) {
        sanitized[key] = null;
      } else if (typeof value === 'string') {
        sanitized[key] = value.trim() || null;
      } else {
        sanitized[key] = value;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = createAdminClient();

    // ── Custom slug validation ──
    if ('custom_slug' in sanitized && sanitized.custom_slug) {
      const slug = (sanitized.custom_slug as string).toLowerCase();
      const slugRegex = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;
      if (!slugRegex.test(slug)) {
        return NextResponse.json({ error: 'Invalid slug format (3-40 chars, lowercase alphanumeric + hyphens)' }, { status: 400 });
      }
      // Check uniqueness
      const { data: existing } = await supabase
        .from('venues')
        .select('venue_id')
        .eq('custom_slug', slug)
        .neq('venue_id', venueId)
        .single();
      if (existing) {
        return NextResponse.json({ error: 'This slug is already taken' }, { status: 409 });
      }
      sanitized.custom_slug = slug;
    }

    const { error: updateError } = await supabase
      .from('venues')
      .update({ ...sanitized, updated_at: new Date().toISOString(), data_source: 'user', updated_by: userId })
      .eq('venue_id', venueId);

    if (updateError) {
      throw new Error(`Supabase update failed: ${updateError.message}`);
    }

    revalidateTag('venues', { expire: 0 });

    writeAuditLog({
      adminUserId: userId,
      action: 'venue_update_profile',
      entityType: 'venue',
      entityId: venueId,
      details: { fieldsUpdated: Object.keys(sanitized), claimedUser: true },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({ success: true, fieldsUpdated: Object.keys(sanitized) });
  } catch (err) {
    console.error('Venue profile update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
