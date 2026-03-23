'use client';

import { useState, useEffect, useCallback, useRef, startTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import SourceBadge from '@/components/inbox/SourceBadge';
import BroadcastBubble from '@/components/inbox/BroadcastBubble';
import FilterChips, { type FilterType } from '@/components/inbox/FilterChips';
import PushNotificationToggle from '@/components/PushNotificationToggle';

type Tab = 'messages' | 'notifications';

interface UnifiedConversation {
  id: string;
  type: 'artist_fan' | 'member_hq' | 'member_member' | 'venue_fan';
  artist_id?: string;
  venue_id?: string;
  peer_name: string;
  peer_avatar: string | null;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  source_badge: 'hq' | 'artist' | 'venue' | null;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string | null;
  broadcast_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
  sender_display?: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
}

function TranslateButton({ text, locale }: { text: string; locale: string }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleTranslate = async () => {
    if (translated) { setShow(!show); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/translate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale: locale }),
      });
      const data = await res.json();
      if (data.translated) { setTranslated(data.translated); setShow(true); }
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <button onClick={handleTranslate} disabled={loading}
        className="text-[var(--muted-foreground)]/50 hover:text-emerald-400 transition-colors disabled:opacity-30" title="Translate">
        {loading ? (
          <div className="w-3.5 h-3.5 border border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        )}
      </button>
      {show && translated && <p className="text-xs text-[var(--muted-foreground)]/60 mt-1 italic">{translated}</p>}
    </div>
  );
}

