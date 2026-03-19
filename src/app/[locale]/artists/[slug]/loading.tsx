export default function ArtistDetailLoading() {
  return (
    <div className="animate-pulse space-y-8 py-8">
      {/* Back nav */}
      <div className="h-4 w-24 bg-[var(--muted)] rounded" />

      {/* Hero section */}
      <div className="flex flex-col sm:flex-row gap-6 items-start">
        {/* Photo skeleton */}
        <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-2xl bg-[var(--muted)] shrink-0" />
        {/* Info */}
        <div className="flex-1 space-y-3 min-w-0">
          <div className="h-8 w-48 bg-[var(--muted)] rounded" />
          <div className="h-4 w-32 bg-[var(--muted)] rounded" />
          <div className="h-4 w-64 bg-[var(--muted)] rounded" />
          <div className="flex gap-2 mt-4">
            <div className="h-8 w-20 bg-[var(--muted)] rounded-full" />
            <div className="h-8 w-20 bg-[var(--muted)] rounded-full" />
          </div>
        </div>
      </div>

      {/* Bio skeleton */}
      <div className="space-y-2">
        <div className="h-4 w-full bg-[var(--muted)] rounded" />
        <div className="h-4 w-5/6 bg-[var(--muted)] rounded" />
        <div className="h-4 w-4/6 bg-[var(--muted)] rounded" />
      </div>

      {/* Events section skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-36 bg-[var(--muted)] rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full bg-[var(--muted)] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
