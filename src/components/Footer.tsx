import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#111111] rounded-t-[2.5rem] py-14 mt-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <Link href="/" className="group block">
            <p className="font-serif text-xl text-gold font-bold group-hover:text-gold-bright transition-colors">JazzNode</p>
            <p className="mt-1 text-xs uppercase tracking-widest text-[#8A8578]">
              The Jazz Scene, Connected.
            </p>
          </Link>

          <div className="flex items-center gap-3">
            <span className="pulse-dot" />
            <span className="text-xs font-mono uppercase tracking-widest text-[#8A8578]">
              Live Data
            </span>
          </div>

          <p className="text-xs text-[#8A8578]">
            © {new Date().getFullYear()} JazzNode
          </p>
        </div>
      </div>
    </footer>
  );
}
