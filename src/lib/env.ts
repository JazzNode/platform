import { z } from 'zod/v4';

/**
 * Environment variable validation — runs once on first import.
 *
 * Required keys: missing → throws immediately (fail-fast).
 * Optional keys: missing → logged as warning, feature gracefully disabled.
 */

const requiredSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  ADMIN_JWT_SECRET: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_PUBLIC_URL: z.url(),
});

const optionalSchema = z.object({
  GEMINI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  NOTION_API_KEY: z.string().optional(),
  REVALIDATE_SECRET: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: z.string().optional(),
  NEXT_PUBLIC_SITE_URL: z.string().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

function validateEnv() {
  // --- Required ---
  const required = requiredSchema.safeParse(process.env);
  if (!required.success) {
    const missing = required.error.issues.map(
      (i) => `  - ${i.path.join('.')}: ${i.message}`,
    );
    throw new Error(
      `Missing required environment variables:\n${missing.join('\n')}\n\nCheck .env.local or run \`vercel env pull\`.`,
    );
  }

  // --- Optional (warn only) ---
  const optional = optionalSchema.safeParse(process.env);
  if (!optional.success) {
    const warnings = optional.error.issues
      .filter((i) => i.code === 'invalid_type' && i.message.includes('Required'))
      .map((i) => i.path.join('.'));

    if (warnings.length > 0) {
      console.warn(
        `[env] Optional keys not set (features may be disabled): ${warnings.join(', ')}`,
      );
    }
  }

  return required.data;
}

export const env = validateEnv();
