import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(process.env.ADMIN_JWT_SECRET!);

/**
 * Verify an admin Bearer token from request headers.
 * Returns true if valid admin, false otherwise.
 *
 * MIGRATION NOTE: When switching to Supabase, replace with:
 *   const { data: { user } } = await supabase.auth.getUser(token);
 *   return user?.app_metadata?.role === 'admin';
 */
export async function verifyAdminToken(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith('Bearer ')) return false;
  const token = authHeader.slice(7);

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload.role === 'admin';
  } catch {
    return false;
  }
}
