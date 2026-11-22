'use client';

import Link from 'next/link';

export default function RouteError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return <main className="workspace-error"><div><span>VERIBRAND AI</span><h1>This view couldn’t load.</h1><p>Your browser-saved work is still available. Retry the view or return to the workspace.</p><div><button onClick={retry}>Try again</button><Link href="/">Open workspace</Link></div></div></main>;
}
