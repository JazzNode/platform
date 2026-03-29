'use client';

import { useState, useEffect } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Link from 'next/link';
import Image from 'next/image';
import { useAdmin } from '@/components/AdminProvider';

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

const ROLE_OPTIONS = ['all', 'member', 'artist_manager', 'venue_manager', 'admin', 'owner'] as const;

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    owner: 'bg-red-400/10 text-red-400 border-red-400/20',
    admin: 'bg-purple-400/10 text-purple-400 border-purple-400/20',
    artist_manager: 'bg-[var(--color-gold)]/10 text-[var(--color-gold)] border-[var(--color-gold)]/20',
    venue_manager: 'bg-green-400/10 text-green-400 border-green-400/20',
    member: 'bg-gray-400/10 text-gray-400 border-gray-400/20',
  };
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-md font-medium border ${styles[role] || styles.member}`}>
      {role}
    </span>
  );
}

export default function AdminMembersPage() {
  const { token } = useAdmin();
  const locale = useLocale();
  const t = useTranslations('adminHQ');

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const limit = 20;

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (search) params.set('search', search);
    if (role !== 'all') params.set('role', role);

    (async () => {
      setLoading(true);
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
      if (!cancelled) setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [token, search, role, page]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <h1 className="font-serif text-3xl font-bold">{t('membersTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">
          {t('membersDescription', { count: total })}
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('memberSearchPlaceholder')}
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
              {t(`role_${r}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Members List */}
      {loading ? (
        <div className="py-12 text-center">
          <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
        </div>
      ) : members.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <p className="text-sm text-[var(--muted-foreground)]">{t('noMembers')}</p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
          {members.map((member) => (
            <div key={member.id}>
              <button
                onClick={() => setExpandedId(expandedId === member.id ? null : member.id)}
                className="w-full text-left px-5 py-4 hover:bg-[var(--muted)]/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  {member.avatar_url ? (
                    <Image src={member.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm text-[var(--muted-foreground)] shrink-0">
                      {(member.display_name || member.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold truncate">
                        {member.display_name || member.username || 'Unnamed'}
                      </p>
                      <RoleBadge role={member.role} />
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
                  <div className="text-right shrink-0">
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {new Date(member.created_at).toLocaleDateString()}
                    </p>
                  </div>
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
                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('memberBio')}</p>
                      <p className="text-sm text-[var(--foreground)] line-clamp-3">{member.bio}</p>
                    </div>
                  )}
                  {member.website && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('memberWebsite')}</p>
                      <a href={member.website} target="_blank" rel="noopener noreferrer" className="text-sm text-[var(--color-gold)] hover:underline">
                        {member.website}
                      </a>
                    </div>
                  )}
                  {member.claimed_artist_ids && member.claimed_artist_ids.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('claimedArtists')}</p>
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
                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('claimedVenues')}</p>
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
                      <p className="text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-widest mb-1">{t('memberSocials')}</p>
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
                  <Link
                    href={`/${locale}/u/${member.id}`}
                    className="inline-block text-xs text-[var(--color-gold)] hover:underline uppercase tracking-widest"
                  >
                    {t('viewProfile')} &rarr;
                  </Link>
                </div>
              )}
            </div>
          ))}
        </div>
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
    </div>
  );
}
