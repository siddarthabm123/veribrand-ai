'use client';

export default function GlobalError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <html lang="en"><body><main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f7f8fb', color: '#1f2937', fontFamily: 'Arial, sans-serif', padding: 24 }}><section style={{ maxWidth: 520, background: 'white', border: '1px solid #e5e7eb', borderRadius: 16, padding: 28 }}><p style={{ color: '#5148dc', fontWeight: 800 }}>VERIBRAND AI</p><h1>This page could not load.</h1><p>Retry the page. Your browser-saved work remains on this device.</p><button onClick={retry} style={{ padding: '11px 16px', border: 0, borderRadius: 8, background: '#5148dc', color: 'white', cursor: 'pointer' }}>Try again</button></section></main></body></html>;
}
