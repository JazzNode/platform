import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Check if Supabase env vars are set (to prevent crash on Vercel if missing)
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return intlMiddleware(request);
  }

  // 1. Try to update Supabase session (refreshes auth cookie if needed).
  // Run this outside the try/catch so refreshed cookies are preserved even
  // if the intl middleware throws.
  let supabaseCookies: string[] = [];
  try {
    const supabaseResponse = await updateSession(request);
    supabaseCookies = supabaseResponse.headers.getSetCookie() ?? [];
  } catch (error) {
    console.error('Supabase middleware error:', error);
    // Continue — don't lose the entire request if session refresh fails
  }

  try {
    // 2. Set geo cookie from Vercel IP detection (only if not already set)
    const geo = request.headers.get('x-vercel-ip-country');

    // 3. Run next-intl middleware
    const intlResponse = intlMiddleware(request);

    // 4. Set jn-geo cookie if detected and not already present
    if (geo && !request.cookies.has('jn-geo')) {
      intlResponse.cookies.set('jn-geo', geo, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      });
    }

    // 5. Merge Supabase cookies into the final response
    if (supabaseCookies.length > 0) {
      supabaseCookies.forEach((cookie) => {
        intlResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return intlResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    // Fallback to just next-intl if it fails
    const fallback = intlMiddleware(request);
    // Still merge Supabase cookies so session refresh isn't lost
    if (supabaseCookies.length > 0) {
      supabaseCookies.forEach((cookie) => {
        fallback.headers.append('Set-Cookie', cookie);
      });
    }
    return fallback;
  }
}

export const config = {
  // Match all paths EXCEPT: api routes, Next.js internals, Vercel internals,
  // and static/metadata files (sitemap.xml, robots.txt, favicon, OG images, etc.)
  matcher: [
    '/((?!api|auth|_next|_vercel|sw\\.js|sitemap\\.xml|robots\\.txt|favicon\\.ico|manifest\\.json|opengraph-image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
    '/(en|zh|ja|ko|th|id)/:path*',
  ],
};