export default function FanInboxPage() {
  const t = useTranslations('artistStudio');
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  const [tab, setTab] = useState<Tab>('messages');
  const [filter, setFilter] = useState<FilterType>('all');
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedConvo, setSelectedConvoRaw] = useState<string | null>(() => searchParams.get('convo'));
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [fetching, setFetching] = useState(true);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // "+" menu state
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showDmSearch, setShowDmSearch] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [dmSearchResults, setDmSearchResults] = useState<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null; _type?: 'profile' | 'artist' | 'venue' }[]>([]);

  // Delete conversation state
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Wrap setSelectedConvo to also reset delete confirmation
  const setSelectedConvo = useCallback((val: string | null | ((prev: string | null) => string | null)) => {
    setSelectedConvoRaw(val);
    setConfirmDelete(false);
  }, []);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  // Sync selectedConvo & filter from URL params (handles navigation from message buttons)
  const urlConvo = searchParams.get('convo');
  const urlTab = searchParams.get('tab');
  useEffect(() => {
    if (urlConvo && urlConvo !== selectedConvo) {
      startTransition(() => setSelectedConvo(urlConvo));
    }
    if (urlTab === 'dm') startTransition(() => setFilter('dm'));
    if (urlTab === 'messages') startTransition(() => setTab('messages'));
    if (urlTab === 'notifications') startTransition(() => setTab('notifications'));
  }, [urlConvo, urlTab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-set filter when selectedConvo is resolved in conversations list
  // so the selected conversation is always visible in the sidebar
  useEffect(() => {
    if (!selectedConvo || conversations.length === 0) return;
    const convo = conversations.find((c) => c.id === selectedConvo);
    if (!convo) return;
    const expectedFilter: FilterType =
      convo.type === 'artist_fan' ? 'artist' :
      convo.type === 'venue_fan' ? 'venue' :
      convo.type === 'member_hq' ? 'hq' :
      convo.type === 'member_member' ? 'dm' : 'all';
    if (filter !== 'all' && filter !== expectedFilter) startTransition(() => setFilter(expectedFilter));
  }, [selectedConvo, conversations]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch ALL conversations (unified)
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      // Fetch all conversations where user is a participant
      const { data: allConvos } = await supabase
        .from('conversations')
        .select('id, type, artist_id, venue_id, fan_user_id, user_b_id, last_message_at')
        .or(`fan_user_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (cancelled || !allConvos) { if (!cancelled) { setConversations([]); setFetching(false); } return; }

      // Collect IDs for enrichment
      const artistIds = new Set<string>();
      const venueIds = new Set<string>();
      const profileIds = new Set<string>();

      allConvos.forEach((c) => {
        if (c.type === 'artist_fan' && c.artist_id) artistIds.add(c.artist_id);
        if (c.type === 'venue_fan' && c.venue_id) venueIds.add(c.venue_id);
        if (c.type === 'member_member') {
          const peerId = c.fan_user_id === user.id ? c.user_b_id : c.fan_user_id;
          if (peerId) profileIds.add(peerId);
        }
      });

      // Batch fetch artists
      let artistMap = new Map<string, { name: string; photo: string | null }>();
      if (artistIds.size > 0) {
        const { data: artists } = await supabase
          .from('artists')
          .select('artist_id, display_name, name_local, name_en, photo_url')
          .in('artist_id', [...artistIds]);
        artistMap = new Map(
          artists?.map((a) => [a.artist_id, {
            name: a.display_name || a.name_local || a.name_en || a.artist_id,
            photo: a.photo_url,
          }]) || []
        );
      }

      // Batch fetch venues
      let venueMap = new Map<string, { name: string; photo: string | null }>();
      if (venueIds.size > 0) {
        const { data: venues } = await supabase
          .from('venues')
          .select('venue_id, display_name, name_local, name_en, photo_url')
          .in('venue_id', [...venueIds]);
        venueMap = new Map(
          venues?.map((v) => [v.venue_id, {
            name: v.display_name || v.name_local || v.name_en || v.venue_id,
            photo: v.photo_url,
          }]) || []
        );
      }

      // Batch fetch profiles (for DM peers)
      let profileMap = new Map<string, { name: string; avatar: string | null }>();
      if (profileIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', [...profileIds]);
        profileMap = new Map(
          profiles?.map((p) => [p.id, {
            name: p.display_name || p.username || 'Unknown',
            avatar: p.avatar_url,
          }]) || []
        );
      }

      // Enrich each conversation
      const enriched: UnifiedConversation[] = await Promise.all(
        allConvos.map(async (convo) => {
          // Unread count
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', convo.id)
            .neq('sender_id', user.id)
            .is('read_at', null);

          // Last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('body')
            .eq('conversation_id', convo.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          let peer_name = '';
          let peer_avatar: string | null = null;
          let source_badge: 'hq' | 'artist' | 'venue' | null = null;

          if (convo.type === 'artist_fan') {
            const artist = artistMap.get(convo.artist_id!);
            peer_name = artist?.name || convo.artist_id || 'Artist';
            peer_avatar = artist?.photo || null;
            source_badge = 'artist';
          } else if (convo.type === 'venue_fan') {
            const venue = venueMap.get(convo.venue_id!);
            peer_name = venue?.name || convo.venue_id || 'Venue';
            peer_avatar = venue?.photo || null;
            source_badge = 'venue';
          } else if (convo.type === 'member_hq') {
            peer_name = 'JazzNode HQ';
            peer_avatar = null;
            source_badge = 'hq';
          } else if (convo.type === 'member_member') {
            const peerId = convo.fan_user_id === user.id ? convo.user_b_id : convo.fan_user_id;
            const peer = profileMap.get(peerId!);
            peer_name = peer?.name || 'Unknown';
            peer_avatar = peer?.avatar || null;
            source_badge = null;
          }

          return {
            id: convo.id,
            type: convo.type,
            artist_id: convo.artist_id,
            venue_id: convo.venue_id,
            peer_name,
            peer_avatar,
            last_message: lastMsg?.body || null,
            last_message_at: convo.last_message_at,
            unread_count: count || 0,
            source_badge,
          };
        })
      );

      // If selectedConvo is set but not in the fetched list, fetch it directly
      if (!cancelled && selectedConvo && !enriched.find((c) => c.id === selectedConvo)) {
        const { data: missedConvo } = await supabase
          .from('conversations')
          .select('id, type, artist_id, venue_id, fan_user_id, user_b_id, last_message_at')
          .eq('id', selectedConvo)
          .maybeSingle();

        if (missedConvo) {
          let peer_name = '';
          let peer_avatar: string | null = null;
          let source_badge: 'hq' | 'artist' | 'venue' | null = null;

          if (missedConvo.type === 'artist_fan' && missedConvo.artist_id) {
            const { data: artist } = await supabase
              .from('artists')
              .select('display_name, name_local, name_en, photo_url')
              .eq('artist_id', missedConvo.artist_id)
              .maybeSingle();
            peer_name = artist?.display_name || artist?.name_local || artist?.name_en || missedConvo.artist_id;
            peer_avatar = artist?.photo_url || null;
            source_badge = 'artist';
          } else if (missedConvo.type === 'venue_fan' && missedConvo.venue_id) {
            const { data: venue } = await supabase
              .from('venues')
              .select('display_name, name_local, name_en, photo_url')
              .eq('venue_id', missedConvo.venue_id)
              .maybeSingle();
            peer_name = venue?.display_name || venue?.name_local || venue?.name_en || missedConvo.venue_id;
            peer_avatar = venue?.photo_url || null;
            source_badge = 'venue';
          } else if (missedConvo.type === 'member_hq') {
            peer_name = 'JazzNode HQ';
            source_badge = 'hq';
          } else if (missedConvo.type === 'member_member') {
            const peerId = missedConvo.fan_user_id === user.id ? missedConvo.user_b_id : missedConvo.fan_user_id;
            if (peerId) {
              const { data: peer } = await supabase
                .from('profiles')
                .select('display_name, username, avatar_url')
                .eq('id', peerId)
                .maybeSingle();
              peer_name = peer?.display_name || peer?.username || 'Unknown';
              peer_avatar = peer?.avatar_url || null;
            }
          }

          enriched.unshift({
            id: missedConvo.id,
            type: missedConvo.type,
            artist_id: missedConvo.artist_id,
            venue_id: missedConvo.venue_id,
            peer_name,
            peer_avatar,
            last_message: null,
            last_message_at: missedConvo.last_message_at || new Date().toISOString(),
            unread_count: 0,
            source_badge,
          });
        }
      }

      if (!cancelled) { setConversations(enriched); setFetching(false); }
    })();

    return () => { cancelled = true; };
  }, [user, selectedConvo]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConvo || !user) return;
    const supabase = createClient();

    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, sender_role, broadcast_id, body, read_at, created_at')
      .eq('conversation_id', selectedConvo)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        if (!data) return;
        // Enrich sender names for admin (HQ) messages
        const adminIds = [...new Set(data.filter((m) => m.sender_role === 'admin').map((m) => m.sender_id))];
        let adminMap = new Map<string, string>();
        if (adminIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, username')
            .in('id', adminIds);
          adminMap = new Map((profiles || []).map((p) => [p.id, p.display_name || p.username || 'Admin']));
        }
        setMessages(data.map((m) => ({ ...m, sender_display: adminMap.get(m.sender_id) })));
      });

    // Mark messages as read
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', selectedConvo)
      .neq('sender_id', user.id)
      .is('read_at', null)
      .then(() => {
        setConversations((prev) =>
          prev.map((c) => (c.id === selectedConvo ? { ...c, unread_count: 0 } : c))
        );
        // Notify header badge to refresh unread count
        window.dispatchEvent(new Event('inbox:read'));
      });
  }, [selectedConvo, user]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConvo || !user || sending) return;
    setSending(true);
    const supabase = createClient();
    const body = newMessage.trim();
    setNewMessage('');

    try {
      const { data: msg, error } = await supabase
        .from('messages')
        .insert({ conversation_id: selectedConvo, sender_id: user.id, body })
        .select('id, conversation_id, sender_id, sender_role, broadcast_id, body, read_at, created_at')
        .single();

      if (error) {
        console.error('Send message failed:', error);
        setNewMessage(body);
        alert(t('sendFailed') ?? 'Failed to send message');
      } else if (msg) {
        setMessages((prev) => [...prev, msg]);
        await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConvo);
      }
    } catch (err) {
      console.error('Send message error:', err);
      setNewMessage(body);
      alert(t('sendFailed') ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedConvo, user, sending]);


  // Delete entire conversation
  const handleDeleteConversation = useCallback(async () => {
    if (!selectedConvo || deleting) return;
    setDeleting(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', selectedConvo);

    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== selectedConvo));
      setSelectedConvo(null);
      setMessages([]);
    }
    setDeleting(false);
    setConfirmDelete(false);
  }, [selectedConvo, deleting]);

  // Contact HQ (find or create)
  const contactHQ = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    setShowNewMenu(false);

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('fan_user_id', user.id)
      .eq('type', 'member_hq')
      .maybeSingle();

    if (existing) {
      setSelectedConvo(existing.id);
      return;
    }

    const { data: newConvo } = await supabase
      .from('conversations')
      .insert({ type: 'member_hq', fan_user_id: user.id })
      .select('id')
      .single();

    if (newConvo) {
      setSelectedConvo(newConvo.id);
      // Add to conversation list
      setConversations((prev) => [{
        id: newConvo.id,
        type: 'member_hq',
        peer_name: 'JazzNode HQ',
        peer_avatar: null,
        last_message: null,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        source_badge: 'hq',
      }, ...prev]);
    }
  }, [user]);

  // Auto-open HQ conversation when navigated with ?contactHQ=1
  const shouldContactHQ = searchParams.get('contactHQ');
  useEffect(() => {
    if (!user || fetching || !shouldContactHQ) return;
    // Defer to next tick to avoid setState-in-effect lint warning
    const timer = setTimeout(() => {
      contactHQ();
      router.replace(`/${locale}/profile/inbox`, { scroll: false });
    }, 0);
    return () => clearTimeout(timer);
  }, [user, fetching, shouldContactHQ, contactHQ, router, locale]);

  // DM search users, artists, and venues
  useEffect(() => {
    if (!dmSearch.trim() || !user) return;
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const q = dmSearch.trim();

      // Search profiles (users)
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
        .neq('id', user.id)
        .limit(5);

      // Search claimed artists (tier >= 1)
      const { data: artists } = await supabase
        .from('artists')
        .select('artist_id, display_name, name_local, name_en, photo_url, tier')
        .or(`display_name.ilike.%${q}%,name_local.ilike.%${q}%,name_en.ilike.%${q}%`)
        .gte('tier', 1)
        .limit(5);

      // Search claimed venues (tier >= 1)
      const { data: venues } = await supabase
        .from('venues')
        .select('venue_id, display_name, name_local, name_en, photo_url, tier')
        .or(`display_name.ilike.%${q}%,name_local.ilike.%${q}%,name_en.ilike.%${q}%`)
        .gte('tier', 1)
        .limit(5);

      const results: typeof dmSearchResults = [
        ...(profiles || []).map((p) => ({
          id: p.id,
          display_name: p.display_name,
          username: p.username,
          avatar_url: p.avatar_url,
          _type: 'profile' as const,
        })),
        ...(artists || []).map((a) => ({
          id: a.artist_id,
          display_name: a.display_name || a.name_local || a.name_en,
          username: null,
          avatar_url: a.photo_url,
          _type: 'artist' as const,
        })),
        ...(venues || []).map((v) => ({
          id: v.venue_id,
          display_name: v.display_name || v.name_local || v.name_en,
          username: null,
          avatar_url: v.photo_url,
          _type: 'venue' as const,
        })),
      ];

      setDmSearchResults(results);
    }, 300);
    return () => clearTimeout(timer);
  }, [dmSearch, user]);

  // Start conversation with a user/artist/venue from search
  const startDM = useCallback(async (peerId: string, peerName: string, peerAvatar: string | null, resultType?: 'profile' | 'artist' | 'venue') => {
    if (!user) return;
    const supabase = createClient();
    let success = false;

    // Helper: ensure conversation appears in the sidebar list
    const ensureInList = (id: string, type: UnifiedConversation['type'], extra: Partial<UnifiedConversation> = {}) => {
      success = true;
      setSelectedConvo(id);
      setConversations((prev) => {
        if (prev.find((c) => c.id === id)) return prev;
        return [{
          id, type,
          peer_name: peerName, peer_avatar: peerAvatar,
          last_message: null, last_message_at: new Date().toISOString(),
          unread_count: 0, source_badge: type === 'artist_fan' ? 'artist' : type === 'venue_fan' ? 'venue' : type === 'member_hq' ? 'hq' : null,
          ...extra,
        }, ...prev];
      });
    };

    try {
      if (resultType === 'artist') {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'artist_fan')
          .eq('artist_id', peerId)
          .eq('fan_user_id', user.id)
          .maybeSingle();

        if (existing) {
          ensureInList(existing.id, 'artist_fan', { artist_id: peerId });
          setFilter('artist');
        } else {
          const { data: newConvo, error } = await supabase
            .from('conversations')
            .insert({ type: 'artist_fan', artist_id: peerId, fan_user_id: user.id })
            .select('id')
            .single();
          if (newConvo) {
            ensureInList(newConvo.id, 'artist_fan', { artist_id: peerId });
            setFilter('artist');
          } else if (error) {
            // Insert failed (e.g. unique constraint race) — retry finding it
            const { data: retry } = await supabase
              .from('conversations')
              .select('id')
              .eq('type', 'artist_fan')
              .eq('artist_id', peerId)
              .eq('fan_user_id', user.id)
              .maybeSingle();
            if (retry) {
              ensureInList(retry.id, 'artist_fan', { artist_id: peerId });
              setFilter('artist');
            }
          }
        }
      } else if (resultType === 'venue') {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'venue_fan')
          .eq('venue_id', peerId)
          .eq('fan_user_id', user.id)
          .maybeSingle();

        if (existing) {
          ensureInList(existing.id, 'venue_fan', { venue_id: peerId });
          setFilter('venue');
        } else {
          const { data: newConvo, error } = await supabase
            .from('conversations')
            .insert({ type: 'venue_fan', venue_id: peerId, fan_user_id: user.id })
            .select('id')
            .single();
          if (newConvo) {
            ensureInList(newConvo.id, 'venue_fan', { venue_id: peerId });
            setFilter('venue');
          } else if (error) {
            // Insert failed (e.g. unique constraint race) — retry finding it
            const { data: retry } = await supabase
              .from('conversations')
              .select('id')
              .eq('type', 'venue_fan')
              .eq('venue_id', peerId)
              .eq('fan_user_id', user.id)
              .maybeSingle();
            if (retry) {
              ensureInList(retry.id, 'venue_fan', { venue_id: peerId });
              setFilter('venue');
            }
          }
        }
      } else {
        const { data: existing } = await supabase
          .from('conversations')
          .select('id')
          .eq('type', 'member_member')
          .or(`and(fan_user_id.eq.${user.id},user_b_id.eq.${peerId}),and(fan_user_id.eq.${peerId},user_b_id.eq.${user.id})`)
          .maybeSingle();

        if (existing) {
          ensureInList(existing.id, 'member_member');
        } else {
          const { data: newConvo, error } = await supabase
            .from('conversations')
            .insert({ type: 'member_member', fan_user_id: user.id, user_b_id: peerId })
            .select('id')
            .single();
          if (newConvo) {
            ensureInList(newConvo.id, 'member_member');
          } else if (error) {
            // Insert failed — retry finding it
            const { data: retry } = await supabase
              .from('conversations')
              .select('id')
              .eq('type', 'member_member')
              .or(`and(fan_user_id.eq.${user.id},user_b_id.eq.${peerId}),and(fan_user_id.eq.${peerId},user_b_id.eq.${user.id})`)
              .maybeSingle();
            if (retry) {
              ensureInList(retry.id, 'member_member');
            }
          }
        }
      }
    } catch (err) {
      console.error('[inbox] startDM failed:', err);
    }

    // Only close search UI if we successfully opened a conversation
    if (success) {
      setShowDmSearch(false);
      setShowNewMenu(false);
      setDmSearch('');
    }
  }, [user]);

  // Fetch notifications + Realtime subscription
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    // Initial fetch (personal only — exclude artist/venue scoped notifications)
    supabase
      .from('notifications')
      .select('id, title, body, type, read_at, created_at')
      .eq('user_id', user.id)
      .or('reference_type.is.null,reference_type.not.in.(artist,venue)')
      .neq('type', 'message')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications(data || []);
        setNotifsLoading(false);
      });

    // Realtime: listen for new personal notifications (exclude artist/venue scoped)
    const ENTITY_TYPES = ['artist', 'venue'];
    const channel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as { id: string; title: string; body: string | null; type: string; read_at: string | null; created_at: string; reference_type?: string | null };
          if (n.reference_type && ENTITY_TYPES.includes(n.reference_type)) return;
          if (n.type === 'message') return;
          setNotifications((prev) => [{ id: n.id, title: n.title, body: n.body, type: n.type, read_at: n.read_at, created_at: n.created_at }, ...prev]);
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as { id: string; title: string; body: string | null; type: string; read_at: string | null; created_at: string; reference_type?: string | null };
          if (updated.reference_type && ENTITY_TYPES.includes(updated.reference_type)) return;
          setNotifications((prev) => prev.map((n) => n.id === updated.id ? { id: updated.id, title: updated.title, body: updated.body, type: updated.type, read_at: updated.read_at, created_at: updated.created_at } : n));
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markNotifRead = useCallback(async (id: string) => {
    if (!user) return;
    const supabase = createClient();
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Apply filter
  const filteredConversations = conversations.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'hq') return c.type === 'member_hq';
    if (filter === 'artist') return c.type === 'artist_fan';
    if (filter === 'venue') return c.type === 'venue_fan';
    if (filter === 'dm') return c.type === 'member_member';
    return true;
  });

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unreadNotifs = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <FadeUp>
        <div className="flex items-center justify-between gap-4">
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">{t('fanInbox')}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted-foreground)]">{t('enablePush')}</span>
            <PushNotificationToggle variant="toggle" />
          </div>
        </div>
      </FadeUp>

      {/* 2 Tabs */}
      <FadeUp>
        <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1">
          {(['messages', 'notifications'] as Tab[]).map((key) => {
            const badge = key === 'messages' ? totalUnread : unreadNotifs;
            return (
              <button
                key={key}
                onClick={() => { setTab(key); setSelectedConvo(null); }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  tab === key
                    ? 'bg-[var(--card)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {t(key === 'messages' ? 'inboxMessages' : 'inboxNotifications')}
                {badge > 0 && (
                  <span className="bg-emerald-400 text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </FadeUp>

      {/* Messages Tab */}
      {tab === 'messages' && (
        <FadeUp>
          {/* Filter Chips */}
          <div className="mb-3">
            <FilterChips active={filter} onChange={(f) => { setFilter(f); setSelectedConvo(null); }} />
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
            <div className="flex h-full">
              {/* Conversation List */}
              <div className={`${selectedConvo ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 border-r border-[var(--border)] shrink-0`}>
                {/* "+" New Conversation button */}
                <div className="p-3 border-b border-[var(--border)] relative">
                  <button
                    onClick={() => { setShowNewMenu(!showNewMenu); setShowDmSearch(false); }}
                    className="w-full text-center py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:border-emerald-400/50 hover:text-emerald-400 transition-colors"
                  >
                    + {t('newConversation')}
                  </button>

                  {showNewMenu && !showDmSearch && (
                    <div className="absolute top-full left-3 right-3 mt-1 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-lg z-10 overflow-hidden">
                      <button
                        onClick={contactHQ}
                        className="w-full text-left px-4 py-3 text-xs hover:bg-[var(--muted)] transition-colors flex items-center gap-2"
                      >
                        <div className="w-6 h-6 rounded-full bg-purple-400/15 flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                          </svg>
                        </div>
                        <span>{t('contactHQ')}</span>
                      </button>
                      <button
                        onClick={() => setShowDmSearch(true)}
                        className="w-full text-left px-4 py-3 text-xs hover:bg-[var(--muted)] transition-colors flex items-center gap-2 border-t border-[var(--border)]"
                      >
                        <div className="w-6 h-6 rounded-full bg-[var(--muted)] flex items-center justify-center shrink-0">
                          <svg className="w-3 h-3 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                          </svg>
                        </div>
                        <span>{t('fanInboxNewDM')}</span>
                      </button>
                    </div>
                  )}

                  {showDmSearch && (
                    <div className="mt-2 space-y-2">
                      <input type="text" value={dmSearch} onChange={(e) => setDmSearch(e.target.value)}
                        placeholder={t('fanInboxSearchUsers')} autoFocus
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-emerald-400/50"
                      />
                      {dmSearch.trim() && dmSearchResults.map((u) => (
                        <button key={`${u._type || 'profile'}-${u.id}`} onClick={() => startDM(u.id, u.display_name || u.username || 'Unknown', u.avatar_url, u._type)}
                          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs">
                              {(u.display_name || u.username || '?').charAt(0)}
                            </div>
                          )}
                          <span className="text-xs font-medium truncate">{u.display_name || u.username}</span>
                          {u._type === 'artist' && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 shrink-0">{t('filterArtist')}</span>
                          )}
                          {u._type === 'venue' && (
                            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded bg-emerald-400/15 text-emerald-400 shrink-0">{t('filterVenue')}</span>
                          )}
                        </button>
                      ))}
                      <button onClick={() => { setShowDmSearch(false); setShowNewMenu(false); setDmSearch(''); }}
                        className="w-full text-center text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] py-1">
                        {t('cancel')}
                      </button>
                    </div>
                  )}
                </div>

                {/* Conversation List */}
                <div className="flex-1 overflow-y-auto no-scrollbar">
                  {fetching ? (
                    <div className="p-6 text-center">
                      <div className="w-5 h-5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
                    </div>
                  ) : filteredConversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-[var(--muted-foreground)]">{t('noFanMessages')}</p>
                      <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{t('noFanMessagesHint')}</p>
                    </div>
                  ) : (
                    filteredConversations.map((convo) => (
                      <button key={convo.id} onClick={() => { setSelectedConvo(convo.id); setShowNewMenu(false); setShowDmSearch(false); }}
                        className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${selectedConvo === convo.id ? 'bg-[var(--muted)]' : ''}`}>
                        <div className="flex items-center gap-3">
                          {convo.source_badge === 'hq' ? (
                            <div className="w-9 h-9 rounded-full bg-purple-400/15 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                              </svg>
                            </div>
                          ) : convo.source_badge === 'venue' && !convo.peer_avatar ? (
                            <div className="w-9 h-9 rounded-full bg-emerald-400/15 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
                              </svg>
                            </div>
                          ) : convo.peer_avatar ? (
                            <img src={convo.peer_avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[var(--background)] flex items-center justify-center text-xs text-[var(--muted-foreground)] shrink-0">
                              {(convo.peer_name || '?').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-semibold truncate">{convo.peer_name}</p>
                              <SourceBadge type={convo.source_badge} />
                              {convo.unread_count > 0 && (
                                <span className="ml-auto bg-emerald-400 text-[#0A0A0A] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                  {convo.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">{convo.last_message || '...'}</p>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Chat Thread */}
              <div className={`${selectedConvo ? 'flex' : 'hidden sm:flex'} flex-col flex-1 min-w-0`}>
                {selectedConvo && selectedConversation ? (
                  <>
                    {/* Thread Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                      <button onClick={() => setSelectedConvo(null)} className="sm:hidden text-[var(--muted-foreground)]">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <span className="text-sm font-semibold">{selectedConversation.peer_name}</span>
                      <SourceBadge type={selectedConversation.source_badge} />

                      {/* Delete conversation */}
                      <div className="ml-auto flex items-center gap-2">
                        {!confirmDelete ? (
                          <button
                            onClick={() => setConfirmDelete(true)}
                            className="text-[var(--muted-foreground)]/40 hover:text-red-400 transition-colors"
                            title={t('deleteConversation')}
                          >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                            </svg>
                          </button>
                        ) : (
                          <>
                            <span className="text-xs text-red-400">{t('deleteConversationConfirm')}</span>
                            <button onClick={handleDeleteConversation} disabled={deleting}
                              className="text-xs text-red-400 font-semibold hover:text-red-300 disabled:opacity-50">
                              {deleting ? '...' : t('confirmYes')}
                            </button>
                            <button onClick={() => setConfirmDelete(false)}
                              className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                              {t('cancel')}
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Messages */}
                    <div ref={messagesContainerRef} className="flex-1 overflow-y-auto no-scrollbar p-4 space-y-3">
                      {messages.map((msg) => {
                        const isMe = msg.sender_id === user.id;

                        // Broadcast message — special quote style
                        if (msg.broadcast_id && !isMe) {
                          return (
                            <div key={msg.id} className="flex justify-start">
                              <BroadcastBubble body={msg.body} createdAt={msg.created_at}>
                                <TranslateButton text={msg.body} locale={locale} />
                              </BroadcastBubble>
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                              isMe ? 'bg-emerald-400/15 text-[var(--foreground)]' : 'bg-[var(--muted)] text-[var(--foreground)]'
                            }`}>
                              {!isMe && msg.sender_role === 'admin' && msg.sender_display && (
                                <p className="text-[10px] text-emerald-400/60 font-semibold mb-0.5">
                                  JazzNode HQ · {msg.sender_display}
                                </p>
                              )}
                              <div className="flex items-start gap-2">
                                <p className="whitespace-pre-wrap break-words flex-1">{msg.body}</p>
                                <TranslateButton text={msg.body} locale={locale} />
                              </div>
                              <p className={`text-[10px] mt-1 ${isMe ? 'text-emerald-400/50' : 'text-[var(--muted-foreground)]/50'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Message Input */}
                    <div className="p-3 border-t border-[var(--border)]">
                      <div className="flex gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                          placeholder={t('typeMessage')}
                          className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-emerald-400/50 transition-colors"
                        />
                        <button onClick={handleSend} disabled={!newMessage.trim() || sending}
                          className="px-4 py-2.5 rounded-xl bg-emerald-400 text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30">
                          {t('send')}
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-sm text-[var(--muted-foreground)]">{t('selectConversation')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </FadeUp>
      )}

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <FadeUp>
          <div className="space-y-3">
            {notifsLoading ? (
              <div className="py-12 text-center">
                <div className="w-6 h-6 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">{t('fanInboxNoNotifications')}</p>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
                {notifications.map((notif) => (
                  <div key={notif.id}
                    className={`px-5 py-4 transition-colors ${!notif.read_at ? 'bg-emerald-400/[0.02] cursor-pointer' : ''}`}
                    onClick={() => !notif.read_at && markNotifRead(notif.id)}>
                    <div className="flex items-start gap-3">
                      {!notif.read_at && <span className="w-2 h-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold">{notif.title}</p>
                        {notif.body && <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{notif.body}</p>}
                        <p className="text-xs text-[var(--muted-foreground)]/50 mt-1">
                          {new Date(notif.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </FadeUp>
      )}
    </div>
  );
}
