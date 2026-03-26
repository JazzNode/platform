import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyVenueClaimToken } from '@/lib/venue-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { createAdminClient } from '@/utils/supabase/admin';

/** Whitelist of fields a claimed venue owner can directly update */
const ALLOWED_FIELDS = new Set([
  'website_url',
  'instagram',
  'facebook_url',
  'phone',
  'contact_email',
  'business_hour',
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

    const sanitized: Record<string, string | null> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (ALLOWED_FIELDS.has(key)) {
        sanitized[key] = typeof value === 'string' && value.trim() ? value.trim() : null;
      }
    }

    if (Object.keys(sanitized).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const supabase = createAdminClient();
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
