'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useAdmin } from '@/components/AdminProvider';
import { createClient } from '@/utils/supabase/client';

type Tab = 'notifications' | 'messages';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  reference_type: string | null;
  reference_id: string | null;
  read_at: string | null;
  created_at: string;
}

interface HQConversation {
  id: string;
  fan_user_id: string;
  user_display: string | null;
  user_avatar: string | null;
  unread_count: number;
  last_message: string | null;
  last_message_at: string;
}

interface GuestContact {
  id: string;
  name: string;
  email: string;
  message: string;
  read_at: string | null;
  created_at: string;
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

function TypeBadge({ type }: { type: string }) {
  const styles: Record<string, string> = {
    new_member: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
    claim_status: 'bg-amber-400/10 text-amber-400 border-amber-400/20',
    system: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    general: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${styles[type] || styles.general}`}>
      {type}
    </span>
  );
}

function TranslateButton({ text, locale }: { text: string; locale: string }) {
  const [translated, setTranslated] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [show, setShow] = useState(false);

  const handleTranslate = async () => {
    if (translated) {
      setShow(!show);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/translate-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLocale: locale }),
      });
      const data = await res.json();
      if (data.translated) {
        setTranslated(data.translated);
        setShow(true);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div>
      <button
        onClick={handleTranslate}
        disabled={loading}
        className="text-[var(--muted-foreground)]/50 hover:text-[var(--color-gold)] transition-colors disabled:opacity-30"
        title="Translate"
      >
        {loading ? (
          <div className="w-3.5 h-3.5 border border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin" />
        ) : (
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        )}
      </button>
      {show && translated && (
        <p className="text-xs text-[var(--muted-foreground)]/60 mt-1 italic">{translated}</p>
      )}
    </div>
  );
}

export default function AdminInboxPage() {
  const { token } = useAdmin();
  const locale = useLocale();
  const t = useTranslations('adminHQ');

  const [tab, setTab] = useState<Tab>('notifications');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [conversations, setConversations] = useState<HQConversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingNotifs, setLoadingNotifs] = useState(true);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [guestContacts, setGuestContacts] = useState<GuestContact[]>([]);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch notifications + Realtime subscription
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/notifications?limit=50', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unread || 0);
        }
      } catch {}
      if (!cancelled) setLoadingNotifs(false);
    })();

    // Realtime: listen for new admin notifications
    const supabase = createClient();
    const channel = supabase
      .channel('admin-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev]);
          if (!n.read_at) setUnreadCount((prev) => prev + 1);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [token]);

  // Fetch HQ conversations
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/conversations', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setConversations(data.conversations || []);
      } catch {}
      if (!cancelled) setLoadingConvos(false);
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Fetch guest contacts
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/admin/guest-contacts', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) setGuestContacts(data.contacts || []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Mark guest contact as read
  const markGuestRead = useCallback(async (id: string) => {
    if (!token) return;
    await fetch('/api/admin/guest-contacts', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    setGuestContacts((prev) => prev.map((g) => g.id === id ? { ...g, read_at: new Date().toISOString() } : g));
  }, [token]);

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedConvo || !token) return;
    let cancelled = false;
    (async () => {
      try {
        // Use admin client to fetch messages directly
        const res = await fetch(`/api/admin/conversations?convoId=${selectedConvo}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        // For now, we fetch all conversations and find messages via client
        // TODO: Add dedicated messages endpoint if needed
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [selectedConvo, token]);

  // Fetch messages when selecting a conversation (using Supabase client directly won't work for admin)
  // We'll use a simple approach: fetch via the conversations API
  const fetchMessages = useCallback(async (convoId: string) => {
    if (!token) return;
    try {
      const { createClient } = await import('@/utils/supabase/client');
      const supabase = createClient();
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', convoId)
        .order('created_at', { ascending: true });

      if (data) {
        // Enrich with sender display names
        const senderIds = [...new Set(data.map((m) => m.sender_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, display_name, username')
          .in('id', senderIds);
        const profileMap = new Map((profiles || []).map((p) => [p.id, p.display_name || p.username || 'Unknown']));

        setMessages(data.map((m) => ({
          ...m,
          sender_display: profileMap.get(m.sender_id) || 'Unknown',
        })));
      }
    } catch {}
  }, [token]);

  useEffect(() => {
    if (selectedConvo) fetchMessages(selectedConvo);
  }, [selectedConvo, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Mark all notifications as read
  const markAllRead = async () => {
    if (!token) return;
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ markAllRead: true }),
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() })));
    setUnreadCount(0);
  };

