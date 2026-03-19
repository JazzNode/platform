import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * POST /api/admin/magazine/generate-excerpt
 * Generate excerpts for a magazine article using Gemini (fast & cheap)
 * Body: { title, body, source_lang }
 * Returns: { excerpt_en, excerpt_zh, excerpt_ja, excerpt_ko, excerpt_th, excerpt_id }
 */
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Gemini not configured' }, { status: 500 });
  }

  const { title, body, source_lang = 'zh' } = await request.json();
  if (!body?.trim()) {
    return NextResponse.json({ error: 'body is required' }, { status: 400 });
  }

  const prompt = `You are a content editor for JazzNode, an Asian jazz music platform.

Generate a concise, compelling excerpt (summary) for the following article in ALL 6 languages.
Each excerpt should be 1-2 sentences, under 150 characters, and make the reader want to read the full article.

Article title: ${title || '(untitled)'}
Source language: ${source_lang}
Article body (first 2000 chars):
${body.trim().slice(0, 2000)}

Output a single JSON object with these keys:
excerpt_en, excerpt_zh, excerpt_ja, excerpt_ko, excerpt_th, excerpt_id

Rules:
- Each excerpt should capture the essence of the article
- Use engaging, magazine-style language
- Keep under 150 characters per language
- zh should be 繁體中文 (Traditional Chinese, Taiwan style)`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.5,
          maxOutputTokens: 2048,
          responseMimeType: 'application/json',
        },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 300);
      return NextResponse.json({ error: `Gemini error ${res.status}: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    if (!raw) {
      return NextResponse.json({ error: 'Empty result' }, { status: 502 });
    }

    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const excerpts = JSON.parse(cleaned);

    return NextResponse.json(excerpts);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Excerpt generation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
