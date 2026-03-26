import '@/app/globals.css';

/**
 * Minimal layout for embed pages — no header, footer, or app shell.
 * Designed for iframe embedding on third-party websites.
 */
export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <html>
      <body className="bg-transparent" style={{ margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
