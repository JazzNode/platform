import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyAdminToken } from '@/lib/admin-auth';
import { writeAuditLog } from '@/lib/audit-log';
import { translateAndGenerate } from '@/lib/gemini';
import { createAdminClient } from '@/utils/supabase/admin';

const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'];

// If the original user input is already short, reuse translated bio as short_bio
const wordCount = (s: string) => s.trim().split(/\s+/).length;
const SHORT_BIO_THRESHOLDS: Record<string, { src: string; max: number; measure: (s: string) => number }> = {
  bio_short_zh: { src: 'bio_zh', max: 70, measure: (s) => s.length },
  bio_short_en: { src: 'bio_en', max: 40, measure: wordCount },
  bio_short_ja: { src: 'bio_ja', max: 100, measure: (s) => s.length },
  bio_short_ko: { src: 'bio_ko', max: 90, measure: (s) => s.length },
  bio_short_th: { src: 'bio_th', max: 110, measure: (s) => s.length },
  bio_short_id: { src: 'bio_id', max: 40, measure: wordCount },
};

const ENTITY_TABLE: Record<string, string> = {
  artist: 'artists',
  event: 'events',
  venue: 'venues',
};

const ENTITY_PK: Record<string, string> = {
  artist: 'artist_id',
  event: 'event_id',
  venue: 'venue_id',
};

const ENTITY_TAG: Record<string, string> = {
  artist: 'artists',
  event: 'events',
  venue: 'venues',
};

export async function POST(req: NextRequest) {
  const { isAdmin, userId } = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin || !userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { entityType, entityId, fieldPrefix, sourceLocale, content } = await req.json();

    if (!entityType || !entityId || !fieldPrefix || !sourceLocale) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!ENTITY_TABLE[entityType]) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }
    if (!LOCALES.includes(sourceLocale)) {
      return NextResponse.json({ error: 'Invalid locale' }, { status: 400 });
    }
    if (fieldPrefix !== 'bio' && fieldPrefix !== 'description') {
      return NextResponse.json({ error: 'Invalid field prefix' }, { status: 400 });
    }

    const needShort = !(entityType === 'venue' && fieldPrefix === 'description');

    // Empty content = clear all related fields (admin god-mode)
    if (!content) {
      const fields: Record<string, null> = {};
      for (const locale of LOCALES) {
        fields[`${fieldPrefix}_${locale}`] = null;
        if (needShort) {
          fields[`${fieldPrefix}_short_${locale}`] = null;
        }
      }

      const supabase = createAdminClient();
      const table = ENTITY_TABLE[entityType];
      const pk = ENTITY_PK[entityType];

      const { error: updateError } = await supabase
        .from(table)
        .update({
          ...fields,
          updated_at: new Date().toISOString(),
          ...(table !== 'events' && { data_source: 'admin', updated_by: userId }),
        })
        .eq(pk, entityId);

      if (updateError) {
        throw new Error(`Supabase update failed: ${updateError.message}`);
      }

      revalidateTag(ENTITY_TAG[entityType], { expire: 0 });

      writeAuditLog({
        adminUserId: userId,
        action: 'clear_content',
        entityType,
        entityId,
        details: { fieldPrefix, fieldsCleared: Object.keys(fields) },
        ipAddress: req.headers.get('x-forwarded-for'),
      });

      return NextResponse.json({
        success: true,
        fieldsCleared: Object.keys(fields),
      });
    }

    let translationFailed = false;
    let translationError: string | undefined;
    let geminiResult: Record<string, string> = {};

    try {
      geminiResult = await translateAndGenerate({
        content,
        sourceLocale: sourceLocale as 'en' | 'zh' | 'ja' | 'ko' | 'th' | 'id',
        fieldPrefix: fieldPrefix as 'bio' | 'description',
        entityType: entityType as 'artist' | 'event' | 'venue',
      });
    } catch (err) {
      console.error('Gemini translation failed, writing source only:', err);
      translationFailed = true;
      translationError = err instanceof Error ? err.message : 'Translation failed';
    }

    // Build Supabase update payload
    const fields: Record<string, string> = {};
    fields[`${fieldPrefix}_${sourceLocale}`] = content;

    if (!translationFailed) {
      const targetLocales = LOCALES.filter((l) => l !== sourceLocale);
      for (const locale of targetLocales) {
        const key = `${fieldPrefix}_${locale}`;
        if (geminiResult[key]) fields[key] = geminiResult[key];
      }
      if (needShort) {
        for (const locale of LOCALES) {
          const key = `${fieldPrefix}_short_${locale}`;
          if (geminiResult[key]) fields[key] = geminiResult[key];
        }
      }

      // If original input is short, override short_bio with translated full bio
      if (fieldPrefix === 'bio') {
        const srcWordCount = wordCount(content);
        const srcCharCount = content.trim().length;
        const isSourceShort = srcWordCount <= 40 && srcCharCount <= 110;

        for (const [shortKey, cfg] of Object.entries(SHORT_BIO_THRESHOLDS)) {
          const fullBio = fields[cfg.src];
          if (fullBio && (isSourceShort || cfg.measure(fullBio) <= cfg.max)) {
            fields[shortKey] = fullBio;
          }
        }
      }
    }

    // Update Supabase
    const supabase = createAdminClient();
    const table = ENTITY_TABLE[entityType];
    const pk = ENTITY_PK[entityType];

    const { error: updateError } = await supabase
      .from(table)
      .update({
        ...fields,
        updated_at: new Date().toISOString(),
        ...(table !== 'events' && { data_source: 'admin', updated_by: userId }),
      })
      .eq(pk, entityId);

    if (updateError) {
      throw new Error(`Supabase update failed: ${updateError.message}`);
    }

    revalidateTag(ENTITY_TAG[entityType], { expire: 0 });

    writeAuditLog({
      adminUserId: userId,
      action: 'update_content',
      entityType,
      entityId,
      details: { fieldPrefix, sourceLocale, fieldsUpdated: Object.keys(fields), translationFailed },
      ipAddress: req.headers.get('x-forwarded-for'),
    });

    return NextResponse.json({
      success: true,
      fieldsUpdated: Object.keys(fields),
      translationFailed,
      translationError,
    });
  } catch (err) {
    console.error('Content update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
