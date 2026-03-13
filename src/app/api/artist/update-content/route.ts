import { NextRequest, NextResponse } from 'next/server';
import { updateTag } from 'next/cache';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { translateAndGenerate } from '@/lib/gemini';
import { createAdminClient } from '@/utils/supabase/admin';

const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'];

/**
 * Claimed artist can update their own bio.
 * Auto-detects source language and translates to all 6 locales.
 * Also generates bio_short_* variants.
 */
export async function POST(req: NextRequest) {
  try {
    const { entityId, content, fieldPrefix: rawPrefix } = await req.json();

    const ALLOWED_PREFIXES = ['bio', 'teaching_description', 'hire_description'];
    const fieldPrefix = ALLOWED_PREFIXES.includes(rawPrefix) ? rawPrefix : 'bio';

    if (!entityId || !content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Verify the user has claimed this artist
    const { isAuthorized, userId } = await verifyArtistClaimToken(
      req.headers.get('authorization'),
      entityId,
    );
    if (!isAuthorized || !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let translationFailed = false;
    let translationError: string | undefined;
    let geminiResult: Record<string, string> = {};

    // Use Gemini to detect language + translate to all locales + generate short versions
    try {
      // Detect the source locale first, then translate
      // We pass 'en' as default sourceLocale — Gemini will handle auto-detection
      // since we ask it to translate to ALL locales including the source
      geminiResult = await translateAndGenerate({
        content,
        sourceLocale: 'en', // Gemini will auto-detect and override
        fieldPrefix,
        entityType: 'artist',
        autoDetectLanguage: true,
      });
    } catch (err) {
      console.error('Gemini translation failed, writing source only:', err);
      translationFailed = true;
      translationError = err instanceof Error ? err.message : 'Translation failed';
    }

    // Build update payload
    const fields: Record<string, string> = {};

    if (!translationFailed && Object.keys(geminiResult).length > 0) {
      // Use all translated fields from Gemini
      for (const locale of LOCALES) {
        const mainKey = `${fieldPrefix}_${locale}`;
        if (geminiResult[mainKey]) fields[mainKey] = geminiResult[mainKey];
        // bio also has short variants
        if (fieldPrefix === 'bio') {
          const shortKey = `bio_short_${locale}`;
          if (geminiResult[shortKey]) fields[shortKey] = geminiResult[shortKey];
        }
      }
    } else {
      // Fallback: save the raw content to {prefix}_en (best guess)
      fields[`${fieldPrefix}_en`] = content;
    }

    // Update Supabase using admin client (bypasses RLS for simplicity)
    const supabase = createAdminClient();
    const { error: updateError } = await supabase
      .from('artists')
      .update({ ...fields, updated_at: new Date().toISOString(), data_source: 'user', updated_by: userId })
      .eq('artist_id', entityId);

    if (updateError) {
      throw new Error(`Supabase update failed: ${updateError.message}`);
    }

    updateTag('artists');

    writeAuditLog({
      adminUserId: userId,
      action: 'artist_update_content',
      entityType: 'artist',
      entityId,
      details: { fieldsUpdated: Object.keys(fields), translationFailed, claimedUser: true },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({
      success: true,
      fieldsUpdated: Object.keys(fields),
      translationFailed,
      translationError,
    });
  } catch (err) {
    console.error('Artist content update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
