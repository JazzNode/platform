export default function NotFound() {
  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif', background: '#000', color: '#fff' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
            <h1 style={{ fontSize: '24px', fontWeight: 500, margin: 0, paddingRight: '23px', borderRight: '1px solid rgba(255,255,255,.3)' }}>404</h1>
            <p style={{ fontSize: '14px', margin: 0, paddingLeft: '23px' }}>This page could not be found.</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- Root 404 outside [locale] router, Link component requires locale prefix */}
          <a
            href="/"
            style={{ marginTop: '32px', fontSize: '14px', color: '#D4AF37', textDecoration: 'none' }}
          >
            ← Back to JazzNode
          </a>
        </div>
      </body>
    </html>
  );
}
