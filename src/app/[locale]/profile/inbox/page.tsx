'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

type Tab = 'messages' | 'broadcasts' | 'hq' | 'dm' | 'notifications';

interface Conversation {
  id: string;
  artist_id: string;
  last_message_at: string;
  artist_name?: string;
  artist_photo?: string | null;
  last_message?: string;
  unread_count: number;
}

interface DMConversation {
  id: string;
  fan_user_id: string;
  user_b_id: string;
  last_message_at: string;
  peer_name?: string;
  peer_avatar?: string | null;
  last_message?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
  sender_display?: string;
}

interface BroadcastItem {
  id: string;
  title: string;
  body: string;
  sent_at: string;
  artist_id: string;
  artist_name?: string;
  artist_photo?: string | null;
  read_at: string | null;
  delivery_id: string;
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

// Shared chat UI for message threads
function ChatThread({
  messages, userId, locale, selectedName, onBack, onSend, sending, newMessage, setNewMessage,
  messagesEndRef, placeholder, showSenderLabel,
}: {
  messages: Message[]; userId: string; locale: string;
  selectedName: string; onBack: () => void; onSend: () => void;
  sending: boolean; newMessage: string; setNewMessage: (v: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement | null>; placeholder: string;
  showSenderLabel?: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
        <button onClick={onBack} className="sm:hidden text-[var(--muted-foreground)]">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <span className="text-sm font-semibold">{selectedName}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                isMe ? 'bg-[var(--color-gold)]/15 text-[var(--foreground)]' : 'bg-[var(--muted)] text-[var(--foreground)]'
              }`}>
                {showSenderLabel && !isMe && msg.sender_role === 'admin' && msg.sender_display && (
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
      <div className="p-3 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && onSend()}
            placeholder={placeholder}
            className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
          />
          <button onClick={onSend} disabled={!newMessage.trim() || sending}
            className="px-4 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30">
            Send
          </button>
        </div>
      </div>
    </>
  );
}

export default function FanInboxPage() {
  const t = useTranslations('artistStudio');
  const locale = useLocale();
  const router = useRouter();
  const { user, loading, setShowComingSoon } = useAuth();

  const [tab, setTab] = useState<Tab>('messages');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [broadcasts, setBroadcasts] = useState<BroadcastItem[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [fetching, setFetching] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // HQ conversation state
  const [hqConvo, setHqConvo] = useState<{ id: string } | null>(null);
  const [hqMessages, setHqMessages] = useState<Message[]>([]);
  const [hqNewMessage, setHqNewMessage] = useState('');
  const [hqSending, setHqSending] = useState(false);
  const [hqLoading, setHqLoading] = useState(true);
  const hqMessagesEndRef = useRef<HTMLDivElement>(null);

  // DM state
  const [dmConversations, setDmConversations] = useState<DMConversation[]>([]);
  const [dmSelectedConvo, setDmSelectedConvo] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<Message[]>([]);
  const [dmNewMessage, setDmNewMessage] = useState('');
  const [dmSending, setDmSending] = useState(false);
  const [dmFetching, setDmFetching] = useState(true);
  const [dmSearch, setDmSearch] = useState('');
  const [dmSearchResults, setDmSearchResults] = useState<{ id: string; display_name: string | null; username: string | null; avatar_url: string | null }[]>([]);
  const [showDmSearch, setShowDmSearch] = useState(false);
  const dmMessagesEndRef = useRef<HTMLDivElement>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      setShowComingSoon({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      router.push('/');
    }
  }, [loading, user, router, setShowComingSoon]);

  // Fetch artist conversations (as fan)
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from('conversations')
      .select('id, artist_id, last_message_at, fan_archived')
      .eq('fan_user_id', user.id)
      .eq('type', 'artist_fan')
      .eq('fan_archived', false)
      .order('last_message_at', { ascending: false })
      .then(async ({ data: convos }) => {
        if (!convos || convos.length === 0) {
          setConversations([]);
          setFetching(false);
          return;
        }

        const artistIds = [...new Set(convos.map((c) => c.artist_id))];
        const { data: artists } = await supabase
          .from('artists')
          .select('artist_id, display_name, name_local, name_en, photo_url')
          .in('artist_id', artistIds);

        const artistMap = new Map(
          artists?.map((a) => [a.artist_id, {
            name: a.display_name || a.name_local || a.name_en || a.artist_id,
            photo: a.photo_url,
          }]) || []
        );

        const enriched = await Promise.all(
          convos.map(async (convo) => {
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', convo.id)
              .neq('sender_id', user.id)
              .is('read_at', null);

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('body')
              .eq('conversation_id', convo.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const artistInfo = artistMap.get(convo.artist_id);
            return {
              ...convo,
              artist_name: artistInfo?.name,
              artist_photo: artistInfo?.photo,
              last_message: lastMsg?.body,
              unread_count: count || 0,
            };
          })
        );

        setConversations(enriched);
        setFetching(false);
      });

    // Fetch broadcast deliveries
    supabase
      .from('broadcast_deliveries')
      .select('id, broadcast_id, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(async ({ data: deliveries }) => {
        if (!deliveries || deliveries.length === 0) { setBroadcasts([]); return; }

        const broadcastIds = deliveries.map((d) => d.broadcast_id);
        const { data: bcs } = await supabase
          .from('broadcasts')
          .select('id, title, body, sent_at, artist_id')
          .in('id', broadcastIds);

        if (!bcs) { setBroadcasts([]); return; }

        const bcArtistIds = [...new Set(bcs.map((b) => b.artist_id))];
        const { data: artists } = await supabase
          .from('artists')
          .select('artist_id, display_name, name_local, name_en, photo_url')
          .in('artist_id', bcArtistIds);

        const artistMap = new Map(
          artists?.map((a) => [a.artist_id, {
            name: a.display_name || a.name_local || a.name_en || a.artist_id,
            photo: a.photo_url,
          }]) || []
        );

        const bcMap = new Map(bcs.map((b) => [b.id, b]));

        const items: BroadcastItem[] = deliveries
          .map((d) => {
            const bc = bcMap.get(d.broadcast_id);
            if (!bc) return null;
            const artistInfo = artistMap.get(bc.artist_id);
            return {
              id: bc.id, title: bc.title, body: bc.body, sent_at: bc.sent_at,
              artist_id: bc.artist_id, artist_name: artistInfo?.name,
              artist_photo: artistInfo?.photo, read_at: d.read_at, delivery_id: d.id,
            };
          })
          .filter(Boolean) as BroadcastItem[];

        setBroadcasts(items);
      });
  }, [user]);

  // Fetch HQ conversation
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('conversations')
      .select('id')
      .eq('fan_user_id', user.id)
      .eq('type', 'member_hq')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setHqConvo(data);
        setHqLoading(false);
      });
  }, [user]);

  // Fetch HQ messages
  useEffect(() => {
    if (!hqConvo || !user) return;
    const supabase = createClient();
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', hqConvo.id)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        if (!data) return;
        // Enrich sender names for admin messages
        const adminIds = [...new Set(data.filter((m) => m.sender_role === 'admin').map((m) => m.sender_id))];
        let profileMap = new Map<string, string>();
        if (adminIds.length > 0) {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, display_name, username')
            .in('id', adminIds);
          profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name || p.username || 'Admin']));
        }
        setHqMessages(data.map((m) => ({ ...m, sender_display: profileMap.get(m.sender_id) })));
      });

    // Mark HQ messages as read
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', hqConvo.id)
      .neq('sender_id', user.id)
      .is('read_at', null);
  }, [hqConvo, user]);

  useEffect(() => {
    hqMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [hqMessages]);

  // Send HQ message
  const handleHqSend = useCallback(async () => {
    if (!hqNewMessage.trim() || !user || hqSending) return;
    setHqSending(true);
    const supabase = createClient();
    const body = hqNewMessage.trim();
    setHqNewMessage('');

    let convoId = hqConvo?.id;
    if (!convoId) {
      const { data: newConvo } = await supabase
        .from('conversations')
        .insert({ type: 'member_hq', fan_user_id: user.id })
        .select('id')
        .single();
      if (newConvo) {
        convoId = newConvo.id;
        setHqConvo(newConvo);
      }
    }
    if (!convoId) { setHqSending(false); return; }

    const { data: msg } = await supabase
      .from('messages')
      .insert({ conversation_id: convoId, sender_id: user.id, body })
      .select()
      .single();

    if (msg) {
      setHqMessages((prev) => [...prev, msg]);
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', convoId);
    }
    setHqSending(false);
  }, [hqNewMessage, hqConvo, user, hqSending]);

  // Fetch DM conversations
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();
    supabase
      .from('conversations')
      .select('id, fan_user_id, user_b_id, last_message_at')
      .eq('type', 'member_member')
      .or(`fan_user_id.eq.${user.id},user_b_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false })
      .then(async ({ data: convos }) => {
        if (!convos || convos.length === 0) { setDmConversations([]); setDmFetching(false); return; }

        const peerIds = convos.map((c) => c.fan_user_id === user.id ? c.user_b_id : c.fan_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username, avatar_url')
          .in('id', peerIds);
        const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

        const enriched = await Promise.all(
          convos.map(async (convo) => {
            const peerId = convo.fan_user_id === user.id ? convo.user_b_id : convo.fan_user_id;
            const { count } = await supabase
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .eq('conversation_id', convo.id)
              .neq('sender_id', user.id)
              .is('read_at', null);

            const { data: lastMsg } = await supabase
              .from('messages')
              .select('body')
              .eq('conversation_id', convo.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            const peer = profileMap.get(peerId);
            return {
              ...convo,
              peer_name: peer?.display_name || peer?.username || 'Unknown',
              peer_avatar: peer?.avatar_url || null,
              last_message: lastMsg?.body,
              unread_count: count || 0,
            };
          })
        );

        setDmConversations(enriched);
        setDmFetching(false);
      });
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
  const startDM = useCallback(async (peerId: string) => {
    if (!user) return;
    const supabase = createClient();

    // Check if conversation already exists
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('type', 'member_member')
      .or(`and(fan_user_id.eq.${user.id},user_b_id.eq.${peerId}),and(fan_user_id.eq.${peerId},user_b_id.eq.${user.id})`)
      .maybeSingle();

    if (existing) {
      setDmSelectedConvo(existing.id);
      setShowDmSearch(false);
      setDmSearch('');
      return;
    }

    const { data: newConvo } = await supabase
      .from('conversations')
      .insert({ type: 'member_member', fan_user_id: user.id, user_b_id: peerId })
      .select('id')
      .single();

    if (newConvo) {
      setDmSelectedConvo(newConvo.id);
      setShowDmSearch(false);
      setDmSearch('');
      // Refresh DM list
      setDmFetching(true);
    }
  }, [user]);

  // Fetch DM messages
  useEffect(() => {
    if (!dmSelectedConvo || !user) return;
    const supabase = createClient();
    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', dmSelectedConvo)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setDmMessages(data); });

    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', dmSelectedConvo)
      .neq('sender_id', user.id)
      .is('read_at', null)
      .then(() => {
        setDmConversations((prev) =>
          prev.map((c) => (c.id === dmSelectedConvo ? { ...c, unread_count: 0 } : c))
        );
      });
  }, [dmSelectedConvo, user]);

  useEffect(() => {
    dmMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [dmMessages]);

  // Send DM
  const handleDmSend = useCallback(async () => {
    if (!dmNewMessage.trim() || !dmSelectedConvo || !user || dmSending) return;
    setDmSending(true);
    const supabase = createClient();
    const body = dmNewMessage.trim();
    setDmNewMessage('');

    const { data: msg } = await supabase
      .from('messages')
      .insert({ conversation_id: dmSelectedConvo, sender_id: user.id, body })
      .select()
      .single();

    if (msg) {
      setDmMessages((prev) => [...prev, msg]);
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', dmSelectedConvo);
    }
    setDmSending(false);
  }, [dmNewMessage, dmSelectedConvo, user, dmSending]);

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

  // Fetch messages for selected artist conversation
  useEffect(() => {
    if (!selectedConvo || !user) return;
    const supabase = createClient();

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedConvo)
      .order('created_at', { ascending: true })
      .then(({ data }) => { if (data) setMessages(data); });

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

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConvo || !user || sending) return;
    setSending(true);
    const supabase = createClient();
    const body = newMessage.trim();
    setNewMessage('');

    const { data: msg } = await supabase
      .from('messages')
      .insert({ conversation_id: selectedConvo, sender_id: user.id, body })
      .select()
      .single();

    if (msg) {
      setMessages((prev) => [...prev, msg]);
      await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConvo);
    }
    setSending(false);
  }, [newMessage, selectedConvo, user, sending]);

