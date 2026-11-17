'use client';

import { useEffect, useState } from 'react';
import type { WorkspaceAnalytics } from '@/types/governance';
import { readSubmissions } from '@/lib/client-state';

const empty: WorkspaceAnalytics = {
  days: 30,
  totalSubmissions: 0,
  auditedSubmissions: 0,
  openFindings: 0,
  findings: 0,
  categories: [],
  topRules: [],
};

export default function AnalyticsDashboard() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await fetch('/api/analytics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ days, submissions: readSubmissions() }),
          signal: controller.signal,
        });
        if (!response.ok) throw new Error('Analytics could not be refreshed.');
        setData(await response.json() as WorkspaceAnalytics);
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Analytics could not be refreshed.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [days]);

  const peak = Math.max(1, ...data.categories.map((item) => item.count));
  const topRule = data.topRules[0];
  return <>
    <div className="analytics-cards">
      <div className="stat-card"><small>SUBMISSIONS IN RANGE</small><strong>{data.totalSubmissions}</strong><span>Baseline + this browser</span></div>
      <div className="stat-card"><small>FINDINGS IN RANGE</small><strong>{data.findings}</strong><span>{data.openFindings} awaiting review</span></div>
      <div className="stat-card"><small>MOST CITED RULE</small><strong>{topRule?.citation ?? '—'}</strong><span>{topRule ? topRule.count + ' findings' : 'No findings in range'}</span></div>
      <div className="stat-card"><small>AUDITED SUBMISSIONS</small><strong>{data.auditedSubmissions}</strong><span>In the selected period</span></div>
    </div>
    <div className="dashboard-grid analytics-body">
      <div className="panel">
        <div className="panel-head"><div><h2>Finding trends</h2><p>Findings by category · last {days} days</p></div><select aria-label="Analytics date range" value={days} onChange={(event) => setDays(Number(event.target.value))}><option value={30}>Last 30 days</option><option value={7}>Last 7 days</option></select></div>
        {error && <p className="analytics-message" role="status">{error}</p>}
        {loading ? <p className="analytics-message" role="status">Updating workspace metrics…</p> : <div className="analytics-live-chart">{data.categories.map((category) => <div className="analytics-live-row" key={category.name}><span>{category.name}</span><b>{category.count}</b><i><em style={{ width: String(Math.round(category.count / peak * 100)) + '%' }}/></i></div>)}</div>}
        <div className="chart-legend"><span><i className="blue-bg"/> Live workspace findings</span><span>Includes demo history</span></div>
      </div>
      <div className="panel top-rules">
        <div className="panel-head"><div><h2>Most violated rules</h2><p>Rule citations in this period</p></div></div>
        {data.topRules.length ? data.topRules.map((rule) => <div key={rule.citation}><span className="rule-id">{rule.citation}</span><span><b>{rule.citation.startsWith('BG-C') ? 'Custom workspace rule' : 'Brand guideline'}</b><i><em style={{ width: String(Math.round(rule.count / Math.max(1, data.topRules[0].count) * 100)) + '%' }}/></i></span><strong>{rule.count}</strong></div>) : <p className="analytics-message">No cited findings in this period.</p>}
      </div>
    </div>
  </>;
}
