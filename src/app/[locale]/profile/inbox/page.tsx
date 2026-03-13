'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';

type Tab = 'messages' | 'broadcasts';

interface Conversation {
  id: string;
  artist_id: string;
  last_message_at: string;
  artist_name?: string;
  artist_photo?: string | null;
  last_message?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
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

  // Auth guard
  useEffect(() => {
    if (!loading && !user) {
      setShowComingSoon({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
      router.push('/');
    }
  }, [loading, user, router, setShowComingSoon]);

  // Fetch conversations (as fan)
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from('conversations')
      .select('id, artist_id, last_message_at, fan_archived')
      .eq('fan_user_id', user.id)
      .eq('fan_archived', false)
      .order('last_message_at', { ascending: false })
      .then(async ({ data: convos }) => {
        if (!convos || convos.length === 0) {
          setConversations([]);
          setFetching(false);
          return;
        }

        // Fetch artist info
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
        if (!deliveries || deliveries.length === 0) {
          setBroadcasts([]);
          return;
        }

        const broadcastIds = deliveries.map((d) => d.broadcast_id);
        const { data: bcs } = await supabase
          .from('broadcasts')
          .select('id, title, body, sent_at, artist_id')
          .in('id', broadcastIds);

        if (!bcs) {
          setBroadcasts([]);
          return;
        }

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
              id: bc.id,
              title: bc.title,
              body: bc.body,
              sent_at: bc.sent_at,
              artist_id: bc.artist_id,
              artist_name: artistInfo?.name,
              artist_photo: artistInfo?.photo,
              read_at: d.read_at,
              delivery_id: d.id,
            };
          })
          .filter(Boolean) as BroadcastItem[];

        setBroadcasts(items);
      });
  }, [user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConvo || !user) return;
    const supabase = createClient();

    supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', selectedConvo)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // Mark as read
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
      await supabase
        .from('conversations')
        .update({ last_message_at: new Date().toISOString() })
        .eq('id', selectedConvo);
    }

    setSending(false);
  }, [newMessage, selectedConvo, user, sending]);

  // Mark broadcast as read
  const markBroadcastRead = useCallback(async (deliveryId: string) => {
    if (!user) return;
    const supabase = createClient();
    await supabase
      .from('broadcast_deliveries')
      .update({ read_at: new Date().toISOString() })
      .eq('id', deliveryId);
    setBroadcasts((prev) =>
      prev.map((b) => (b.delivery_id === deliveryId ? { ...b, read_at: new Date().toISOString() } : b))
    );
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

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <FadeUp>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold">{t('fanInbox')}</h1>
      </FadeUp>

      {/* Tabs */}
      <FadeUp>
        <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1 w-fit">
          <button
            onClick={() => { setTab('messages'); setSelectedConvo(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'messages'
                ? 'bg-[var(--card)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {t('fanInboxMessages')}
            {totalUnread > 0 && (
              <span className="ml-1.5 bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab('broadcasts'); setSelectedConvo(null); }}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              tab === 'broadcasts'
                ? 'bg-[var(--card)] text-[var(--foreground)]'
                : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {t('fanInboxBroadcasts')}
            {unreadBroadcasts > 0 && (
              <span className="ml-1.5 bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {unreadBroadcasts}
              </span>
            )}
          </button>
        </div>
      </FadeUp>

      {/* Messages Tab */}
      {tab === 'messages' && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
            <div className="flex h-full">
              {/* Conversation List */}
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
                      <button
                        key={convo.id}
                        onClick={() => setSelectedConvo(convo.id)}
                        className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                          selectedConvo === convo.id ? 'bg-[var(--muted)]' : ''
                        }`}
                      >
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

              {/* Message Area */}
              <div className={`${selectedConvo ? 'flex' : 'hidden sm:flex'} flex-col flex-1 min-w-0`}>
                {selectedConvo && selectedConversation ? (
                  <>
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                      <button
                        onClick={() => setSelectedConvo(null)}
                        className="sm:hidden text-[var(--muted-foreground)]"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <Link
                        href={`/${locale}/artists/${selectedConversation.artist_id}`}
                        className="text-sm font-semibold hover:text-[var(--color-gold)] transition-colors"
                      >
                        {selectedConversation.artist_name}
                      </Link>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map((msg) => {
                        const isMe = msg.sender_id === user.id;
                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                              isMe
                                ? 'bg-[var(--color-gold)]/15 text-[var(--foreground)]'
                                : 'bg-[var(--muted)] text-[var(--foreground)]'
                            }`}>
                              <p className="whitespace-pre-wrap break-words">{msg.body}</p>
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
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                          placeholder={t('typeMessage')}
                          className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
                        />
                        <button
                          onClick={handleSend}
                          disabled={!newMessage.trim() || sending}
                          className="px-4 py-2.5 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30"
                        >
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
                <div
                  key={`${bc.id}-${bc.delivery_id}`}
                  className={`bg-[var(--card)] border rounded-2xl p-5 transition-colors ${
                    bc.read_at ? 'border-[var(--border)]' : 'border-[var(--color-gold)]/20'
                  }`}
                  onClick={() => !bc.read_at && markBroadcastRead(bc.delivery_id)}
                >
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
                        <Link
                          href={`/${locale}/artists/${bc.artist_id}`}
                          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--color-gold)] transition-colors"
                        >
                          {t('fromArtist', { name: bc.artist_name || '' })}
                        </Link>
                        <div className="flex items-center gap-2">
                          {!bc.read_at && (
                            <span className="w-2 h-2 rounded-full bg-[var(--color-gold)]" />
                          )}
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {new Date(bc.sent_at).toLocaleDateString()}
                          </span>
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
    </div>
  );
}
