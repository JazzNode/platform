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

  try {
    // 1. Update Supabase session (refreshes auth cookie if needed)
    const supabaseResponse = await updateSession(request);

    // 2. Run next-intl middleware
    const intlResponse = intlMiddleware(request);

    // 3. Merge Supabase cookies into the final response
    const supabaseCookies = supabaseResponse.headers.getSetCookie();
    if (supabaseCookies && supabaseCookies.length > 0) {
      supabaseCookies.forEach((cookie) => {
        intlResponse.headers.append('Set-Cookie', cookie);
      });
    }

    return intlResponse;
  } catch (error) {
    console.error('Middleware error:', error);
    // Fallback to just next-intl if Supabase fails
    return intlMiddleware(request);
  }
}

export const config = {
  // Match all paths EXCEPT: api routes, Next.js internals, Vercel internals,
  // and static/metadata files (sitemap.xml, robots.txt, favicon, OG images, etc.)
  matcher: [
    '/((?!api|_next|_vercel|sitemap\\.xml|robots\\.txt|favicon\\.ico|opengraph-image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
    '/(en|zh|ja|ko|th|id)/:path*',
  ],
};
