import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const LANG_LABELS: Record<string, string> = {
  en: 'English',
  zh: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  th: 'ภาษาไทย',
  id: 'Bahasa Indonesia',
};

/**
 * POST /api/translate-message — Translate a chat message to a target locale
 */
export async function POST(request: NextRequest) {
  // Verify user is logged in
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!GEMINI_API_KEY) {
    return NextResponse.json({ error: 'Translation service not configured' }, { status: 500 });
  }

  const { text, targetLocale } = await request.json();
  if (!text?.trim() || !targetLocale || !LANG_LABELS[targetLocale]) {
    return NextResponse.json({ error: 'Invalid text or targetLocale' }, { status: 400 });
  }

  const prompt = `Translate the following chat message to ${LANG_LABELS[targetLocale]}.
Keep the tone casual and natural. If the message is already in ${LANG_LABELS[targetLocale]}, return it as-is.
Only output the translated text, nothing else.

Message:
${text.trim()}`;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 1024,
        },
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 200);
      return NextResponse.json({ error: `Translation failed: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const translated = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
    if (!translated) {
      return NextResponse.json({ error: 'Empty translation result' }, { status: 502 });
    }

    return NextResponse.json({ translated });
  } catch (err) {
    return NextResponse.json({ error: 'Translation request timed out' }, { status: 504 });
  }
}
