export default function Footer() {
  return (
    <footer className="border-t py-8 mt-16">
      <div className="mx-auto max-w-6xl px-4 text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} JazzNode — The Jazz Scene, Connected.</p>
        <p className="mt-1">Built with 🎷 for the jazz community worldwide.</p>
      </div>
    </footer>
  );
}
