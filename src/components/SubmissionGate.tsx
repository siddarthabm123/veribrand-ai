'use client';
import { authFetch } from '@/lib/auth-fetch';

import { useEffect, useState } from 'react';
import type { Submission } from '@/types/governance';
import { readSubmission } from '@/lib/client-state';
import GateSimulator from '@/components/GateSimulator';

export default function SubmissionGate({ id }: { id: string }) {
  const [record, setRecord] = useState<Submission | null>(null);
  useEffect(() => {
    let active = true;
    const local = readSubmission(id);
    authFetch(`/api/submissions/${encodeURIComponent(id)}`).then(async (response) => {
      if (!response.ok) throw new Error('Record unavailable from this server instance.');
      return response.json() as Promise<Submission>;
    }).then((serverRecord) => { if (active) setRecord(local ?? serverRecord); }).catch(() => { if (active && local) setRecord(local); });
    return () => { active = false; };
  }, [id]);
  return record ? <GateSimulator submission={record}/> : null;
}
