import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { updateSession } from '@/utils/supabase/middleware';
import { NextRequest } from 'next/server';

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // 1. Update Supabase session (refreshes auth cookie if needed)
  const supabaseResponse = await updateSession(request);

  // 2. Run next-intl middleware
  const intlResponse = intlMiddleware(request);

  // 3. Merge Supabase cookies into the final response
  // We need to make sure auth cookies are preserved when next-intl rewrites the response
  const supabaseCookies = supabaseResponse.headers.getSetCookie();
  supabaseCookies.forEach((cookie) => {
    intlResponse.headers.append('Set-Cookie', cookie);
  });

  return intlResponse;
}

export const config = {
  matcher: ['/', '/(en|zh|ja)/:path*'],
};
