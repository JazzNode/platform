export default function ReleasedLoading() {
  return (
    <div className="py-6">
      <div className="mb-6">
        <div className="h-7 w-32 rounded-lg bg-[var(--muted)] animate-pulse" />
        <div className="h-4 w-56 rounded-lg bg-[var(--muted)] animate-pulse mt-2" />
      </div>
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-0 mb-6">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-20 rounded-lg bg-[var(--muted)] animate-pulse" />
        ))}
      </div>
      <div className="rounded-xl border border-[var(--border)] bg-[var(--card)]/50 p-6 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 rounded-lg bg-[var(--muted)] animate-pulse" style={{ width: `${80 - i * 10}%` }} />
        ))}
      </div>
    </div>
  );
}
