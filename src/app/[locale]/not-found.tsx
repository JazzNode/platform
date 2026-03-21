import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="py-24 text-center">
      <h1 className="font-serif text-4xl font-bold mb-4">404</h1>
      <p className="text-[var(--muted-foreground)] mb-6">Page not found.</p>
      <Link href="/" className="text-gold hover:text-gold-bright transition-colors link-lift">
        &larr; Back to home
      </Link>
    </div>
  );
}
