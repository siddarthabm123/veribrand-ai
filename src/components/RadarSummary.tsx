'use client';
import { authFetch } from '@/lib/auth-fetch';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { WorkspaceAnalytics } from '@/types/governance';
import { readSubmissions } from '@/lib/client-state';

const colors = ['blue-bg', 'amber-bg', 'pink-bg', 'green-bg', 'violet-bg'];

export default function RadarSummary() {
  const [data, setData] = useState<WorkspaceAnalytics | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    authFetch('/api/analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ days: 30, submissions: readSubmissions() }),
      signal: controller.signal,
    }).then(async (response) => {
      if (!response.ok) throw new Error('Analytics unavailable');
      setData(await response.json() as WorkspaceAnalytics);
    }).catch(() => {
      if (!controller.signal.aborted) setData(null);
    });
    return () => controller.abort();
  }, []);
  const peak = Math.max(1, ...(data?.categories.map((item) => item.count) ?? []));
  return <div className="panel radar-panel">
    <div className="panel-head"><div><h2>Guideline gap radar</h2><p>Live findings · last 30 days</p></div><Link href="/analytics" className="dots" aria-label="Open all analytics">···</Link></div>
    <div className="radar-score"><div className="score-ring"><span>{data?.findings ?? '—'}</span></div><div><b>{data?.openFindings ?? 'Loading'} open findings</b><small>{data?.auditedSubmissions ?? '—'} audited submissions</small></div></div>
    <div className="radar-rows">{(data?.categories ?? []).map((category, index) => <div key={category.name}><span><i className={'legend ' + colors[index % colors.length]}/>{category.name}</span><b>{String(category.count).padStart(2, '0')}</b><div><i style={{ width: String(Math.round(category.count / peak * 100)) + '%' }}/></div></div>)}</div>
    {!data && <p className="analytics-message">Loading this workspace’s findings…</p>}
    <Link className="radar-link" href="/analytics">Explore all insights <ArrowUpRight size={14}/></Link>
  </div>;
}
