export default function EventDetailLoading() {
  return (
    <div className="animate-pulse space-y-8 py-8">
      {/* Back nav */}
      <div className="h-4 w-24 bg-[var(--muted)] rounded" />

      {/* Poster + info */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Poster skeleton */}
        <div className="w-full sm:w-48 h-64 sm:h-64 rounded-2xl bg-[var(--muted)] shrink-0" />
        {/* Info */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="h-8 w-56 bg-[var(--muted)] rounded" />
          <div className="h-4 w-40 bg-[var(--muted)] rounded" />
          <div className="h-4 w-32 bg-[var(--muted)] rounded" />
          <div className="h-4 w-48 bg-[var(--muted)] rounded" />
        </div>
      </div>

      {/* Lineup skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-24 bg-[var(--muted)] rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--muted)]" />
            <div className="h-4 w-32 bg-[var(--muted)] rounded" />
          </div>
        ))}
      </div>

      {/* Description skeleton */}
      <div className="space-y-2">
        <div className="h-6 w-28 bg-[var(--muted)] rounded" />
        <div className="h-4 w-full bg-[var(--muted)] rounded" />
        <div className="h-4 w-5/6 bg-[var(--muted)] rounded" />
        <div className="h-4 w-4/6 bg-[var(--muted)] rounded" />
      </div>
    </div>
  );
}
