import { updateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const VALID_TAGS = ['cities', 'venues', 'artists', 'events', 'badges', 'tags', 'lineups'];

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    let tag: string | undefined;
    try {
      const body = await req.json();
      tag = body?.tag;
    } catch {
      // Empty body or invalid JSON → revalidate all
    }

    if (tag && VALID_TAGS.includes(tag)) {
      updateTag(tag);
      return NextResponse.json({ revalidated: true, tag });
    }

    // No tag or invalid tag → revalidate all
    for (const t of VALID_TAGS) {
      updateTag(t);
    }
    return NextResponse.json({ revalidated: true, tags: VALID_TAGS });
  } catch (err) {
    return NextResponse.json({ error: 'Revalidation failed', detail: String(err) }, { status: 500 });
  }
}
