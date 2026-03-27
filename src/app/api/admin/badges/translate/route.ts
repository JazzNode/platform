import { NextRequest, NextResponse } from 'next/server';
import { verifyHQToken, hasPermission } from '@/lib/admin-auth';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

/**
 * POST /api/admin/badges/translate
 * Body: { name_en: string, description_en: string }
 * Returns: { name_zh, name_ja, name_ko, name_th, name_id, description_zh, ... }
 */
export async function POST(request: NextRequest) {
  const { isHQ, role } = await verifyHQToken(request.headers.get('authorization'));
  if (!isHQ || !hasPermission(role, ['admin', 'owner'])) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Translation service not configured' }, { status: 500 });
  }

  const { name_en, description_en } = await request.json();
  if (!name_en?.trim()) {
    return NextResponse.json({ error: 'name_en is required' }, { status: 400 });
  }

  const prompt = `You are a professional translator for a jazz music platform called JazzNode.

Translate the following badge name and description into 5 languages. Keep translations concise, natural, and culturally appropriate.

Badge Name (English): ${name_en.trim()}
Badge Description (English): ${(description_en || '').trim()}

Target languages:
- zh: 繁體中文 (Traditional Chinese, Taiwan style)
- ja: 日本語
- ko: 한국어
- th: ภาษาไทย
- id: Bahasa Indonesia

Output a single JSON object with these exact keys:
name_zh, name_ja, name_ko, name_th, name_id,
description_zh, description_ja, description_ko, description_th, description_id

Rules:
- Keep badge names short (2-5 words equivalent)
- Preserve music terminology naturally in each language
- Do NOT translate proper nouns (JazzNode, etc.)`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
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
      return NextResponse.json({ error: 'Empty translation result' }, { status: 502 });
    }

    // Parse JSON (handle markdown fences)
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const translations = JSON.parse(cleaned);

    return NextResponse.json(translations);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Translation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
