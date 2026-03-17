import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Based on Supabase official Next.js middleware pattern.
// Key point: do NOT mutate request.cookies; only set cookies on the response.
export async function updateSession(request: NextRequest) {
  const response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Use getSession() instead of getUser() to avoid a network round-trip on
  // every request. getUser() always hits the Supabase auth endpoint which can
  // cause 504 MIDDLEWARE_INVOCATION_TIMEOUT on Vercel Edge when Supabase is slow.
  // getSession() reads from the cookie and only makes a network call when the
  // access token is expired and needs to be refreshed via the refresh token.
  // Security: individual API routes call getUser() (via verifyAdminToken) for
  // operations that require server-side token validation.
  await supabase.auth.getSession();

  return response;
}
