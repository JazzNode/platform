export default function Footer() {
  return (
    <footer className="border-t border-[rgba(240,237,230,0.06)] py-12 mt-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-serif text-lg text-gold">JazzNode</p>
          <p className="text-xs uppercase tracking-widest text-[#8A8578]">
            © {new Date().getFullYear()} — The Jazz Scene, Connected.
          </p>
        </div>
      </div>
    </footer>
  );
}
