const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = 'gemini-3-flash-preview';
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

const LOCALES = ['en', 'zh', 'ja', 'ko', 'th', 'id'] as const;
type Locale = (typeof LOCALES)[number];

const LANG_LABELS: Record<Locale, string> = {
  en: 'English',
  zh: '繁體中文',
  ja: '日本語',
  ko: '한국어',
  th: 'ภาษาไทย',
  id: 'Bahasa Indonesia',
};

const BIO_STYLE: Record<Locale, string> = {
  en: 'Professional jazz editor tone. Preserve all facts from source.',
  zh: '專業但溫暖的爵士樂評風格。保留原始事實，不要捏造。',
  ja: '敬意を込めた職人的な文体。事実を忠実に。',
  ko: '정중하고 전문적인 재즈 문체. 사실에 충실하게.',
  th: 'สไตล์นักวิจารณ์แจ๊สมืออาชีพ ยึดข้อเท็จจริงจากต้นฉบับ',
  id: 'Gaya editor jazz profesional. Pertahankan semua fakta dari sumber.',
};

const DESC_STYLE: Record<Locale, string> = {
  en: 'Professional event description. Remove HTML artifacts and duplicated ticket info. Preserve all factual content.',
  zh: '從原始資料中整理出活動描述。去除 HTML entities、重複票務資訊。專業但溫暖的爵士樂評風格。',
  ja: '同上ルール。敬意を込めた職人的な文体。',
  ko: '위와 동일한 규칙. 정중하고 전문적인 재즈 문체.',
  th: 'กฎเดียวกัน สไตล์นักวิจารณ์แจ๊สมืออาชีพ',
  id: 'Aturan yang sama. Gaya editor jazz profesional.',
};

export interface TranslateOptions {
  content: string;
  sourceLocale: Locale;
  fieldPrefix: 'bio' | 'description';
  entityType: 'artist' | 'event' | 'venue';
  /** When true, auto-detect language and translate to ALL 6 locales (including source locale) */
  autoDetectLanguage?: boolean;
}

/**
 * Parse Gemini response text into a JSON object.
 * Handles markdown code fences and unbalanced JSON.
 */
function parseGeminiJson(raw: string): Record<string, string> {
  const text = raw.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    if (start === -1) throw new Error(`No JSON object found: ${text.slice(0, 150)}`);
    let depth = 0;
    let inStr = false;
    let esc = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\' && inStr) { esc = true; continue; }
      if (ch === '"') { inStr = !inStr; continue; }
      if (inStr) continue;
      if (ch === '{') depth++;
      else if (ch === '}' && --depth === 0) return JSON.parse(text.slice(start, i + 1));
    }
    throw new Error(`Unbalanced JSON: ${text.slice(0, 150)}`);
  }
}

function buildBioPrompt(content: string, sourceLocale: Locale): string {
  const targetLocales = LOCALES.filter((l) => l !== sourceLocale);

  const translateTargets = targetLocales
    .map((l) => `- bio_${l}: ${LANG_LABELS[l]}. ${BIO_STYLE[l]}`)
    .join('\n');

  const shortTargets = LOCALES.map((l) => {
    switch (l) {
      case 'zh': return `- bio_short_zh: 繁體中文摘要，60-70 字元。專業但溫暖的爵士樂評風格。`;
      case 'en': return `- bio_short_en: English summary, ~30-40 words. Professional tone.`;
      case 'ja': return `- bio_short_ja: 日本語の要約、約80-100文字。敬意を込めた文体。`;
      case 'ko': return `- bio_short_ko: 한국어 요약, ~70-90자. 정중하고 전문적인 재즈 문체.`;
      case 'th': return `- bio_short_th: สรุปภาษาไทย ~80-110 ตัวอักษร สไตล์นักวิจารณ์แจ๊สมืออาชีพ`;
      case 'id': return `- bio_short_id: Ringkasan Bahasa Indonesia, ~30-40 kata. Gaya editor jazz profesional.`;
    }
  }).join('\n');

  return `You are a professional jazz music translator and editor.

Source bio (${LANG_LABELS[sourceLocale]}):
${content}

== Task 1: Translate to the following languages ==
${translateTargets}

== Task 2: Generate short summaries for ALL 6 languages (including source) ==
If the source bio is already short (roughly within the target length), use the translated full bio as-is for the short version — do NOT pad or expand it.
${shortTargets}

Rules:
- Do NOT fabricate facts (awards, albums, collaborations must come from the source)
- Preserve artist/venue names in their original form
- Music terminology: use natural expressions in each target language
- Match the length and detail level of the source bio
- Each short summary must stand alone — don't reference other languages

Output as a single JSON object with field names as keys.`;
}

