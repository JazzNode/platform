export default function CityDetailLoading() {
  return (
    <div className="animate-pulse space-y-8 py-8">
      {/* Back nav */}
      <div className="h-4 w-24 bg-[var(--muted)] rounded" />

      {/* Header */}
      <div className="space-y-3">
        <div className="h-8 w-48 bg-[var(--muted)] rounded" />
        <div className="h-4 w-32 bg-[var(--muted)] rounded" />
      </div>

      {/* Venue cards skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-28 bg-[var(--muted)] rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 w-full bg-[var(--muted)] rounded-xl" />
          ))}
        </div>
      </div>

      {/* Events skeleton */}
      <div className="space-y-3">
        <div className="h-6 w-36 bg-[var(--muted)] rounded" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 w-full bg-[var(--muted)] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
