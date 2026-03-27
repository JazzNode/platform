import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/admin';
import { createClient } from '@/utils/supabase/server';

/**
 * Log an EPK download and optionally create inbox message / notification.
 *
 * Logged-in user → epk_downloads row + artist_fan conversation + message
 * Guest with contact → epk_downloads row + notification to artist owner
 * Guest without contact → epk_downloads row only
 */
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { artistId, guestName, guestEmail, guestRole } = body as {
    artistId: string;
    guestName?: string;
    guestEmail?: string;
    guestRole?: string;
  };

  if (!artistId) return NextResponse.json({ error: 'Missing artistId' }, { status: 400 });

  const admin = createAdminClient();

  // Check if user is logged in
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Not logged in — that's fine
  }

  // 1. Always log the download
  await admin.from('epk_downloads').insert({
    artist_id: artistId,
    user_id: userId,
    guest_name: guestName || null,
    guest_email: guestEmail || null,
    guest_role: guestRole || null,
  });

  // 2. For logged-in users → create artist_fan conversation + message
  if (userId) {
    // Find or create conversation
    const { data: existing } = await admin
      .from('conversations')
      .select('id')
      .eq('type', 'artist_fan')
      .eq('artist_id', artistId)
      .eq('fan_user_id', userId)
      .maybeSingle();

    let convoId = existing?.id;

    if (!convoId) {
      const { data: newConvo } = await admin
        .from('conversations')
        .insert({
          type: 'artist_fan',
          artist_id: artistId,
          fan_user_id: userId,
        })
        .select('id')
        .single();
      convoId = newConvo?.id;
    }

    if (convoId) {
      await admin.from('messages').insert({
        conversation_id: convoId,
        sender_id: userId,
        body: '📥 Downloaded your EPK',
        intent_type: 'epk_download',
      });

      // Update last_message_at
      await admin
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', convoId);
    }
  }

  // 3. For guests with contact info → create notification for artist owner
  if (!userId && (guestName || guestEmail)) {
    // Find the user who claimed this artist
    const { data: owners } = await admin
      .from('profiles')
      .select('id')
      .contains('claimed_artist_ids', [artistId]);

    if (owners && owners.length > 0) {
      // Get artist name for notification
      const { data: artist } = await admin
        .from('artists')
        .select('display_name, name_local, name_en')
        .eq('artist_id', artistId)
        .single();

      const artistName = artist?.display_name || artist?.name_local || artist?.name_en || artistId;
      const roleLabelMap: Record<string, string> = {
        venue: '🏠 場地',
        media: '📰 媒體',
        promoter: '🎪 主辦',
        musician: '🎵 音樂人',
        other: '👤 其他',
      };
      const roleLabel = guestRole ? roleLabelMap[guestRole] || guestRole : '';
      const contactParts = [
        guestName,
        guestEmail ? `(${guestEmail})` : '',
        roleLabel,
      ].filter(Boolean).join(' ');

      for (const owner of owners) {
        await admin.from('notifications').insert({
          user_id: owner.id,
          type: 'epk_download',
          title: `📥 有人下載了 ${artistName} 的 EPK`,
          body: contactParts,
          reference_type: 'artist',
          reference_id: artistId,
          status: 'sent',
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
