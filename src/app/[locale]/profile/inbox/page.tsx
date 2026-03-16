'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import SourceBadge from '@/components/inbox/SourceBadge';
import BroadcastBubble from '@/components/inbox/BroadcastBubble';
import FilterChips, { type FilterType } from '@/components/inbox/FilterChips';

type Tab = 'messages' | 'notifications';

interface UnifiedConversation {
  id: string;
  type: 'artist_fan' | 'member_hq' | 'member_member';
  artist_id?: string;
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
        className="text-[var(--muted-foreground)]/50 hover:text-[var(--color-gold)] transition-colors disabled:opacity-30" title="Translate">
        {loading ? (
          <div className="w-3.5 h-3.5 border border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
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
  const { user, loading, setShowComingSoon } = useAuth();

  const [tab, setTab] = useState<Tab>('messages');
  const [filter, setFilter] = useState<FilterType>('all');
  const [conversations, setConversations] = useState<UnifiedConversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [fetching, setFetching] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // "+" menu state
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showDmSearch, setShowDmSearch] = useState(false);
  const [dmSearch, setDmSearch] = useState('');
  const [dmSearchResults, setDmSearchResults] = useState<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]>([]);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  // Handle deep link from DMButton (?tab=dm&convo=xxx)
  useEffect(() => {
    const convoParam = searchParams.get('convo');
    if (convoParam) setSelectedConvo(convoParam);
  }, [searchParams]);

  // Fetch ALL conversations (unified)
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      // Fetch all conversations where user is a participant
      const { data: allConvos } = await supabase
        .from('conversations')
        .select('id, type, artist_id, fan_user_id, user_b_id, last_message_at')
        .or(`fan_user_id.eq.${user.id},user_b_id.eq.${user.id}`)
        .order('last_message_at', { ascending: false });

      if (cancelled || !allConvos) { if (!cancelled) { setConversations([]); setFetching(false); } return; }

      // Collect IDs for enrichment
      const artistIds = new Set<string>();
      const profileIds = new Set<string>();

