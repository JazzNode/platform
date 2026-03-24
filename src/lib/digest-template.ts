import { DigestData } from './digest';

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://jazznode.com';

function formatDate(isoDate: string): string {
  const d = new Date(isoDate);
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function viewsChangeText(change: number | null): string {
  if (change === null) return '<span style="color:#888;">No prior data</span>';
  if (change > 0)
    return `<span style="color:#22c55e;">&#9650; ${change}%</span>`;
  if (change < 0)
    return `<span style="color:#ef4444;">&#9660; ${Math.abs(change)}%</span>`;
  return '<span style="color:#888;">No change</span>';
}

export function buildDigestEmailHtml(digest: DigestData): string {
  const dashboardPath =
    digest.entityType === 'venue'
      ? `/venues/${digest.slug}/analytics`
      : `/artists/${digest.slug}/analytics`;
  const dashboardUrl = `${BASE_URL}${dashboardPath}`;
  const profilePath =
    digest.entityType === 'venue'
      ? `/venues/${digest.slug}`
      : `/artists/${digest.slug}`;
  const profileUrl = `${BASE_URL}${profilePath}`;

  const eventsHtml =
    digest.upcomingEvents.length > 0
      ? digest.upcomingEvents
          .map(
            (e) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            <strong style="color:#1a1a1a;">${escapeHtml(e.title)}</strong><br/>
            <span style="color:#666;font-size:13px;">${formatDate(e.date)}${e.artistCount > 0 ? ` &middot; ${e.artistCount} artist${e.artistCount > 1 ? 's' : ''}` : ''}</span>
          </td>
        </tr>`
          )
          .join('')
      : `<tr><td style="padding:12px 0;color:#888;font-style:italic;">No upcoming events this week</td></tr>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>JazzNode Weekly Digest</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background-color:#18181b;padding:28px 32px;border-radius:12px 12px 0 0;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.3px;">JazzNode</h1>
              <p style="margin:6px 0 0;color:#a1a1aa;font-size:13px;">Weekly Digest</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background-color:#ffffff;padding:28px 32px;">

              <!-- Greeting -->
              <p style="margin:0 0 20px;color:#333;font-size:15px;line-height:1.5;">
                Here's how <a href="${profileUrl}" style="color:#2563eb;text-decoration:none;font-weight:600;">${escapeHtml(digest.displayName)}</a> performed this past week.
              </p>

              <!-- Stats -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                <tr>
                  <td width="50%" style="padding:16px;background-color:#fafafa;border-radius:8px;">
                    <p style="margin:0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Page Views</p>
                    <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#18181b;">${digest.totalViews.toLocaleString()}</p>
                    <p style="margin:4px 0 0;font-size:13px;">${viewsChangeText(digest.viewsChange)} vs last week</p>
                  </td>
                  <td width="8"></td>
                  <td width="50%" style="padding:16px;background-color:#fafafa;border-radius:8px;">
                    <p style="margin:0;color:#888;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">New Followers</p>
                    <p style="margin:4px 0 0;font-size:28px;font-weight:700;color:#18181b;">${digest.newFollowers}</p>
                    <p style="margin:4px 0 0;font-size:13px;color:#888;">this week</p>
                  </td>
                </tr>
              </table>

              <!-- Upcoming Events -->
              <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#18181b;">Upcoming Events</h2>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                ${eventsHtml}
              </table>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center" style="padding:8px 0 0;">
                    <a href="${dashboardUrl}" style="display:inline-block;padding:12px 28px;background-color:#18181b;color:#ffffff;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600;">
                      View Dashboard
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fafafa;padding:20px 32px;border-radius:0 0 12px 12px;border-top:1px solid #eee;">
              <p style="margin:0;color:#888;font-size:12px;line-height:1.5;text-align:center;">
                You're receiving this because you manage <strong>${escapeHtml(digest.displayName)}</strong> on JazzNode.<br/>
                This is a Premium feature for tier 2+ accounts.<br/>
                To stop receiving these emails, update your notification preferences in your dashboard.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
