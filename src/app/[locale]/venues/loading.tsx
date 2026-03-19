export default function VenuesLoading() {
  return (
    <div className="animate-pulse space-y-8 py-8">
      <div className="h-8 w-32 bg-[var(--muted)] rounded" />
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="h-28 rounded-xl bg-[var(--muted)]" />
        ))}
      </div>
    </div>
  );
}
