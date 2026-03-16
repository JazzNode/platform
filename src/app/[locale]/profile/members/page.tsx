'use client';

import { useState, useEffect, useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/components/AdminProvider';
import { useAuth } from '@/components/AuthProvider';
import FadeUp from '@/components/animations/FadeUp';

interface Member {
  id: string;
  display_name: string | null;
  username: string | null;
  handle: string | null;
  avatar_url: string | null;
  role: string;
  email: string | null;
  created_at: string;
}

const SETTABLE_ROLES = ['member', 'artist', 'venue_owner', 'admin'] as const;

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-red-400/10 text-red-400 border-red-400/20',
  admin: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  artist: 'bg-[var(--color-gold)]/10 text-[var(--color-gold)] border-[var(--color-gold)]/20',
  venue_owner: 'bg-green-400/10 text-green-400 border-green-400/20',
  member: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
};

export default function OwnerMembersPage() {
  const t = useTranslations('profile');
  const router = useRouter();
  const { isOwner, token, getFreshToken } = useAdmin();
  const { profile, loading } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Redirect if not owner
  useEffect(() => {
    if (!loading && (!profile || profile.role !== 'owner')) {
      router.push('/');
    }
  }, [loading, profile, router]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch members
  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    const params = new URLSearchParams({
      page: String(page),
      limit: '20',
    });
    if (search) params.set('search', search);

    (async () => {
      setLoadingMembers(true);
      try {
        const res = await fetch(`/api/admin/members?${params}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) {
          setMembers(data.members || []);
          setTotal(data.total || 0);
          setTotalPages(data.totalPages || 1);
        }
      } catch {}
      if (!cancelled) setLoadingMembers(false);
    })();

    return () => { cancelled = true; };
  }, [token, search, page]);

  const handleSetRole = useCallback(async (userId: string, newRole: string) => {
    setUpdatingId(userId);
    try {
      const freshToken = await getFreshToken();
      if (!freshToken) return;

      const res = await fetch('/api/owner/set-role', {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${freshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, role: newRole }),
      });

      if (res.ok) {
        setMembers((prev) =>
          prev.map((m) => (m.id === userId ? { ...m, role: newRole } : m)),
        );
        setToast(t('ownerRoleUpdated'));
        setTimeout(() => setToast(null), 2000);
      } else {
        const data = await res.json();
        setToast(data.error || 'Error');
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast('Network error');
      setTimeout(() => setToast(null), 3000);
    }
    setUpdatingId(null);
  }, [getFreshToken, t]);

  if (loading || !profile || profile.role !== 'owner') {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <FadeUp>
        <div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold">{t('ownerMembersTitle')}</h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            {t('ownerMembersDescription', { count: total })}
          </p>
        </div>
      </FadeUp>

      {/* Search */}
      <FadeUp>
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder={t('ownerSearchPlaceholder')}
          className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
        />
      </FadeUp>

      {/* Members List */}
      {loadingMembers ? (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">{t('ownerNoMembers')}</p>
        </div>
      ) : (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
            {members.map((member) => {
              const isMe = member.id === profile.id;
              const isTargetOwner = member.role === 'owner';

              return (
                <div key={member.id} className="px-5 py-4 flex items-center gap-4">
                  {/* Avatar */}
                  {member.avatar_url ? (
                    <img src={member.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm text-[var(--muted-foreground)] shrink-0">
                      {(member.display_name || member.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {member.display_name || member.username || 'Unnamed'}
                      </p>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${ROLE_STYLES[member.role] || ROLE_STYLES.member}`}>
                        {member.role}
                      </span>
                      {isMe && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--muted)] text-[var(--muted-foreground)]">you</span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 truncate">
                      {member.email || member.username ? `@${member.username}` : ''}
                    </p>
                  </div>

                  {/* Role Selector — only show for non-owner targets, not self */}
                  {!isMe && !isTargetOwner && (
                    <div className="shrink-0">
                      <select
                        value={member.role}
                        onChange={(e) => handleSetRole(member.id, e.target.value)}
                        disabled={updatingId === member.id}
                        className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {SETTABLE_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {updatingId === member.id && (
                    <div className="w-4 h-4 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </FadeUp>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80 disabled:opacity-30 transition-all"
          >
            &larr;
          </button>
          <span className="text-xs text-[var(--muted-foreground)]">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80 disabled:opacity-30 transition-all"
          >
            &rarr;
          </button>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
