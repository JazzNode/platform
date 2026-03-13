'use client';

import { useAdmin, type ViewMode } from './AdminProvider';
import { useAuth } from './AuthProvider';

const MODE_LABELS: Record<ViewMode, string> = {
  admin: 'Admin',
  'artist-tier0': 'Artist T0',
  'artist-tier1': 'Artist T1',
  'artist-tier2': 'Artist T2',
  'artist-tier3': 'Artist T3',
  'venue-tier0': 'Venue T0',
  'venue-tier1': 'Venue T1',
  'venue-tier2': 'Venue T2',
};

const MODE_COLORS: Record<ViewMode, string> = {
  admin: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
  'artist-tier0': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30',
  'artist-tier1': 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  'artist-tier2': 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
  'artist-tier3': 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
  'venue-tier0': 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/30',
  'venue-tier1': 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
  'venue-tier2': 'bg-amber-500/20 text-amber-400 border-amber-500/30 hover:bg-amber-500/30',
};

export default function AdminBadge() {
  const { viewMode, toggleArtistTier, toggleVenueTier } = useAdmin();
  const { profile } = useAuth();

  if (profile?.role !== 'admin') return null;

  // Click continues cycling within the same group
  const handleClick = () => {
    if (viewMode.startsWith('venue-')) {
      toggleVenueTier();
    } else {
      // admin or artist-tier* → cycle artist tiers
      toggleArtistTier();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`fixed bottom-20 md:bottom-4 right-4 z-50 px-2 py-1 rounded-lg text-[10px] uppercase tracking-widest font-bold border transition-colors ${MODE_COLORS[viewMode]}`}
      title="Ctrl+Shift+A: Artist tiers · Ctrl+Shift+V: Venue tiers"
    >
      {MODE_LABELS[viewMode]}
    </button>
  );
}
