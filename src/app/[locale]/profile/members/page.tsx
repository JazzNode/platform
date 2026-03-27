'use client';

import { useState, useEffect, useCallback } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
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
  bio: string | null;
  website: string | null;
  social_links: Record<string, string> | null;
  claimed_artist_ids: string[] | null;
  claimed_venue_ids: string[] | null;
  email: string | null;
  created_at: string;
}

const SETTABLE_ROLES = ['member', 'artist_manager', 'venue_manager', 'editor', 'moderator', 'marketing', 'admin'] as const;
const ROLE_OPTIONS = ['all', 'member', 'artist_manager', 'venue_manager', 'editor', 'moderator', 'marketing', 'admin', 'owner'] as const;

const ROLE_STYLES: Record<string, string> = {
  owner: 'bg-red-400/10 text-red-400 border-red-400/20',
  admin: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
  editor: 'bg-blue-400/10 text-blue-400 border-blue-400/20',
  moderator: 'bg-orange-400/10 text-orange-400 border-orange-400/20',
  marketing: 'bg-pink-400/10 text-pink-400 border-pink-400/20',
  artist_manager: 'bg-[var(--color-gold)]/10 text-[var(--color-gold)] border-[var(--color-gold)]/20',
  venue_manager: 'bg-green-400/10 text-green-400 border-green-400/20',
  member: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
};

const ROLE_LABELS: Record<string, string> = {
  all: '全部',
  member: '會員',
  artist_manager: '藝人經理',
  venue_manager: '場地經理',
  editor: '編輯',
  moderator: '審核員',
  marketing: '行銷',
  admin: '管理員',
  owner: '擁有者',
};

