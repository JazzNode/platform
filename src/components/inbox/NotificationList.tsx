'use client';

import { useState, useCallback } from 'react';

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
}

interface NotificationListProps {
  notifications: NotificationItem[];
  loading: boolean;
  /** Accent color token — e.g. 'emerald-400' or 'var(--color-gold)' */
  accent?: 'emerald' | 'gold';
  /** Hide archive buttons (used in archive view) */
  isArchiveView?: boolean;
  /** i18n labels */
  labels: {
    noNotifications: string;
    markAllRead: string;
    archiveSelected: string;
    archiveAll: string;
    selectAll: string;
    deselectAll: string;
    selected: string;
    confirmArchiveTitle: string;
    confirmArchiveBody: string;
    confirmYes: string;
    cancel: string;
  };
  /** Optional: render a badge next to the title (e.g. TypeBadge for admin) */
  renderBadge?: (notif: NotificationItem) => React.ReactNode;
  onMarkRead: (id: string) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onArchive: (ids: string[]) => void | Promise<void>;
  onArchiveAll: () => void | Promise<void>;
}

export default function NotificationList({
  notifications,
  loading,
  accent = 'emerald',
  isArchiveView = false,
  labels,
  renderBadge,
  onMarkRead,
  onMarkAllRead,
  onArchive,
  onArchiveAll,
}: NotificationListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'archive-selected' | 'archive-all' | null>(null);
  const [acting, setActing] = useState(false);

  // Accent color classes
  const accentDot = accent === 'gold' ? 'bg-[var(--color-gold)]' : 'bg-emerald-400';
  const accentBg = accent === 'gold' ? 'bg-[var(--color-gold)]/[0.02]' : 'bg-emerald-400/[0.02]';
  const accentText = accent === 'gold' ? 'text-[var(--color-gold)]' : 'text-emerald-400';
  const accentCheckbox = accent === 'gold'
    ? 'border-[var(--color-gold)] bg-[var(--color-gold)]'
    : 'border-emerald-400 bg-emerald-400';

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === notifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(notifications.map((n) => n.id)));
    }
  }, [notifications, selectedIds.size]);

  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
    setConfirmAction(null);
  }, []);

  const handleConfirmAction = useCallback(async () => {
    setActing(true);
    try {
      if (confirmAction === 'archive-selected') {
        await onArchive([...selectedIds]);
      } else if (confirmAction === 'archive-all') {
        await onArchiveAll();
      }
    } finally {
      setActing(false);
      setConfirmAction(null);
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  }, [confirmAction, selectedIds, onArchive, onArchiveAll]);

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const allSelected = notifications.length > 0 && selectedIds.size === notifications.length;

  if (loading) {
    return (
      <div className="py-12 text-center">
        <div className={`w-6 h-6 border-2 ${accent === 'gold' ? 'border-[var(--color-gold)]/30 border-t-[var(--color-gold)]' : 'border-emerald-400/30 border-t-emerald-400'} rounded-full animate-spin mx-auto`} />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
        <p className="text-sm text-[var(--muted-foreground)]">{labels.noNotifications}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      {!isArchiveView && (
        <div className="flex items-center gap-2 flex-wrap">
          {/* Select mode toggle */}
          <button
            onClick={() => selectMode ? exitSelectMode() : setSelectMode(true)}
            className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
              selectMode
                ? `border-${accent === 'gold' ? '[var(--color-gold)]' : 'emerald-400'}/30 ${accentText} ${accentBg}`
                : 'border-[var(--border)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]'
            }`}
          >
            {selectMode ? labels.deselectAll : labels.selectAll}
          </button>

          {selectMode && (
            <>
              {/* Select all checkbox */}
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                  allSelected ? accentCheckbox : 'border-[var(--border)]'
                }`}>
                  {allSelected && (
                    <svg className="w-3 h-3 text-[#0A0A0A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </span>
                {allSelected ? labels.deselectAll : labels.selectAll}
              </button>

              {selectedIds.size > 0 && (
                <span className="text-xs text-[var(--muted-foreground)]">
                  {selectedIds.size} {labels.selected}
                </span>
              )}
            </>
          )}

          {/* Action buttons — pushed to the right */}
          <div className="ml-auto flex items-center gap-2">
            {/* Mark all read */}
            {unreadCount > 0 && !selectMode && (
              <button
                onClick={() => onMarkAllRead()}
                className={`text-xs ${accentText} hover:underline`}
              >
                {labels.markAllRead}
              </button>
            )}

            {/* Archive selected (only in select mode with selections) */}
            {selectMode && selectedIds.size > 0 && (
              <button
                onClick={() => setConfirmAction('archive-selected')}
                className={`text-xs ${accentText} hover:underline transition-colors`}
              >
                {labels.archiveSelected} ({selectedIds.size})
              </button>
            )}

            {/* Archive all */}
            {!selectMode && (
              <button
                onClick={() => setConfirmAction('archive-all')}
                className="text-xs text-[var(--muted-foreground)]/60 hover:text-[var(--foreground)] transition-colors"
              >
                {labels.archiveAll}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Confirm dialog */}
      {confirmAction && (
        <div className={`flex items-center gap-3 ${accent === 'gold' ? 'bg-[var(--color-gold)]/5 border-[var(--color-gold)]/20' : 'bg-emerald-400/5 border-emerald-400/20'} border rounded-xl px-4 py-3`}>
          {/* Archive icon */}
          <svg className={`w-4 h-4 ${accentText} shrink-0`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="21 8 21 21 3 21 3 8" />
            <rect x="1" y="3" width="22" height="5" />
            <line x1="10" y1="12" x2="14" y2="12" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-semibold ${accentText}`}>{labels.confirmArchiveTitle}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {confirmAction === 'archive-selected'
                ? `${labels.confirmArchiveBody} (${selectedIds.size})`
                : `${labels.confirmArchiveBody} (${notifications.length})`}
            </p>
          </div>
          <button
            onClick={handleConfirmAction}
            disabled={acting}
            className={`text-xs font-semibold ${accentText} hover:underline disabled:opacity-50 whitespace-nowrap`}
          >
            {acting ? '...' : labels.confirmYes}
          </button>
          <button
            onClick={() => setConfirmAction(null)}
            className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] whitespace-nowrap"
          >
            {labels.cancel}
          </button>
        </div>
      )}

      {/* Notification rows */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)]">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`px-5 py-4 transition-colors group ${!notif.read_at && !selectMode ? `${accentBg} cursor-pointer` : ''} ${
              selectedIds.has(notif.id) ? accentBg : ''
            }`}
            onClick={() => {
              if (selectMode) {
                toggleSelect(notif.id);
              } else if (!notif.read_at) {
                onMarkRead(notif.id);
              }
            }}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox or unread dot */}
              {selectMode ? (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleSelect(notif.id); }}
                  className="mt-0.5 shrink-0"
                >
                  <span className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                    selectedIds.has(notif.id) ? accentCheckbox : 'border-[var(--border)]'
                  }`}>
                    {selectedIds.has(notif.id) && (
                      <svg className="w-3 h-3 text-[#0A0A0A]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </span>
                </button>
              ) : (
                !notif.read_at && <span className={`w-2 h-2 rounded-full ${accentDot} mt-1.5 shrink-0`} />
              )}

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">{notif.title}</p>
                  {renderBadge && renderBadge(notif)}
                </div>
                {notif.body && (
                  <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{notif.body}</p>
                )}
                <p className="text-xs text-[var(--muted-foreground)]/50 mt-1">
                  {new Date(notif.created_at).toLocaleString()}
                </p>
              </div>

              {/* Per-item archive button (visible on hover, not in select mode, not in archive view) */}
              {!selectMode && !isArchiveView && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onArchive([notif.id]);
                  }}
                  className={`opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)]/40 hover:${accentText} transition-all shrink-0 mt-0.5`}
                  title="Archive"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="21 8 21 21 3 21 3 8" />
                    <rect x="1" y="3" width="22" height="5" />
                    <line x1="10" y1="12" x2="14" y2="12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
