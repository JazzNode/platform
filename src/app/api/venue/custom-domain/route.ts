import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createAdminClient } from '@/utils/supabase/admin';

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_PROJECT_ID = process.env.VERCEL_PROJECT_ID || 'prj_4F7UqIX6SLzxiZsgRdRzRJnbgh1X';
const VERCEL_TEAM_ID = process.env.VERCEL_TEAM_ID || 'team_OKcgczPLaEaVw6Z9mhxq2oA6';
const PRIMARY_DOMAIN = 'jazznode.com';

/**
 * GET /api/venue/custom-domain?venueId=xxx
 * Returns domain config and verification status.
 */
export async function GET(request: NextRequest) {
  const venueId = request.nextUrl.searchParams.get('venueId');
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const adminClient = createAdminClient();
  const { data: venue } = await adminClient
    .from('venues')
    .select('custom_domain, custom_domain_verified, tier')
    .eq('venue_id', venueId)
    .single();

  if (!venue) return NextResponse.json({ error: 'Venue not found' }, { status: 404 });

  // If domain is set, check Vercel domain config status
  let vercelStatus = null;
  if (venue.custom_domain && VERCEL_TOKEN) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${venue.custom_domain}?teamId=${VERCEL_TEAM_ID}`,
        { headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } },
      );
      if (res.ok) {
        const data = await res.json();
        vercelStatus = {
          verified: data.verified ?? false,
          misconfigured: data.misconfigured ?? false,
          verification: data.verification || null,
        };

        // Sync verified status to DB if changed
        const isVerified = data.verified && !data.misconfigured;
        if (isVerified !== venue.custom_domain_verified) {
          await adminClient
            .from('venues')
            .update({ custom_domain_verified: isVerified })
            .eq('venue_id', venueId);
        }
      }
    } catch {}
  }

  return NextResponse.json({
    domain: venue.custom_domain,
    verified: venue.custom_domain_verified,
    tier: venue.tier,
    vercelStatus,
  });
}

/**
 * POST /api/venue/custom-domain
 * Sets or updates a custom domain for a venue.
 * Body: { venueId, domain }
 *
 * Flow:
 * 1. Validate domain format
 * 2. Save to DB
 * 3. Add domain to Vercel project via API
 * 4. Return DNS configuration instructions
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId, domain } = await request.json();
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  // Verify ownership
  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Check tier (Elite = tier 3)
  const adminClient = createAdminClient();
  const { data: venue } = await adminClient
    .from('venues')
    .select('tier, custom_domain')
    .eq('venue_id', venueId)
    .single();

  if (!isAdmin && (!venue || (venue.tier ?? 0) < 3)) {
    return NextResponse.json({ error: 'Elite tier required' }, { status: 403 });
  }

  // Validate domain format
  const cleanDomain = (domain || '').trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');

  if (!cleanDomain) {
    return NextResponse.json({ error: 'Invalid domain' }, { status: 400 });
  }

  // Basic domain format validation
  const domainRegex = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
  if (!domainRegex.test(cleanDomain)) {
    return NextResponse.json({ error: 'Invalid domain format' }, { status: 400 });
  }

  // Prevent using our own domain
  if (cleanDomain === PRIMARY_DOMAIN || cleanDomain.endsWith(`.${PRIMARY_DOMAIN}`)) {
    return NextResponse.json({ error: 'Cannot use JazzNode domain' }, { status: 400 });
  }

  // Check if domain is already taken by another venue
  const { data: existing } = await adminClient
    .from('venues')
    .select('venue_id')
    .eq('custom_domain', cleanDomain)
    .neq('venue_id', venueId)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Domain already in use' }, { status: 409 });
  }

  // Remove old domain from Vercel if changing
  if (venue?.custom_domain && venue.custom_domain !== cleanDomain && VERCEL_TOKEN) {
    try {
      await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${venue.custom_domain}?teamId=${VERCEL_TEAM_ID}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } },
      );
    } catch {}
  }

  // Save to DB
  const { error: updateError } = await adminClient
    .from('venues')
    .update({
      custom_domain: cleanDomain,
      custom_domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('venue_id', venueId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to save domain' }, { status: 500 });
  }

  // Add domain to Vercel project
  let vercelResult = null;
  if (VERCEL_TOKEN) {
    try {
      const res = await fetch(
        `https://api.vercel.com/v10/projects/${VERCEL_PROJECT_ID}/domains?teamId=${VERCEL_TEAM_ID}`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${VERCEL_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name: cleanDomain }),
        },
      );
      vercelResult = await res.json();
    } catch (err) {
      console.error('Vercel Domains API error:', err);
    }
  }

  return NextResponse.json({
    domain: cleanDomain,
    verified: false,
    vercelResult,
    dnsInstructions: {
      type: 'CNAME',
      name: cleanDomain.split('.')[0] === cleanDomain ? '@' : cleanDomain.split('.').slice(0, -2).join('.') || '@',
      value: 'cname.vercel-dns.com',
      note: 'If using an apex domain (e.g. example.com), set an A record pointing to 76.76.21.21',
    },
  });
}

/**
 * DELETE /api/venue/custom-domain
 * Removes a custom domain from a venue.
 * Body: { venueId }
 */
export async function DELETE(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { venueId } = await request.json();
  if (!venueId) return NextResponse.json({ error: 'Missing venueId' }, { status: 400 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('claimed_venue_ids, role')
    .eq('id', user.id)
    .single();

  const isOwner = profile?.claimed_venue_ids?.includes(venueId);
  const isAdmin = profile?.role === 'admin' || profile?.role === 'owner';
  if (!isOwner && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const adminClient = createAdminClient();

  // Get current domain to remove from Vercel
  const { data: venue } = await adminClient
    .from('venues')
    .select('custom_domain')
    .eq('venue_id', venueId)
    .single();

  if (venue?.custom_domain && VERCEL_TOKEN) {
    try {
      await fetch(
        `https://api.vercel.com/v9/projects/${VERCEL_PROJECT_ID}/domains/${venue.custom_domain}?teamId=${VERCEL_TEAM_ID}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${VERCEL_TOKEN}` } },
      );
    } catch {}
  }

  await adminClient
    .from('venues')
    .update({
      custom_domain: null,
      custom_domain_verified: false,
      updated_at: new Date().toISOString(),
    })
    .eq('venue_id', venueId);

  return NextResponse.json({ success: true });
}