export default function OwnerMembersPage() {
  const t = useTranslations('profile');
  const tHQ = useTranslations('adminHQ');
  const locale = useLocale();
  const router = useRouter();
  const { isOwner, token, getFreshToken } = useAdmin();
  const { profile, loading } = useAuth();

  const [members, setMembers] = useState<Member[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(true);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [role, setRole] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

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
    if (role !== 'all') params.set('role', role);

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
  }, [token, search, role, page]);

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

  const handleDeleteMember = useCallback(async (userId: string) => {
    setDeletingId(userId);
    try {
      const freshToken = await getFreshToken();
      if (!freshToken) return;

      const res = await fetch('/api/owner/delete-member', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${freshToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.id !== userId));
        setTotal((prev) => prev - 1);
        setConfirmDeleteId(null);
        setExpandedId(null);
        setToast(t('ownerMemberDeleted'));
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
    setDeletingId(null);
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

      {/* Search + Role Filters */}
      <FadeUp>
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('ownerSearchPlaceholder')}
              className="w-full bg-[var(--card)] border border-[var(--border)] rounded-xl px-4 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors"
            />
          </div>
          <div className="flex gap-1 bg-[var(--muted)] rounded-xl p-1 w-fit">
            {ROLE_OPTIONS.map((r) => (
              <button
                key={r}
                onClick={() => { setRole(r); setPage(1); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors capitalize ${
                  role === r
                    ? 'bg-[var(--card)] text-[var(--foreground)]'
                    : 'text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
                }`}
              >
                {tHQ(`role_${r}`)}
              </button>
            ))}
          </div>
        </div>
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
                <div key={member.id}>
                  <button
                    onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                    className="w-full text-left px-5 py-4 hover:bg-[var(--muted)]/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      {member.avatar_url ? (
                        <Image src={member.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0" />
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
                        <div className="flex items-center gap-3 mt-0.5">
                          {member.username && (
                            <p className="text-xs text-[var(--muted-foreground)]">@{member.username}</p>
                          )}
                          {member.email && (
                            <p className="text-xs text-[var(--muted-foreground)]">{member.email}</p>
                          )}
                        </div>
                      </div>

                      {/* Date */}
                      <div className="text-right shrink-0">
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {new Date(member.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      {/* Chevron */}
                      <svg
                        className={`w-4 h-4 text-[var(--muted-foreground)] transition-transform ${expandedId === member.id ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </div>
                  </button>

                  {/* Expanded Details */}
                  {expandedId === member.id && (
                    <div className="px-5 pb-4 pl-[4.5rem] space-y-3 border-t border-[var(--border)]/50 pt-3">
                      {member.bio && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{tHQ('memberBio')}</p>
                          <p className="text-sm text-[var(--foreground)] line-clamp-3">{member.bio}</p>
                        </div>
                      )}
                      {member.website && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{tHQ('memberWebsite')}</p>
                          <a href={member.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-gold)] hover:underline">
                            {member.website}
                          </a>
                        </div>
                      )}
                      {member.claimed_artist_ids && member.claimed_artist_ids.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{tHQ('claimedArtists')}</p>
                          <div className="flex flex-wrap gap-2">
                            {member.claimed_artist_ids.map((id) => (
                              <Link
                                key={id}
                                href={`/${locale}/artists/${id}`}
                                className="text-xs bg-[var(--color-gold)]/10 text-[var(--color-gold)] px-2.5 py-1 rounded-lg hover:bg-[var(--color-gold)]/20 transition-colors"
                              >
                                {id}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {member.claimed_venue_ids && member.claimed_venue_ids.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{tHQ('claimedVenues')}</p>
                          <div className="flex flex-wrap gap-2">
                            {member.claimed_venue_ids.map((id) => (
                              <Link
                                key={id}
                                href={`/${locale}/venues/${id}`}
                                className="text-xs bg-green-400/10 text-green-400 px-2.5 py-1 rounded-lg hover:bg-green-400/20 transition-colors"
                              >
                                {id}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                      {member.social_links && Object.keys(member.social_links).length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{tHQ('memberSocials')}</p>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(member.social_links).map(([key, url]) => (
                              <a
                                key={key}
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs bg-[var(--muted)] text-[var(--foreground)] px-2.5 py-1 rounded-lg hover:bg-[var(--muted)]/80 transition-colors capitalize"
                              >
                                {key}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Role Selector + Delete — only for non-owner targets, not self */}
                      {!isMe && !isTargetOwner && (
                        <div className="flex items-center gap-3 pt-2 border-t border-[var(--border)]/50">
                          <div className="flex items-center gap-2">
                            <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest">{t('ownerSetRole')}</p>
                            <select
                              value={member.role}
                              onChange={(e) => handleSetRole(member.id, e.target.value)}
                              disabled={updatingId === member.id}
                              className="bg-[var(--background)] border border-[var(--border)] rounded-lg px-2 py-1.5 text-xs text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors disabled:opacity-50 cursor-pointer [&>option]:bg-[var(--background)] [&>option]:text-[var(--foreground)]"
                            >
                              {SETTABLE_ROLES.map((r) => (
                                <option key={r} value={r}>
                                  {r}
                                </option>
                              ))}
                            </select>
                            {updatingId === member.id && (
                              <div className="w-4 h-4 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin shrink-0" />
                            )}
                          </div>

                          <div className="flex-1" />

                          {/* Delete Button */}
                          {confirmDeleteId === member.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-red-400">{t('ownerConfirmDelete')}</span>
                              <button
                                onClick={() => handleDeleteMember(member.id)}
                                disabled={deletingId === member.id}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 transition-colors"
                              >
                                {deletingId === member.id ? '...' : t('ownerDeleteConfirm')}
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--muted)] text-[var(--foreground)] hover:bg-[var(--muted)]/80 transition-colors"
                              >
                                {t('ownerDeleteCancel')}
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(member.id)}
                              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-400/10 transition-colors"
                            >
                              {t('ownerDeleteMember')}
                            </button>
                          )}
                        </div>
                      )}

                      {member.username && (
                        <Link
                          href={`/${locale}/user/${member.username}`}
                          className="inline-block text-xs text-[var(--color-gold)] hover:underline uppercase tracking-widest"
                        >
                          {tHQ('viewProfile')} &rarr;
                        </Link>
                      )}
                    </div>
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
