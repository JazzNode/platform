import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyAdminToken } from '@/lib/admin-auth';
import { translateAndGenerate } from '@/lib/gemini';
import { TABLE_IDS } from '@/lib/airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;

const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'];

const ENTITY_TABLE: Record<string, string> = {
  artist: TABLE_IDS.Artists,
  event: TABLE_IDS.Events,
  venue: TABLE_IDS.Venues,
};

const ENTITY_TAG: Record<string, string> = {
  artist: 'artists',
  event: 'events',
  venue: 'venues',
};

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminToken(req.headers.get('authorization'));
  if (!isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { entityType, entityId, fieldPrefix, sourceLocale, content } = await req.json();

    // Validate inputs
    if (!entityType || !entityId || !fieldPrefix || !sourceLocale || !content) {
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

    // Determine whether to generate short versions
    const needShort = !(entityType === 'venue' && fieldPrefix === 'description');

    // Call Gemini for translation + short generation
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

    // Build Airtable update payload
    const fields: Record<string, string> = {};

    // Always write the source locale content
    fields[`${fieldPrefix}_${sourceLocale}`] = content;

    if (!translationFailed) {
      // Write translated fields
      const targetLocales = LOCALES.filter((l) => l !== sourceLocale);
      for (const locale of targetLocales) {
        const key = `${fieldPrefix}_${locale}`;
        if (geminiResult[key]) fields[key] = geminiResult[key];
      }
      // Write short fields
      if (needShort) {
        for (const locale of LOCALES) {
          const key = `${fieldPrefix}_short_${locale}`;
          if (geminiResult[key]) fields[key] = geminiResult[key];
        }
      }
    }

    // PATCH Airtable
    const tableId = ENTITY_TABLE[entityType];
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}/${entityId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields }),
      },
    );

    if (!airtableRes.ok) {
      const errText = await airtableRes.text();
      throw new Error(`Airtable update failed: ${errText}`);
    }

    // Revalidate cache
    revalidateTag(ENTITY_TAG[entityType]);

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
