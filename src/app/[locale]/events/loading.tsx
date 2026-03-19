export default function EventsLoading() {
  return (
    <div className="animate-pulse space-y-8 py-8">
      <div className="h-8 w-32 bg-[var(--muted)] rounded" />
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--muted)]">
            <div className="w-16 h-16 rounded-lg bg-[var(--border)] shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 bg-[var(--border)] rounded" />
              <div className="h-3 w-32 bg-[var(--border)] rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