function buildAutoDetectBioPrompt(content: string): string {
  const allTargets = LOCALES
    .map((l) => `- bio_${l}: ${LANG_LABELS[l]}. ${BIO_STYLE[l]}`)
    .join('\n');

  const shortTargets = LOCALES.map((l) => {
    switch (l) {
      case 'zh': return `- bio_short_zh: 繁體中文摘要，60-70 字元。專業但溫暖的爵士樂評風格。`;
      case 'en': return `- bio_short_en: English summary, ~30-40 words. Professional tone.`;
      case 'ja': return `- bio_short_ja: 日本語の要約、約80-100文字。敬意を込めた文体。`;
      case 'ko': return `- bio_short_ko: 한국어 요약, ~70-90자. 정중하고 전문적인 재즈 문체.`;
      case 'th': return `- bio_short_th: สรุปภาษาไทย ~80-110 ตัวอักษร สไตล์นักวิจารณ์แจ๊สมืออาชีพ`;
      case 'id': return `- bio_short_id: Ringkasan Bahasa Indonesia, ~30-40 kata. Gaya editor jazz profesional.`;
    }
  }).join('\n');

  return `You are a professional jazz music translator and editor.

The following bio is written in an unknown language. First detect its language, then translate/adapt it to ALL 6 target languages.

Source bio:
${content}

== Task 1: Translate/adapt to ALL 6 languages ==
For the detected source language, keep the original content as-is. For others, translate.
${allTargets}

== Task 2: Generate short summaries for ALL 6 languages ==
If the source bio is already short (roughly within the target length), use the translated full bio as-is for the short version — do NOT pad or expand it.
${shortTargets}

Rules:
- Do NOT fabricate facts (awards, albums, collaborations must come from the source)
- Preserve artist/venue names in their original form
- Music terminology: use natural expressions in each target language
- Match the length and detail level of the source bio
- Each short summary must stand alone — don't reference other languages

Output as a single JSON object with field names as keys.`;
}

function buildDescriptionPrompt(content: string, sourceLocale: Locale, entityType: 'event' | 'venue'): string {
  const targetLocales = LOCALES.filter((l) => l !== sourceLocale);
  const style = entityType === 'event' ? DESC_STYLE : BIO_STYLE;

  const translateTargets = targetLocales
    .map((l) => `- description_${l}: ${LANG_LABELS[l]}. ${style[l]}`)
    .join('\n');

  let shortSection = '';
  if (entityType === 'event' || entityType === 'venue') {
    const shortTargets = LOCALES.map((l) => {
      switch (l) {
        case 'zh': return `- description_short_zh: 繁體中文摘要，150-200 字元。`;
        case 'en': return `- description_short_en: English summary, ~60-80 words.`;
        case 'ja': return `- description_short_ja: 日本語の要約。`;
        case 'ko': return `- description_short_ko: 한국어 요약, ~80-120자.`;
        case 'th': return `- description_short_th: สรุปภาษาไทย ~100-150 ตัวอักษร`;
        case 'id': return `- description_short_id: Ringkasan Bahasa Indonesia, ~60-80 kata.`;
      }
    }).join('\n');
    shortSection = `\n== Task 2: Generate short summaries for ALL 6 languages (including source) ==
If the source description is already short (roughly within the target length), use the translated full description as-is for the short version — do NOT pad or expand it.
${shortTargets}`;
  }

  const label = entityType === 'event' ? 'event description' : 'venue description';

  return `You are a professional jazz music translator and editor.

Source ${label} (${LANG_LABELS[sourceLocale]}):
${content}

== Task 1: Translate to the following languages ==
${translateTargets}
${shortSection}

Rules:
- Do NOT fabricate facts
- Preserve artist/venue names in their original form
- Music terminology: use natural expressions in each target language
- Match the length and detail level of the source

Output as a single JSON object with field names as keys.`;
}

/**
 * Translate content to all 6 languages and optionally generate short summaries.
 * Returns a map of field names to content values.
 */
export async function translateAndGenerate(opts: TranslateOptions): Promise<Record<string, string>> {
  if (!GEMINI_API_KEY) throw new Error('GEMINI_API_KEY not configured');

  let prompt: string;
  if (opts.autoDetectLanguage && opts.fieldPrefix === 'bio') {
    prompt = buildAutoDetectBioPrompt(opts.content);
  } else if (opts.fieldPrefix === 'bio') {
    prompt = buildBioPrompt(opts.content, opts.sourceLocale);
  } else {
    prompt = buildDescriptionPrompt(opts.content, opts.sourceLocale, opts.entityType as 'event' | 'venue');
  }

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.4,
      maxOutputTokens: 8192,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(60000),
  });

  if (!res.ok) {
    const errText = (await res.text()).slice(0, 300);
    throw new Error(`Gemini API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || '').trim();
  if (!raw) throw new Error('Gemini returned empty response');

  return parseGeminiJson(raw);
}
