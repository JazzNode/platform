import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyArtistClaimToken } from '@/lib/artist-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { translateAndGenerate } from '@/lib/gemini';
import { createAdminClient } from '@/utils/supabase/admin';

const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'];

// If a full bio is already shorter than the short bio target, reuse it directly
const wordCount = (s: string) => s.trim().split(/\s+/).length;
const SHORT_BIO_THRESHOLDS: Record<string, { src: string; max: number; measure: (s: string) => number }> = {
  bio_short_zh: { src: 'bio_zh', max: 70, measure: (s) => s.length },
  bio_short_en: { src: 'bio_en', max: 40, measure: wordCount },
  bio_short_ja: { src: 'bio_ja', max: 100, measure: (s) => s.length },
  bio_short_ko: { src: 'bio_ko', max: 90, measure: (s) => s.length },
  bio_short_th: { src: 'bio_th', max: 110, measure: (s) => s.length },
  bio_short_id: { src: 'bio_id', max: 40, measure: wordCount },
};

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
      // If the ORIGINAL user input is already short, reuse translated bio as short_bio
      // (prevents Gemini from expanding a short input into a long bio_short)
      if (fieldPrefix === 'bio') {
        const srcWordCount = content.trim().split(/\s+/).length;
        const srcCharCount = content.trim().length;
        // Use English word-count threshold as the universal check for the source input
        const isSourceShort = srcWordCount <= 40 && srcCharCount <= 110;

        for (const [shortKey, cfg] of Object.entries(SHORT_BIO_THRESHOLDS)) {
          const fullBio = fields[cfg.src];
          if (fullBio && (isSourceShort || cfg.measure(fullBio) <= cfg.max)) {
            fields[shortKey] = fullBio;
          }
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

    revalidateTag('artists', { expire: 0 });

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
