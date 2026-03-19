export default function ArtistsLoading() {
  return (
    <div className="animate-pulse space-y-8 py-8">
      <div className="h-8 w-32 bg-[var(--muted)] rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 15 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="aspect-square rounded-xl bg-[var(--muted)]" />
            <div className="h-4 w-3/4 bg-[var(--muted)] rounded" />
            <div className="h-3 w-1/2 bg-[var(--muted)] rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