  // Mark single notification as read
  const markRead = async (id: string) => {
    if (!token) return;
    await fetch('/api/admin/notifications', {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [id] }),
    });
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));
    setUnreadCount((prev) => Math.max(0, prev - 1));
  };

  // Send message as admin
  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !selectedConvo || !token || sending) return;
    setSending(true);
    try {
      const res = await fetch('/api/admin/conversations', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversationId: selectedConvo, body: newMessage.trim() }),
      });
      const data = await res.json();
      if (data.message) {
        setMessages((prev) => [...prev, { ...data.message, sender_display: 'You' }]);
        setNewMessage('');
      }
    } catch {}
    setSending(false);
  }, [newMessage, selectedConvo, token, sending]);

  const selectedConversation = conversations.find((c) => c.id === selectedConvo);
  const selectedGuestContact = guestContacts.find((g) => g.id === selectedGuest);
  const totalMsgUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
  const guestUnread = guestContacts.filter((g) => !g.read_at).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold">{t('inboxTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">{t('inboxDescription')}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1 w-fit">
        <button
          onClick={() => { setTab('notifications'); setSelectedConvo(null); }}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'notifications'
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {t('inboxNotifications')}
          {unreadCount > 0 && (
            <span className="ml-1.5 bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {unreadCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setTab('messages')}
          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
            tab === 'messages'
              ? 'bg-[var(--card)] text-[var(--foreground)]'
              : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
          }`}
        >
          {t('inboxMessages')}
          {(totalMsgUnread + guestUnread) > 0 && (
            <span className="ml-1.5 bg-[var(--color-gold)] text-[#0A0A0A] text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {totalMsgUnread + guestUnread}
            </span>
          )}
        </button>
      </div>

      {/* Notifications Tab */}
      {tab === 'notifications' && (
        <div className="space-y-4">
          {unreadCount > 0 && (
            <div className="flex justify-end">
              <button
                onClick={markAllRead}
                className="text-xs text-[var(--color-gold)] hover:underline uppercase tracking-widest"
              >
                {t('markAllRead')}
              </button>
            </div>
          )}

          {loadingNotifs ? (
            <div className="py-12 text-center">
              <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
              <p className="text-sm text-[var(--muted-foreground)]">{t('noNotifications')}</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
              {notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`px-5 py-4 transition-colors cursor-pointer hover:bg-[var(--muted)]/50 ${
                    !notif.read_at ? 'bg-[var(--color-gold)]/[0.02]' : ''
                  }`}
                  onClick={() => !notif.read_at && markRead(notif.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {!notif.read_at && (
                          <span className="w-2 h-2 rounded-full bg-[var(--color-gold)] shrink-0" />
                        )}
                        <p className="text-sm font-semibold truncate">{notif.title}</p>
                        <TypeBadge type={notif.type} />
                      </div>
                      {notif.body && (
                        <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{notif.body}</p>
                      )}
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
      )}

      {/* Messages Tab */}
      {tab === 'messages' && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden" style={{ height: 'calc(100vh - 320px)', minHeight: '400px' }}>
          <div className="flex h-full">
            {/* Conversation List */}
            <div className={`${(selectedConvo || selectedGuest) ? 'hidden sm:flex' : 'flex'} flex-col w-full sm:w-72 border-r border-[var(--border)] shrink-0`}>
              <div className="px-4 py-3 border-b border-[var(--border)]">
                <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">
                  {t('memberMessages')}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto">
                {loadingConvos ? (
                  <div className="p-6 text-center">
                    <div className="w-5 h-5 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
                  </div>
                ) : conversations.length === 0 && guestContacts.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-sm text-[var(--muted-foreground)]">{t('noMessages')}</p>
                  </div>
                ) : (
                  <>
                    {/* Guest contacts */}
                    {guestContacts.map((guest) => (
                      <button
                        key={`guest-${guest.id}`}
                        onClick={() => { setSelectedGuest(guest.id); setSelectedConvo(null); if (!guest.read_at) markGuestRead(guest.id); }}
                        className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                          selectedGuest === guest.id ? 'bg-[var(--muted)]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-orange-400/10 border border-orange-400/20 flex items-center justify-center text-xs text-orange-400 shrink-0 font-bold">
                            G
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <p className="text-sm font-semibold truncate">Guest · {guest.name}</p>
                              </div>
                              {!guest.read_at && (
                                <span className="w-2.5 h-2.5 rounded-full bg-orange-400 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">{guest.message}</p>
                          </div>
                        </div>
                      </button>
                    ))}
                    {/* Member HQ conversations */}
                    {conversations.map((convo) => (
                      <button
                        key={convo.id}
                        onClick={() => { setSelectedConvo(convo.id); setSelectedGuest(null); }}
                        className={`w-full text-left px-4 py-3 border-b border-[var(--border)] hover:bg-[var(--muted)] transition-colors ${
                          selectedConvo === convo.id ? 'bg-[var(--muted)]' : ''
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {convo.user_avatar ? (
                            <img src={convo.user_avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-[var(--background)] flex items-center justify-center text-xs text-[var(--muted-foreground)] shrink-0">
                              {(convo.user_display || '?').charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-semibold truncate">{convo.user_display || 'Unknown'}</p>
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
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* Message Area */}
            <div className={`${(selectedConvo || selectedGuest) ? 'flex' : 'hidden sm:flex'} flex-col flex-1 min-w-0`}>
              {/* Guest contact detail */}
              {selectedGuest && selectedGuestContact ? (
                <>
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                    <button
                      onClick={() => setSelectedGuest(null)}
                      className="sm:hidden text-[var(--muted-foreground)]"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-orange-400/10 border border-orange-400/20 flex items-center justify-center text-xs text-orange-400 font-bold">G</div>
                      <span className="text-sm font-semibold">Guest · {selectedGuestContact.name}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    <div className="flex justify-start">
                      <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-[var(--muted)] text-[var(--foreground)]">
                        <div className="flex items-start gap-2">
                          <p className="text-sm whitespace-pre-wrap break-words flex-1">{selectedGuestContact.message}</p>
                          <TranslateButton text={selectedGuestContact.message} locale={locale} />
                        </div>
                        <p className="text-[10px] text-[var(--muted-foreground)]/50 mt-1.5">
                          {new Date(selectedGuestContact.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="border border-[var(--border)] rounded-xl p-4 space-y-2 bg-[var(--background)]/50">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted-foreground)]">Guest Info</p>
                      <div className="flex items-center gap-2 text-sm">
                        <svg className="w-4 h-4 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                        <a href={`mailto:${selectedGuestContact.email}`} className="text-gold hover:text-[var(--color-gold-bright)] underline underline-offset-2 transition-colors">
                          {selectedGuestContact.email}
                        </a>
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)]">Reply to this guest via email.</p>
                    </div>
                  </div>
                </>
              ) : selectedConvo && selectedConversation ? (
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
                    <div className="flex items-center gap-2">
                      {selectedConversation.user_avatar ? (
                        <img src={selectedConversation.user_avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-[var(--muted)] flex items-center justify-center text-xs">
                          {(selectedConversation.user_display || '?').charAt(0)}
                        </div>
                      )}
                      <span className="text-sm font-semibold">{selectedConversation.user_display || 'Unknown'}</span>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {messages.map((msg) => {
                      const isAdmin = msg.sender_role === 'admin';
                      return (
                        <div key={msg.id} className={`flex ${isAdmin ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
                            isAdmin
                              ? 'bg-[var(--color-gold)]/15 text-[var(--foreground)]'
                              : 'bg-[var(--muted)] text-[var(--foreground)]'
                          }`}>
                            {isAdmin && msg.sender_display && (
                              <p className="text-[10px] text-[var(--color-gold)]/60 font-semibold mb-0.5">
                                JazzNode HQ · {msg.sender_display}
                              </p>
                            )}
                            <div className="flex items-start gap-2">
                              <p className="whitespace-pre-wrap break-words flex-1">{msg.body}</p>
                              <TranslateButton text={msg.body} locale={locale} />
                            </div>
                            <p className={`text-[10px] mt-1 ${isAdmin ? 'text-[var(--color-gold)]/50' : 'text-[var(--muted-foreground)]/50'}`}>
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
                        placeholder={t('typeReply')}
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
      )}
    </div>
  );
}
