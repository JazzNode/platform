import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { createAdminClient } from '@/utils/supabase/admin';

/**
 * Cron endpoint: syncs Google Search Console search analytics data daily.
 *
 * Pulls yesterday's data (GSC data has ~2 day lag, but we pull T-3 to be safe)
 * with dimensions: date, country, device, page, query.
 *
 * Triggered daily at 06:00 UTC via Vercel Cron.
 * Protected by CRON_SECRET header.
 *
 * Query params:
 *   ?date=YYYY-MM-DD  — manually sync a specific date
 *   ?backfill=7       — backfill last N days
 */

const GSC_PROPERTY = 'sc-domain:jazznode.com';

// GSC API returns max 25,000 rows per request
const ROW_LIMIT = 25000;

function getGscAuth() {
  const raw = process.env.GSC_SERVICE_ACCOUNT_KEY;
  if (!raw) throw new Error('GSC_SERVICE_ACCOUNT_KEY not configured');

  // Support both raw JSON and Base64-encoded JSON
  let key: Record<string, unknown>;
  try {
    key = JSON.parse(raw);
  } catch {
    // Try Base64 decode
    key = JSON.parse(Buffer.from(raw, 'base64').toString('utf8'));
  }

  return new google.auth.GoogleAuth({
    credentials: key,
    scopes: ['https://www.googleapis.com/auth/webmasters.readonly'],
  });
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function getDefaultDate(): string {
  // GSC data has ~2-3 day lag, so we pull T-3
  const d = new Date();
  d.setDate(d.getDate() - 3);
  return formatDate(d);
}

async function fetchGscData(auth: InstanceType<typeof google.auth.GoogleAuth>, date: string) {
  const searchconsole = google.searchconsole({ version: 'v1', auth });

  const allRows: Array<{
    date: string;
    country: string;
    device: string;
    page: string;
    query: string;
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  }> = [];

  let startRow = 0;

  // Paginate through all results
  while (true) {
    const response = await searchconsole.searchanalytics.query({
      siteUrl: GSC_PROPERTY,
      requestBody: {
        startDate: date,
        endDate: date,
        dimensions: ['date', 'country', 'device', 'page', 'query'],
        rowLimit: ROW_LIMIT,
        startRow,
        // dataState: 'final', // only final data
      },
    });

    const rows = response.data.rows;
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      const keys = row.keys || [];
      allRows.push({
        date: keys[0] || date,
        country: keys[1] || '',
        device: keys[2] || '',
        page: keys[3] || '',
        query: keys[4] || '',
        clicks: row.clicks || 0,
        impressions: row.impressions || 0,
        ctr: row.ctr || 0,
        position: row.position || 0,
      });
    }

    // If we got fewer rows than the limit, we've reached the end
    if (rows.length < ROW_LIMIT) break;
    startRow += ROW_LIMIT;
  }

  return allRows;
}

async function upsertToSupabase(
  supabase: ReturnType<typeof createAdminClient>,
  rows: Awaited<ReturnType<typeof fetchGscData>>
) {
  if (rows.length === 0) return 0;

  // Supabase upsert in chunks of 500
  const CHUNK_SIZE = 500;
  let totalUpserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    const { error } = await supabase
      .from('gsc_search_analytics')
      .upsert(chunk, {
        onConflict: 'date,country,device,page,query',
        ignoreDuplicates: false, // update if exists
      });

    if (error) throw new Error(`Upsert failed at chunk ${i}: ${error.message}`);
    totalUpserted += chunk.length;
  }

  return totalUpserted;
}

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const supabase = createAdminClient();

  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const auth = getGscAuth();

    // Determine which date(s) to sync
    const paramDate = request.nextUrl.searchParams.get('date');
    const backfill = request.nextUrl.searchParams.get('backfill');

    let datesToSync: string[] = [];

    if (backfill) {
      const days = Math.min(parseInt(backfill, 10) || 7, 30); // max 30 days
      for (let i = 3; i < 3 + days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        datesToSync.push(formatDate(d));
      }
    } else {
      datesToSync = [paramDate || getDefaultDate()];
    }

    const results = [];

    for (const date of datesToSync) {
      const dateStart = Date.now();
      try {
        const rows = await fetchGscData(auth, date);
        const upserted = await upsertToSupabase(supabase, rows);
        const durationMs = Date.now() - dateStart;

        // Log success
        await supabase.from('gsc_sync_logs').insert({
          synced_date: date,
          rows_upserted: upserted,
          duration_ms: durationMs,
        });

        results.push({ date, rows: upserted, durationMs });
      } catch (err) {
        const durationMs = Date.now() - dateStart;
        const errorMsg = err instanceof Error ? err.message : String(err);

        // Log error
        await supabase.from('gsc_sync_logs').insert({
          synced_date: date,
          rows_upserted: 0,
          duration_ms: durationMs,
          error: errorMsg,
        });

        results.push({ date, error: errorMsg, durationMs });
      }
    }

    return NextResponse.json({
      ok: true,
      totalDurationMs: Date.now() - startTime,
      results,
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, error: errorMsg },
      { status: 500 }
    );
  }
}