  const markBroadcastRead = useCallback(async (deliveryId: string) => {
    if (!user) return;
    const supabase = createClient();
    await supabase.from('broadcast_deliveries').update({ read_at: new Date().toISOString() }).eq('id', deliveryId);
    setBroadcasts((prev) => prev.map((b) => (b.delivery_id === deliveryId ? { ...b, read_at: new Date().toISOString() } : b)));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unreadBroadcasts = broadcasts.filter((b) => !b.read_at).length;
  const dmTotalUnread = dmConversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unreadNotifs = notifications.filter((n) => !n.read_at).length;
  const selectedDmConvo = dmConversations.find((c) => c.id === dmSelectedConvo);

  const tabButton = (key: Tab, label: string, badge: number) => (
    <button
      key={key}
      onClick={() => { setTab(key); setSelectedConvo(null); setDmSelectedConvo(null); }}
      className={`px-3 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
        tab === key
          ? 'bg-[var(--card)] text-[var(--foreground)]'
          : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="ml-1.5 bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <FadeUp>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold">{t('fanInbox')}</h1>
      </FadeUp>

      {/* Tabs */}
      <FadeUp>
        <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1 overflow-x-auto no-scrollbar">
          {tabButton('messages', t('fanInboxMessages'), totalUnread)}
          {tabButton('broadcasts', t('fanInboxBroadcasts'), unreadBroadcasts)}
          {tabButton('hq', t('fanInboxHQ'), 0)}
          {tabButton('dm', t('fanInboxDM'), dmTotalUnread)}
          {tabButton('notifications', t('fanInboxNotifications'), unreadNotifs)}
        </div>
      </FadeUp>

      {/* Messages Tab (Artist conversations) */}
      {tab === 'messages' && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
            <div className="flex h-full">
              <div className={`${selectedConvo ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-72 border-r border-[var(--border)] shrink-0`}>
                <div className="flex-1 overflow-y-auto">
                  {fetching ? (
                    <div className="p-6 text-center">
                      <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-[var(--muted-foreground)]">{t('noFanMessages')}</p>
                      <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{t('noFanMessagesHint')}</p>
                    </div>
                  ) : (
                    conversations.map((convo) => (
                      <button key={convo.id} onClick={() => setSelectedConvo(convo.id)}
                        className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${selectedConvo === convo.id ? 'bg-[var(--muted)]' : ''}`}>
                        <div className="flex items-center gap-3">
                          {convo.artist_photo ? (
                            <img src={convo.artist_photo} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[var(--background)] flex items-center justify-center text-xs text-[var(--muted-foreground)] shrink-0">
                              {(convo.artist_name || '?').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold truncate">{convo.artist_name}</p>
                              {convo.unread_count > 0 && (
                                <span className="bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
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
              <div className={`${selectedConvo ? 'flex' : 'hidden sm:flex'} flex-col flex-1 min-w-0`}>
                {selectedConvo && selectedConversation ? (
                  <ChatThread
                    messages={messages} userId={user.id} locale={locale}
                    selectedName={selectedConversation.artist_name || ''}
                    onBack={() => setSelectedConvo(null)} onSend={handleSend}
                    sending={sending} newMessage={newMessage} setNewMessage={setNewMessage}
                    messagesEndRef={messagesEndRef} placeholder={t('typeMessage')}
                  />
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

      {/* Broadcasts Tab */}
      {tab === 'broadcasts' && (
        <FadeUp>
          <div className="space-y-3">
            {broadcasts.length === 0 ? (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">{t('noFanBroadcasts')}</p>
                <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{t('noFanBroadcastsHint')}</p>
              </div>
            ) : (
              broadcasts.map((bc) => (
                <div key={`${bc.id}-${bc.delivery_id}`}
                  className={`bg-[var(--card)] border rounded-2xl p-5 transition-colors ${bc.read_at ? 'border-[var(--border)]' : 'border-[var(--color-gold)]/20'}`}
                  onClick={() => !bc.read_at && markBroadcastRead(bc.delivery_id)}>
                  <div className="flex items-start gap-3">
                    {bc.artist_photo ? (
                      <img src={bc.artist_photo} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs shrink-0">
                        {(bc.artist_name || '?').charAt(0)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <Link href={`/${locale}/artists/${bc.artist_id}`}
                          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors">
                          {t('fromArtist', { name: bc.artist_name || '' })}
                        </Link>
                        <div className="flex items-center gap-2">
                          {!bc.read_at && <span className="w-2 h-2 rounded-full bg-[var(--color-gold)]" />}
                          <span className="text-xs text-[var(--muted-foreground)]">{new Date(bc.sent_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <h3 className="text-sm font-semibold mb-1">{bc.title}</h3>
                      <p className="text-sm text-[var(--muted-foreground)] line-clamp-3">{bc.body}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </FadeUp>
      )}

      {/* JazzNode HQ Tab */}
      {tab === 'hq' && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
            <div className="flex flex-col h-full">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                <div className="w-8 h-8 rounded-full bg-[var(--color-gold)]/15 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--color-gold)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold">JazzNode HQ</p>
                  <p className="text-[10px] text-[var(--muted-foreground)]">{t('fanInboxHQHint')}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {hqLoading ? (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
                  </div>
                ) : hqMessages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center py-12">
                    <div className="text-center">
                      <p className="text-sm text-[var(--muted-foreground)]">{t('fanInboxHQEmpty')}</p>
                      <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{t('fanInboxHQEmptyHint')}</p>
                    </div>
                  </div>
                ) : (
                  hqMessages.map((msg) => {
                    const isMe = msg.sender_id === user.id;
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
                  })
                )}
                <div ref={hqMessagesEndRef} />
              </div>
              <div className="p-3 border-t border-[var(--border)]">
                <div className="flex gap-2">
                  <input type="text" value={hqNewMessage} onChange={(e) => setHqNewMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleHqSend()}
                    placeholder={t('fanInboxHQPlaceholder')}
                    className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                  />
                  <button onClick={handleHqSend} disabled={!hqNewMessage.trim() || hqSending}
                    className="px-4 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30">
                    {t('send')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </FadeUp>
      )}

      {/* DM Tab */}
      {tab === 'dm' && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
            <div className="flex h-full">
              <div className={`${dmSelectedConvo ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-72 border-r border-[var(--border)] shrink-0`}>
                {/* New DM button */}
                <div className="p-3 border-b border-[var(--border)]">
                  <button onClick={() => setShowDmSearch(!showDmSearch)}
                    className="w-full text-center py-2 rounded-xl border border-dashed border-[var(--border)] text-xs text-[var(--muted-foreground)] hover:border-[var(--color-gold)]/50 hover:text-[var(--color-gold)] transition-colors">
                    + {t('fanInboxNewDM')}
                  </button>
                  {showDmSearch && (
                    <div className="mt-2 space-y-2">
                      <input type="text" value={dmSearch} onChange={(e) => setDmSearch(e.target.value)}
                        placeholder={t('fanInboxSearchUsers')}
                        className="w-full bg-[var(--background)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50"
                      />
                      {dmSearchResults.map((u) => (
                        <button key={u.id} onClick={() => startDM(u.id)}
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
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-y-auto">
                  {dmFetching ? (
                    <div className="p-6 text-center">
                      <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
                    </div>
                  ) : dmConversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-[var(--muted-foreground)]">{t('fanInboxNoDM')}</p>
                    </div>
                  ) : (
                    dmConversations.map((convo) => (
                      <button key={convo.id} onClick={() => setDmSelectedConvo(convo.id)}
                        className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${dmSelectedConvo === convo.id ? 'bg-[var(--muted)]' : ''}`}>
                        <div className="flex items-center gap-3">
                          {convo.peer_avatar ? (
                            <img src={convo.peer_avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[var(--background)] flex items-center justify-center text-xs text-[var(--muted-foreground)] shrink-0">
                              {(convo.peer_name || '?').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold truncate">{convo.peer_name}</p>
                              {convo.unread_count > 0 && (
                                <span className="bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
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
              <div className={`${dmSelectedConvo ? 'flex' : 'hidden sm:flex'} flex-col flex-1 min-w-0`}>
                {dmSelectedConvo && selectedDmConvo ? (
                  <ChatThread
                    messages={dmMessages} userId={user.id} locale={locale}
                    selectedName={selectedDmConvo.peer_name || 'Unknown'}
                    onBack={() => setDmSelectedConvo(null)} onSend={handleDmSend}
                    sending={dmSending} newMessage={dmNewMessage} setNewMessage={setDmNewMessage}
                    messagesEndRef={dmMessagesEndRef} placeholder={t('typeMessage')}
                  />
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