      allConvos.forEach((c) => {
        if (c.type === 'artist_fan' && c.artist_id) artistIds.add(c.artist_id);
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
            peer_name,
            peer_avatar,
            last_message: lastMsg?.body || null,
            last_message_at: convo.last_message_at,
            unread_count: count || 0,
            source_badge,
          };
        })
      );

      if (!cancelled) { setConversations(enriched); setFetching(false); }
    })();

    return () => { cancelled = true; };
  }, [user]);

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
      });
  }, [selectedConvo, user]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Send message
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConvo || !user || sending) return;
    setSending(true);
    const supabase = createClient();
    const body = newMessage.trim();
    setNewMessage('');

    const { data: msg } = await supabase
      .from('messages')
      .insert({ conversation_id: selectedConvo, sender_id: user.id, body })
      .select('id, conversation_id, sender_id, sender_role, broadcast_id, body, read_at, created_at')
      .single();

    if (msg) {
      setMessages((prev) => [...prev, msg]);
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConvo);
    }
    setSending(false);
  }, [newMessage, selectedConvo, user, sending]);

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

  // DM search users
  useEffect(() => {
    if (!dmSearch.trim() || !user) { setDmSearchResults([]); return; }
    const timer = setTimeout(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from('profiles')
        .select('id, display_name, username, avatar_url')
        .or(`display_name.ilike.%${dmSearch}%,username.ilike.%${dmSearch}%`)
        .neq('id', user.id)
        .limit(10);
      setDmSearchResults(data || []);
    }, 300);
    return () => clearTimeout(timer);
  }, [dmSearch, user]);

  // Start DM with a user
  const startDM = useCallback(async (peerId: string, peerName: string, peerAvatar: string | null) => {
    if (!user) return;
    const supabase = createClient();

    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'member_member')
      .or(`and(fan_user_id.eq.${user.id},user_b_id.eq.${peerId}),and(fan_user_id.eq.${peerId},user_b_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      setSelectedConvo(existing.id);
      setShowDmSearch(false);
      setShowNewMenu(false);
      setDmSearch('');
      return;
    }

    const { data: newConvo } = await supabase
      .from('conversations')
      .insert({ type: 'member_member', fan_user_id: user.id, user_b_id: peerId })
      .select('id')
      .single();

    if (newConvo) {
      setSelectedConvo(newConvo.id);
      setShowDmSearch(false);
      setShowNewMenu(false);
      setDmSearch('');
      setConversations((prev) => [{
        id: newConvo.id,
        type: 'member_member',
        peer_name: peerName,
        peer_avatar: peerAvatar,
        last_message: null,
        last_message_at: new Date().toISOString(),
        unread_count: 0,
        source_badge: null,
      }, ...prev]);
    }
  }, [user]);

  // Fetch notifications
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('notifications')
      .select('id, title, body, type, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications(data || []);
        setNotifsLoading(false);
      });
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
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  // Apply filter
  const filteredConversations = conversations.filter((c) => {
    if (filter === 'all') return true;
    if (filter === 'hq') return c.type === 'member_hq';
    if (filter === 'artist') return c.type === 'artist_fan';
    if (filter === 'dm') return c.type === 'member_member';
    return true;
  });

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unreadNotifs = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <FadeUp>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold">{t('fanInbox')}</h1>
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
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                  tab === key
                    ? 'bg-[var(--card)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {t(key === 'messages' ? 'inboxMessages' : 'inboxNotifications')}
                {badge > 0 && (
                  <span className="ml-1.5 bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
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
            <FilterChips active={filter} onChange={setFilter} />
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
            <div className="flex h-full">
              {/* Conversation List */}
              <div className={`${selectedConvo ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-80 border-r border-[var(--border)] shrink-0`}>
                {/* "+" New Conversation button */}
                <div className="p-3 border-b border-[var(--border)] relative">
                  <button
                    onClick={() => { setShowNewMenu(!showNewMenu); setShowDmSearch(false); }}
                    className="w-full text-center py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:border-[var(--color-gold)]/50 hover:text-[var(--color-gold)] transition-colors"
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
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50"
                      />
                      {dmSearchResults.map((u) => (
                        <button key={u.id} onClick={() => startDM(u.id, u.display_name || u.username || 'Unknown', u.avatar_url)}
                          className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--muted)] transition-colors">
                          {u.avatar_url ? (
                            <img src={u.avatar_url} alt="" className="w-7 h-7 rounded-full object-cover" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs">
                              {(u.display_name || u.username || '?').charAt(0)}
                            </div>
                          )}
                          <span className="text-xs font-medium truncate">{u.display_name || u.username}</span>
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
                <div className="flex-1 overflow-y-auto">
                  {fetching ? (
                    <div className="p-6 text-center">
                      <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
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
                                <span className="ml-auto bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
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
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                              isMe ? 'bg-[var(--color-gold)]/15 text-[var(--foreground)]' : 'bg-[var(--muted)] text-[var(--foreground)]'
                            }`}>
                              {!isMe && msg.sender_role === 'admin' && msg.sender_display && (
                                <p className="text-[10px] text-[var(--color-gold)]/60 font-semibold mb-0.5">
                                  JazzNode HQ · {msg.sender_display}
                                </p>
                              )}
                              <div className="flex items-start gap-2">
                                <p className="whitespace-pre-wrap break-words flex-1">{msg.body}</p>
                                <TranslateButton text={msg.body} locale={locale} />
                              </div>
                              <p className={`text-[10px] mt-1 ${isMe ? 'text-[var(--color-gold)]/50' : 'text-[var(--muted-foreground)]/50'}`}>
                                {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>

                    {/* Message Input */}
                    <div className="p-3 border-t border-[var(--border)]">
                      <div className="flex gap-2">
                        <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                          placeholder={t('typeMessage')}
                          className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                        />
                        <button onClick={handleSend} disabled={!newMessage.trim() || sending}
                          className="px-4 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30">
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
                <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">{t('fanInboxNoNotifications')}</p>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
                {notifications.map((notif) => (
                  <div key={notif.id}
                    className={`px-5 py-4 transition-colors ${!notif.read_at ? 'bg-[var(--color-gold)]/[0.02] cursor-pointer' : ''}`}
                    onClick={() => !notif.read_at && markNotifRead(notif.id)}>
                    <div className="flex items-start gap-3">
                      {!notif.read_at && <span className="w-2 h-2 rounded-full bg-[var(--color-gold)] mt-1.5 shrink-0" />}
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
