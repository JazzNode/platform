'use client';

import { useAdmin, type ViewMode } from './AdminProvider';
import { useAuth } from './AuthProvider';

const MODE_LABELS: Record<ViewMode, string> = {
  admin: 'Admin',
  tier0: 'Tier 0',
  tier1: 'Tier 1',
  tier2: 'Tier 2',
  tier3: 'Tier 3',
};

const MODE_COLORS: Record<ViewMode, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  tier0: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30',
  tier1: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  tier2: 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
  tier3: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
};

export default function AdminBadge() {
  const { viewMode, toggleAdmin } = useAdmin();
  const { profile } = useAuth();

  if (profile?.role !== 'admin') return null;

  return (
    <button
      onClick={toggleAdmin}
      className={`fixed bottom-20 md:bottom-4 right-4 z-50 px-2 py-1 rounded-lg text-[10px] uppercase tracking-widest font-bold border transition-colors ${MODE_COLORS[viewMode]}`}
      title="Click or press Ctrl+Shift+A to cycle: Admin → Tier 0 → Tier 1 → Tier 2 → Tier 3"
    >
      {MODE_LABELS[viewMode]}
    </button>
  );
}
