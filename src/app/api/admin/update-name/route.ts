import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { verifyAdminToken } from '@/lib/admin-auth';
import { TABLE_IDS } from '@/lib/airtable';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID!;

const ALLOWED_FIELDS = ['name_local', 'name_en', 'display_name'] as const;

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
    const { entityType, entityId, field, value } = await req.json();

    if (!entityType || !entityId || !field || !value) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    if (!ENTITY_TABLE[entityType]) {
      return NextResponse.json({ error: 'Invalid entity type' }, { status: 400 });
    }
    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json({ error: 'Invalid field' }, { status: 400 });
    }

    const tableId = ENTITY_TABLE[entityType];
    const airtableRes = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${tableId}/${entityId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fields: { [field]: value } }),
      },
    );

    if (!airtableRes.ok) {
      const errText = await airtableRes.text();
      throw new Error(`Airtable update failed: ${errText}`);
    }

    revalidateTag(ENTITY_TAG[entityType]);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Name update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Update failed' },
      { status: 500 },
    );
  }
}
