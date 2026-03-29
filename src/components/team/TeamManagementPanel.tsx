'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { useAuth } from '@/components/AuthProvider';
import FadeUp from '@/components/animations/FadeUp';

type TeamRole = 'owner' | 'admin' | 'editor' | 'viewer';

interface TeamMember {
  id: string;
  user_id: string;
  role: TeamRole;
  status: 'pending' | 'accepted' | 'removed';
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  email: string | null;
  is_billing: boolean;
}

interface TeamManagementPanelProps {
  entityType: 'artist' | 'venue';
  entityId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  t: (key: string, values?: any) => string;
}

const ROLE_COLORS: Record<TeamRole, string> = {
  owner: 'bg-purple-400/15 text-purple-400 border-purple-400/30',
  admin: 'bg-amber-400/15 text-amber-400 border-amber-400/30',
  editor: 'bg-blue-400/15 text-blue-400 border-blue-400/30',
  viewer: 'bg-zinc-400/15 text-zinc-400 border-zinc-400/30',
};

const ASSIGNABLE_ROLES: TeamRole[] = ['admin', 'editor', 'viewer'];

export default function TeamManagementPanel({ entityType, entityId, t }: TeamManagementPanelProps) {
  const { user } = useAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [fetching, setFetching] = useState(true);
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamRole>('editor');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [changingRole, setChangingRole] = useState<string | null>(null);
  const [transferTarget, setTransferTarget] = useState<string | null>(null);
  const [transferConfirming, setTransferConfirming] = useState(false);

  const idParam = entityType === 'artist' ? 'artistId' : 'venueId';
  const apiBase = `/api/${entityType}/team`;

  const currentMember = members.find((m) => m.user_id === user?.id);
  const isOwner = currentMember?.role === 'owner';
  const isAdmin = currentMember?.role === 'admin';
  const canManage = isOwner || isAdmin;

  const fetchTeam = useCallback(async () => {
    if (!entityId) return;
    try {
      const res = await fetch(`${apiBase}?${idParam}=${entityId}`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch {}
    setFetching(false);
  }, [entityId, apiBase, idParam]);

  useEffect(() => {
    if (entityId && user) fetchTeam();
  }, [entityId, user, fetchTeam]);

  const clearMessages = () => { setError(''); setSuccess(''); };

  const handleInvite = useCallback(async () => {
    if (!email.trim() || adding) return;
    setAdding(true);
    clearMessages();
    try {
      const body: Record<string, string> = { email: email.trim(), role: inviteRole };
      body[idParam === 'artistId' ? 'artistId' : 'venueId'] = entityId;
      const res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        setEmail('');
        setSuccess(t('memberInvited'));
        setTimeout(() => setSuccess(''), 3000);
        fetchTeam();
      } else {
        setError(data.error || 'Failed');
      }
    } catch { setError('Network error'); }
    setAdding(false);
  }, [email, inviteRole, entityId, adding, apiBase, idParam, fetchTeam, t]);

  const handleRemove = useCallback(async (userId: string) => {
    clearMessages();
    const body: Record<string, string> = { userId };
    body[idParam === 'artistId' ? 'artistId' : 'venueId'] = entityId;
    const res = await fetch(apiBase, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      fetchTeam();
    } else {
      setError(data.error || 'Failed');
      setTimeout(() => setError(''), 3000);
    }
  }, [entityId, apiBase, idParam, fetchTeam]);

  const handleChangeRole = useCallback(async (userId: string, newRole: TeamRole) => {
    clearMessages();
    setChangingRole(null);
    const body: Record<string, string> = { userId, role: newRole };
    body[idParam === 'artistId' ? 'artistId' : 'venueId'] = entityId;
    const res = await fetch(apiBase, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      fetchTeam();
    } else {
      setError(data.error || 'Failed');
      setTimeout(() => setError(''), 3000);
    }
  }, [entityId, apiBase, idParam, fetchTeam]);

  const handleTransfer = useCallback(async () => {
    if (!transferTarget) return;
    clearMessages();
    setTransferConfirming(true);
    const res = await fetch('/api/team/transfer-ownership', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ entityType, entityId, newOwnerUserId: transferTarget }),
    });
    const data = await res.json();
    if (res.ok) {
      setTransferTarget(null);
      setSuccess('Ownership transferred.');
      setTimeout(() => setSuccess(''), 3000);
      fetchTeam();
    } else {
      setError(data.error || 'Failed');
    }
    setTransferConfirming(false);
  }, [transferTarget, entityType, entityId, fetchTeam]);

  if (fetching) {
    return (
      <div className="py-24 text-center">
        <div className="w-6 h-6 border-2 border-[var(--color-gold)]/30 border-t-[var(--color-gold)] rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  const inputClass = 'w-full bg-[var(--background)] border border-[var(--border)] rounded-xl px-4 py-3 text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]/40 focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors text-sm';

  return (
    <div className="space-y-6">
      <FadeUp>
        <h1 className="font-serif text-2xl sm:text-3xl font-bold">{t('teamTitle')}</h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-2">{t('teamDescription')}</p>
      </FadeUp>

      {error && (
        <FadeUp>
          <div className="bg-red-400/10 border border-red-400/20 rounded-xl px-4 py-3 text-xs text-red-400">{error}</div>
        </FadeUp>
      )}
      {success && (
        <FadeUp>
          <div className="bg-emerald-400/10 border border-emerald-400/20 rounded-xl px-4 py-3 text-xs text-emerald-400">{success}</div>
        </FadeUp>
      )}

      {/* Invite member */}
      {canManage && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-[var(--muted-foreground)] font-bold">{t('inviteMember')}</h2>
            <div className="flex gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearMessages(); }}
                className={inputClass}
                placeholder={t('memberEmailPlaceholder')}
                onKeyDown={(e) => { if (e.key === 'Enter') handleInvite(); }}
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as TeamRole)}
                className="bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--color-gold)]/50 transition-colors shrink-0"
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r} value={r}>{t(`role${r.charAt(0).toUpperCase() + r.slice(1)}`)}</option>
                ))}
              </select>
              <button
                onClick={handleInvite}
                disabled={!email.trim() || adding}
                className="px-6 py-3 rounded-xl bg-[var(--color-gold)] text-[#0A0A0A] font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
              >
                {adding ? '...' : t('addBtn')}
              </button>
            </div>
          </div>
        </FadeUp>
      )}

      {/* Member list */}
      <FadeUp>
        <div className="space-y-3">
          {members.map((m) => {
            const isMe = m.user_id === user?.id;
            const showActions = canManage && !isMe && m.role !== 'owner';
            const canChangeToAdmin = isOwner; // only owner can assign admin role

            return (
              <div key={m.id} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
                <div className="flex items-center gap-4">
                  {/* Avatar */}
                  {m.avatar_url ? (
                    <Image src={m.avatar_url} alt="" width={40} height={40} className="w-10 h-10 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-[var(--muted)] flex items-center justify-center text-sm text-[var(--muted-foreground)] shrink-0">
                      {(m.display_name || m.email || '?').charAt(0).toUpperCase()}
                    </div>
                  )}

                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">
                      {m.display_name || 'Unknown'}
                      {isMe && <span className="ml-1.5 text-[var(--muted-foreground)] font-normal">({t('you')})</span>}
                    </p>
                    {m.email && <p className="text-xs text-[var(--muted-foreground)] truncate">{m.email}</p>}
                  </div>

                  {/* Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    {m.is_billing && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-400/15 text-emerald-400 border border-emerald-400/30">
                        {t('billingOwner')}
                      </span>
                    )}
                    {m.status === 'pending' && (
                      <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-yellow-400/15 text-yellow-400 border border-yellow-400/30">
                        {t('pendingInvite')}
                      </span>
                    )}
                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${ROLE_COLORS[m.role]}`}>
                      {t(`role${m.role.charAt(0).toUpperCase() + m.role.slice(1)}`)}
                    </span>
                  </div>

                  {/* Actions */}
                  {showActions && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setChangingRole(changingRole === m.user_id ? null : m.user_id)}
                        className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors px-2 py-1.5 rounded-lg hover:bg-[var(--muted)]"
                        title={t('changeRole')}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleRemove(m.user_id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors px-2 py-1.5 rounded-lg hover:bg-red-400/10"
                        title={t('removeMember')}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Role change dropdown */}
                {changingRole === m.user_id && (
                  <div className="mt-3 pt-3 border-t border-[var(--border)] flex gap-2 flex-wrap">
                    {ASSIGNABLE_ROLES.filter((r) => r !== m.role && (r !== 'admin' || canChangeToAdmin)).map((r) => (
                      <button
                        key={r}
                        onClick={() => handleChangeRole(m.user_id, r)}
                        className={`text-xs px-3 py-1.5 rounded-lg border transition-colors hover:opacity-80 ${ROLE_COLORS[r]}`}
                      >
                        {t(`role${r.charAt(0).toUpperCase() + r.slice(1)}`)}
                        <span className="ml-1 opacity-60">— {t(`role${r.charAt(0).toUpperCase() + r.slice(1)}Desc`)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </FadeUp>

      {/* Transfer ownership */}
      {isOwner && members.filter((m) => m.user_id !== user?.id && m.status === 'accepted').length > 0 && (
        <FadeUp>
          <div className="bg-[var(--card)] border border-red-400/20 rounded-2xl p-6 space-y-4">
            <h2 className="text-xs uppercase tracking-widest text-red-400 font-bold">{t('transferOwnership')}</h2>
            <p className="text-xs text-[var(--muted-foreground)]">{t('transferOwnershipDesc')}</p>
            <div className="flex gap-3">
              <select
                value={transferTarget || ''}
                onChange={(e) => setTransferTarget(e.target.value || null)}
                className="flex-1 bg-[var(--background)] border border-[var(--border)] rounded-xl px-3 py-3 text-sm text-[var(--foreground)] focus:outline-none focus:border-red-400/50 transition-colors"
              >
                <option value="">—</option>
                {members
                  .filter((m) => m.user_id !== user?.id && m.status === 'accepted')
                  .map((m) => (
                    <option key={m.user_id} value={m.user_id}>
                      {m.display_name || m.email || m.user_id}
                    </option>
                  ))}
              </select>
              <button
                onClick={handleTransfer}
                disabled={!transferTarget || transferConfirming}
                className="px-6 py-3 rounded-xl bg-red-500 text-white font-bold text-xs uppercase tracking-widest hover:opacity-90 transition-opacity disabled:opacity-30 shrink-0"
              >
                {transferConfirming ? '...' : t('transferBtn')}
              </button>
            </div>
          </div>
        </FadeUp>
      )}
    </div>
  );
}
