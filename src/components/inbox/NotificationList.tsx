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
  /** i18n labels */
  labels: {
    noNotifications: string;
    markAllRead: string;
    deleteSelected: string;
    deleteAll: string;
    selectAll: string;
    deselectAll: string;
    selected: string;
    confirmDeleteTitle: string;
    confirmDeleteBody: string;
    confirmYes: string;
    cancel: string;
  };
  /** Optional: render a badge next to the title (e.g. TypeBadge for admin) */
  renderBadge?: (notif: NotificationItem) => React.ReactNode;
  onMarkRead: (id: string) => void | Promise<void>;
  onMarkAllRead: () => void | Promise<void>;
  onDelete: (ids: string[]) => void | Promise<void>;
  onDeleteAll: () => void | Promise<void>;
}

export default function NotificationList({
  notifications,
  loading,
  accent = 'emerald',
  labels,
  renderBadge,
  onMarkRead,
  onMarkAllRead,
  onDelete,
  onDeleteAll,
}: NotificationListProps) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'delete-selected' | 'delete-all' | null>(null);
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
      if (confirmAction === 'delete-selected') {
        await onDelete([...selectedIds]);
      } else if (confirmAction === 'delete-all') {
        await onDeleteAll();
      }
    } finally {
      setActing(false);
      setConfirmAction(null);
      setSelectedIds(new Set());
      setSelectMode(false);
    }
  }, [confirmAction, selectedIds, onDelete, onDeleteAll]);

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

          {/* Delete selected (only in select mode with selections) */}
          {selectMode && selectedIds.size > 0 && (
            <button
              onClick={() => setConfirmAction('delete-selected')}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              {labels.deleteSelected} ({selectedIds.size})
            </button>
          )}

          {/* Delete all */}
          {!selectMode && (
            <button
              onClick={() => setConfirmAction('delete-all')}
              className="text-xs text-[var(--muted-foreground)]/60 hover:text-red-400 transition-colors"
            >
              {labels.deleteAll}
            </button>
          )}
        </div>
      </div>

      {/* Confirm dialog */}
      {confirmAction && (
        <div className="flex items-center gap-3 bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
          <svg className="w-4 h-4 text-red-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-400">{labels.confirmDeleteTitle}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
              {confirmAction === 'delete-selected'
                ? `${labels.confirmDeleteBody} (${selectedIds.size})`
                : `${labels.confirmDeleteBody} (${notifications.length})`}
            </p>
          </div>
          <button
            onClick={handleConfirmAction}
            disabled={acting}
            className="text-xs font-semibold text-red-400 hover:text-red-300 disabled:opacity-50 whitespace-nowrap"
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

              {/* Per-item delete button (visible on hover, not in select mode) */}
              {!selectMode && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete([notif.id]);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[var(--muted-foreground)]/40 hover:text-red-400 transition-all shrink-0 mt-0.5"
                  title="Delete"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    <path d="M10 11v6" /><path d="M14 11v6" />
                    <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
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
