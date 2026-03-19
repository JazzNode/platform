export default function CitiesLoading() {
  return (
    <div className="animate-pulse space-y-8 py-8">
      <div className="h-8 w-32 bg-[var(--muted)] rounded" />
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="h-20 rounded-xl bg-[var(--muted)]" />
        ))}
      </div>
    </div>
  );
}
