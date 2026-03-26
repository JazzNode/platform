import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';
import { NextRequest, NextResponse } from 'next/server';
import { createClient as createAdminSupabase } from '@supabase/supabase-js';

const intlMiddleware = createMiddleware(routing);

const PRIMARY_HOST = 'jazznode.com';
const KNOWN_HOSTS = new Set([PRIMARY_HOST, 'localhost', '127.0.0.1']);

/** Cache custom_domain → venue_id for 60s to avoid DB lookups on every request */
const domainCache = new Map<string, { venueId: string | null; expiresAt: number }>();
const CACHE_TTL = 60_000; // 60 seconds

async function resolveCustomDomain(host: string): Promise<string | null> {
  const cached = domainCache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.venueId;

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) return null;

    const supabase = createAdminSupabase(supabaseUrl, serviceKey);
    const { data } = await supabase
      .from('venues')
      .select('venue_id')
      .eq('custom_domain', host)
      .eq('custom_domain_verified', true)
      .single();

    const venueId = data?.venue_id || null;
    domainCache.set(host, { venueId, expiresAt: Date.now() + CACHE_TTL });
    return venueId;
  } catch {
    domainCache.set(host, { venueId: null, expiresAt: Date.now() + CACHE_TTL });
    return null;
  }
}

export default async function middleware(request: NextRequest) {
  const host = (request.headers.get('host') ?? '').replace(/:\d+$/, ''); // strip port

  // Redirect www → non-www (301) to consolidate SEO signals
  if (host.startsWith('www.')) {
    const url = request.nextUrl.clone();
    url.host = host.replace(/^www\./, '');
    return Response.redirect(url, 301);
  }

  // ── Custom domain routing ──
  // If the host is not our primary domain or localhost, check if it's a venue custom domain
  const isKnownHost = KNOWN_HOSTS.has(host) || host.endsWith(`.${PRIMARY_HOST}`) || host.endsWith('.vercel.app');
  if (!isKnownHost) {
    const venueId = await resolveCustomDomain(host);
    if (venueId) {
      // Rewrite to the venue page while preserving the custom domain in the URL bar
      const url = request.nextUrl.clone();
      const pathname = url.pathname;

      // If visiting root or locale root, rewrite to venue page
      if (pathname === '/' || /^\/[a-z]{2}$/.test(pathname) || /^\/[a-z]{2}\/$/.test(pathname)) {
        const locale = pathname.match(/^\/([a-z]{2})/)?.[1] || 'en';
        url.pathname = `/${locale}/venues/${venueId}`;
        return NextResponse.rewrite(url);
      }

      // For other paths on custom domain, let them pass through (e.g. /api, /_next)
    }
  }

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
    '/((?!api|auth|_next|_vercel|sw\\.js|sitemap\\.xml|robots\\.txt|favicon\\.ico|manifest\\.json|opengraph-image|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|json|xml|txt|webmanifest|js)$).*)',
    '/(en|zh|ja|ko|th|id)/:path*',
  ],
};
