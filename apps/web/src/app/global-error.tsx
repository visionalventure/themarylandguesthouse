'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[GlobalError]', error);
  }, [error]);

  const handleClearAndRetry = () => {
    try { localStorage.removeItem('mgh-auth'); } catch {}
    try { document.cookie = 'mgh-access-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'; } catch {}
    window.location.href = '/login';
  };

  return (
    <html>
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#0f0d1a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ textAlign: 'center', maxWidth: 480, padding: '2rem' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ color: '#9ca3af', marginBottom: 24, fontSize: 14, lineHeight: 1.6 }}>
            The application encountered an unexpected error.
            {error?.digest && (
              <span style={{ display: 'block', marginTop: 8, fontFamily: 'monospace', fontSize: 12, color: '#6b7280' }}>
                Error ID: {error.digest}
              </span>
            )}
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={reset}
              style={{ background: '#D4AF37', color: '#000', border: 'none', borderRadius: 8, padding: '10px 20px', fontWeight: 600, cursor: 'pointer', fontSize: 14 }}
            >
              Try Again
            </button>
            <button
              onClick={handleClearAndRetry}
              style={{ background: 'transparent', color: '#9ca3af', border: '1px solid #374151', borderRadius: 8, padding: '10px 20px', fontWeight: 500, cursor: 'pointer', fontSize: 14 }}
            >
              Clear Session &amp; Login
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
