import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminToken } from '@/lib/admin-auth';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

/**
 * POST /api/admin/magazine/translate
 * Translate magazine article content using Claude Sonnet 4.6
 *
 * Body: { title, excerpt, body, source_lang }
 * Returns: { title_xx, excerpt_xx, body_xx } for 5 target languages
 */
export async function POST(request: NextRequest) {
  const { isAdmin } = await verifyAdminToken(request.headers.get('authorization'));
  if (!isAdmin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: 'Translation service not configured (ANTHROPIC_API_KEY)' }, { status: 500 });
  }

  const { title, excerpt, body, source_lang = 'zh' } = await request.json();
  if (!title?.trim() || !body?.trim()) {
    return NextResponse.json({ error: 'title and body are required' }, { status: 400 });
  }

  const ALL_LANGS = ['en', 'zh', 'ja', 'ko', 'th', 'id'] as const;
  const targetLangs = ALL_LANGS.filter((l) => l !== source_lang);

  const langNames: Record<string, string> = {
    en: 'English',
    zh: '繁體中文 (Traditional Chinese, Taiwan style)',
    ja: '日本語',
    ko: '한국어',
    th: 'ภาษาไทย',
    id: 'Bahasa Indonesia',
  };

  const sourceLangName = langNames[source_lang] || source_lang;
  const targetList = targetLangs.map((l) => `- ${l}: ${langNames[l]}`).join('\n');

  const prompt = `You are a professional translator for JazzNode, an Asian jazz music platform.

Translate the following magazine article content from ${sourceLangName} into 5 languages.
Maintain the tone, style, and cultural nuances. Preserve all Markdown formatting.

=== SOURCE CONTENT ===

Title: ${title.trim()}

${excerpt ? `Excerpt: ${excerpt.trim()}` : ''}

Body (Markdown):
${body.trim()}

=== END SOURCE ===

Target languages:
${targetList}

Output a single JSON object with these exact keys for each target language:
${targetLangs.map((l) => `title_${l}, excerpt_${l}, body_${l}`).join(', ')}

Rules:
- Preserve ALL Markdown formatting (headings, bold, links, images, etc.)
- Keep proper nouns (JazzNode, artist names, venue names, city names) unchanged
- Translate naturally — not word-by-word. Adapt idioms and cultural references.
- For excerpt: keep it under 200 characters per language
- For Thai: use formal written Thai (ภาษาเขียน)
- For Japanese: use です/ます form for body, natural headline style for titles
- For Korean: use 합니다 form for body`;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6-20250514',
        max_tokens: 16000,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
      signal: AbortSignal.timeout(120000), // 2 min timeout for long articles
    });

    if (!res.ok) {
      const errText = (await res.text()).slice(0, 500);
      return NextResponse.json({ error: `Claude API error ${res.status}: ${errText}` }, { status: 502 });
    }

    const data = await res.json();
    const raw = data.content?.[0]?.text || '';
    if (!raw) {
      return NextResponse.json({ error: 'Empty translation result' }, { status: 502 });
    }

    // Parse JSON (handle possible markdown fences)
    const cleaned = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
    const translations = JSON.parse(cleaned);

    return NextResponse.json(translations);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Translation failed';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
