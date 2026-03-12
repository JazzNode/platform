'use client';

import { useAdmin } from './AdminProvider';

export default function AdminBadge() {
  const { isAdmin, toggleAdmin } = useAdmin();
  if (!isAdmin) return null;

  return (
    <button
      onClick={toggleAdmin}
      className="fixed bottom-20 md:bottom-4 right-4 z-50 px-2 py-1 rounded-lg text-[10px] uppercase tracking-widest font-bold bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors"
      title="Click to exit admin mode (or press Ctrl+Shift+A)"
    >
      Admin
    </button>
  );
}
