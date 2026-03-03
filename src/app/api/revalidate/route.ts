import { revalidateTag } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';

const VALID_TAGS = ['cities', 'venues', 'artists', 'events', 'badges', 'tags', 'lineups'];

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-revalidate-secret');
  if (secret !== process.env.REVALIDATE_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const tag = body?.tag;

    if (tag && VALID_TAGS.includes(tag)) {
      revalidateTag(tag);
      return NextResponse.json({ revalidated: true, tag });
    }

    // No tag or invalid tag → revalidate all
    for (const t of VALID_TAGS) {
      revalidateTag(t);
    }
    return NextResponse.json({ revalidated: true, tags: VALID_TAGS });
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
