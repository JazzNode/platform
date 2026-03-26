'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/components/AuthProvider';
import { useTierConfig } from '@/components/TierConfigProvider';
import { createClient } from '@/utils/supabase/client';
import FadeUp from '@/components/animations/FadeUp';
import BroadcastBubble from '@/components/inbox/BroadcastBubble';
import NotificationList from '@/components/inbox/NotificationList';

type Tab = 'messages' | 'notifications';
type NotifView = 'active' | 'archived';

interface Conversation {
  id: string;
  artist_id: string;
  fan_user_id: string;
  last_message_at: string;
  artist_archived: boolean;
  fan_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string | null;
  };
  last_message?: string;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  broadcast_id: string | null;
  body: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
}

export default function InboxPage({ params }: { params: Promise<{ slug: string }> }) {
  const t = useTranslations('artistStudio');
  const { user, loading } = useAuth();
  const { isUnlocked } = useTierConfig();

  const [slug, setSlug] = useState('');
  const [tier, setTier] = useState(0);
  const [tab, setTab] = useState<Tab>('messages');
  const [notifView, setNotifView] = useState<NotifView>('active');
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [fetching, setFetching] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isComposingRef = useRef(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifsLoading, setNotifsLoading] = useState(true);
  const [archivedNotifs, setArchivedNotifs] = useState<NotificationItem[]>([]);
  const [loadingArchived, setLoadingArchived] = useState(false);
  const [archivedFetched, setArchivedFetched] = useState(false);

  useEffect(() => {
    params.then((p) => setSlug(decodeURIComponent(p.slug)));
  }, [params]);

  // Fetch artist tier
  useEffect(() => {
    if (!slug) return;
    const supabase = createClient();
    supabase.from('artists').select('tier').eq('artist_id', slug).single()
      .then(({ data }) => { if (data) setTier(data.tier); });
  }, [slug]);

  // Fetch conversations
  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();

    supabase
      .from('conversations')
      .select('id, artist_id, fan_user_id, last_message_at, artist_archived')
      .eq('artist_id', slug)
      .eq('artist_archived', false)
      .order('last_message_at', { ascending: false })
      .then(async ({ data: convos }) => {
        if (!convos || convos.length === 0) {
          setConversations([]);
          setFetching(false);
          return;
        }

        // Fetch fan profiles
        const fanIds = convos.map((c) => c.fan_user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, username')
          .in('id', fanIds);

        const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

        // Fetch unread counts and last messages
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

            return {
              ...convo,
              fan_profile: profileMap.get(convo.fan_user_id) || undefined,
              last_message: lastMsg?.body,
              unread_count: count || 0,
            };
          })
        );

        setConversations(enriched);
        setFetching(false);
      });
  }, [slug, user]);

  // Fetch notifications for this artist + Realtime
  useEffect(() => {
    if (!slug || !user) return;
    const supabase = createClient();

    supabase
      .from('notifications')
      .select('id, title, body, type, read_at, created_at')
      .eq('user_id', user.id)
      .eq('reference_type', 'artist')
      .eq('reference_id', slug)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        setNotifications(data || []);
        setNotifsLoading(false);
      });

    // Realtime: listen for new artist notifications
    const channel = supabase
      .channel(`artist-notifications-${slug}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as NotificationItem & { reference_type?: string; reference_id?: string };
          if (n.reference_type === 'artist' && n.reference_id === slug) {
            setNotifications((prev) => [{ id: n.id, title: n.title, body: n.body, type: n.type, read_at: n.read_at, created_at: n.created_at }, ...prev]);
          }
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
          const updated = payload.new as NotificationItem & { reference_type?: string; reference_id?: string };
          if (updated.reference_type === 'artist' && updated.reference_id === slug) {
            setNotifications((prev) => prev.map((n) => n.id === updated.id ? { id: updated.id, title: updated.title, body: updated.body, type: updated.type, read_at: updated.read_at, created_at: updated.created_at } : n));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [slug, user]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConvo || !user) return;
    const supabase = createClient();

    supabase
      .from('messages')
      .select('id, conversation_id, sender_id, broadcast_id, body, read_at, created_at')
      .eq('conversation_id', selectedConvo)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) setMessages(data);
      });

    // Mark unread messages as read
    supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', selectedConvo)
      .neq('sender_id', user.id)
      .is('read_at', null)
      .then(() => {
        // Update unread count in conversation list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvo ? { ...c, unread_count: 0 } : c
          )
        );
        // Notify header badge to refresh unread count
        window.dispatchEvent(new Event('inbox:read'));
      });
  }, [selectedConvo, user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConvo || !user || sending) return;
    setSending(true);

    const supabase = createClient();
    const body = newMessage.trim();
    setNewMessage('');

    try {
      const { data: msg, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: selectedConvo,
          sender_id: user.id,
          body,
        })
        .select()
        .single();

      if (error) {
        console.error('Send message failed:', error);
        setNewMessage(body);
        alert(t('sendFailed') ?? 'Failed to send message');
      } else if (msg) {
        setMessages((prev) => [...prev, msg]);

        // Update conversation's last_message_at
        await supabase
          .from('conversations')
          .update({ last_message_at: new Date().toISOString() })
          .eq('id', selectedConvo);

        setConversations((prev) =>
          prev.map((c) =>
            c.id === selectedConvo
              ? { ...c, last_message_at: new Date().toISOString(), last_message: body }
              : c
          )
        );
      }
    } catch (err) {
      console.error('Send message error:', err);
      setNewMessage(body);
      alert(t('sendFailed') ?? 'Failed to send message');
    } finally {
      setSending(false);
    }
  }, [newMessage, selectedConvo, user, sending]);

  const markNotifRead = useCallback(async (id: string) => {
    if (!user) return;
    const supabase = createClient();
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    window.dispatchEvent(new Event('inbox:read'));
  }, [user]);

  const markAllNotifsRead = useCallback(async () => {
    if (!user || !slug) return;
    const supabase = createClient();
    const unreadIds = notifications.filter((n) => !n.read_at).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).in('id', unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    window.dispatchEvent(new Event('inbox:read'));
  }, [user, slug, notifications]);

  const archiveNotifications = useCallback(async (ids: string[]) => {
    if (!user || ids.length === 0) return;
    const supabase = createClient();
    await supabase.from('notifications').update({ archived_at: new Date().toISOString() }).in('id', ids);
    const archived = notifications.filter((n) => ids.includes(n.id));
    setNotifications((prev) => prev.filter((n) => !ids.includes(n.id)));
    setArchivedNotifs((prev) => [...archived, ...prev]);
    window.dispatchEvent(new Event('inbox:read'));
  }, [user, notifications]);

  const archiveAllNotifications = useCallback(async () => {
    if (!user) return;
    const supabase = createClient();
    const allIds = notifications.map((n) => n.id);
    if (allIds.length === 0) return;
    await supabase.from('notifications').update({ archived_at: new Date().toISOString() }).in('id', allIds);
    setArchivedNotifs((prev) => [...notifications, ...prev]);
    setNotifications([]);
    window.dispatchEvent(new Event('inbox:read'));
  }, [user, notifications]);

  const fetchArchived = useCallback(async () => {
    if (!user || !slug || archivedFetched) return;
    setLoadingArchived(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, type, read_at, created_at')
      .eq('user_id', user.id)
      .eq('reference_type', 'artist')
      .eq('reference_id', slug)
      .not('archived_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(50);
    setArchivedNotifs(data || []);
    setLoadingArchived(false);
    setArchivedFetched(true);
  }, [user, slug, archivedFetched]);

  if (loading || fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!isUnlocked('artist', 'inbox', tier)) {
    return (
      <div className="py-24 text-center text-[var(--muted-foreground)]">
        <p>{t('featureNotAvailable')}</p>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);
  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const unreadNotifs = notifications.filter((n) => !n.read_at).length;

  return (
    <div className="space-y-4">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('inbox')}</h1>
      </FadeUp>

      {/* Tabs */}
      <FadeUp>
        <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1">
          {([
            { key: 'messages' as Tab, label: t('inboxMessages'), badge: totalUnread },
            { key: 'notifications' as Tab, label: t('inboxNotifications'), badge: unreadNotifs },
          ]).map(({ key, label, badge }) => (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                setSelectedConvo(null);
                if (key === 'notifications') setNotifView('active');
              }}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
                tab === key
                  ? 'bg-[var(--card)] text-[var(--foreground)]'
                  : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
              }`}
            >
              {label}
              {badge > 0 && (
                <span className="bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </FadeUp>

      {/* Messages Tab */}
      {tab === 'messages' && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 280px)', minHeight: '400px' }}>
            <div className="flex h-full">
              {/* Conversation List */}
              <div className={`${selectedConvo ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-72 lg:w-80 border-r border-[var(--border)] shrink-0`}>
                <div className="p-4 border-b border-[var(--border)]">
                  <p className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">
                    {t('conversations')} ({conversations.length})
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-6 text-center">
                      <p className="text-sm text-[var(--muted-foreground)]">{t('noConversations')}</p>
                      <p className="text-xs text-[var(--muted-foreground)]/60 mt-1">{t('noConversationsHint')}</p>
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
                          {convo.fan_profile?.avatar_url ? (
                            <img
                              src={convo.fan_profile.avatar_url}
                              alt=""
                              className="w-9 h-9 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[var(--background)] flex items-center justify-center text-xs text-[var(--muted-foreground)] shrink-0">
                              {(convo.fan_profile?.display_name || '?').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold truncate">
                                {convo.fan_profile?.display_name || convo.fan_profile?.username || t('anonymous')}
                              </p>
                              {convo.unread_count > 0 && (
                                <span className="bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0">
                                  {convo.unread_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">
                              {convo.last_message || '...'}
                            </p>
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
                    {/* Header */}
                    <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                      <button
                        onClick={() => setSelectedConvo(null)}
                        className="sm:hidden text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                      >
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="15 18 9 12 15 6" />
                        </svg>
                      </button>
                      <p className="text-sm font-semibold">
                        {selectedConversation.fan_profile?.display_name ||
                          selectedConversation.fan_profile?.username ||
                          t('anonymous')}
                      </p>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {messages.map((msg) => {
                        const isMe = msg.sender_id === user?.id;

                        if (msg.broadcast_id && isMe) {
                          return (
                            <div key={msg.id} className="flex justify-end">
                              <BroadcastBubble body={msg.body} createdAt={msg.created_at} />
                            </div>
                          );
                        }

                        return (
                          <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                                isMe
                                  ? 'bg-[var(--color-gold)]/15 text-[var(--foreground)]'
                                  : 'bg-[var(--muted)] text-[var(--foreground)]'
                              }`}
                            >
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

                    {/* Input */}
                    <div className="p-3 border-t border-[var(--border)]">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onCompositionStart={() => { isComposingRef.current = true; }}
                          onCompositionEnd={() => { isComposingRef.current = false; }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey && !isComposingRef.current) {
                              e.preventDefault();
                              handleSend();
                            }
                          }}
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
                    <div className="text-center">
                      <svg className="w-12 h-12 text-[var(--muted-foreground)]/20 mx-auto mb-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="22 12 16 12 14 15 10 15 8 12 2 12" />
                        <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
                      </svg>
                      <p className="text-sm text-[var(--muted-foreground)]">{t('selectConversation')}</p>
                    </div>
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
            {/* Sub-view toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setNotifView('active')}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  notifView === 'active'
                    ? 'border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/[0.05]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {t('inboxNotifications')}
              </button>
              <button
                onClick={() => { setNotifView('archived'); fetchArchived(); }}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors inline-flex items-center gap-1.5 ${
                  notifView === 'archived'
                    ? 'border-[var(--color-gold)]/30 text-[var(--color-gold)] bg-[var(--color-gold)]/[0.05]'
                    : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="21 8 21 21 3 21 3 8" />
                  <rect x="1" y="3" width="22" height="5" />
                  <line x1="10" y1="12" x2="14" y2="12" />
                </svg>
                {t('archived')}
              </button>
            </div>

            {notifView === 'active' ? (
              <NotificationList
                notifications={notifications}
                loading={notifsLoading}
                accent="gold"
                labels={{
                  noNotifications: t('noNotifications'),
                  markAllRead: t('markAllRead'),
                  archiveSelected: t('archiveSelected'),
                  archiveAll: t('archiveAll'),
                  selectAll: t('selectMode'),
                  deselectAll: t('deselectAll'),
                  selected: t('nSelected'),
                  confirmArchiveTitle: t('confirmArchiveTitle'),
                  confirmArchiveBody: t('confirmArchiveBody'),
                  confirmYes: t('confirmYes'),
                  cancel: t('cancel'),
                }}
                onMarkRead={markNotifRead}
                onMarkAllRead={markAllNotifsRead}
                onArchive={archiveNotifications}
                onArchiveAll={archiveAllNotifications}
              />
            ) : (
              <NotificationList
                notifications={archivedNotifs}
                loading={loadingArchived}
                accent="gold"
                isArchiveView
                labels={{
                  noNotifications: t('noArchivedNotifications'),
                  markAllRead: t('markAllRead'),
                  archiveSelected: t('archiveSelected'),
                  archiveAll: t('archiveAll'),
                  selectAll: t('selectMode'),
                  deselectAll: t('deselectAll'),
                  selected: t('nSelected'),
                  confirmArchiveTitle: t('confirmArchiveTitle'),
                  confirmArchiveBody: t('confirmArchiveBody'),
                  confirmYes: t('confirmYes'),
                  cancel: t('cancel'),
                }}
                onMarkRead={() => {}}
                onMarkAllRead={() => {}}
                onArchive={() => {}}
                onArchiveAll={() => {}}
              />
            )}
          </div>
        </FadeUp>
      )}
    </div>
  );
}
