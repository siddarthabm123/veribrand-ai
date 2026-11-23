import type { ReviewActor } from './governance';

export function workspaceActor(user: { id: string; email?: string; app_metadata: Record<string, unknown> }, workspace: string): ReviewActor | null {
  if (user.app_metadata.veribrand_workspace !== workspace) return null;
  const role = user.app_metadata.veribrand_role;
  if (role !== 'Content Creator' && role !== 'Brand Reviewer' && role !== 'Brand Admin') return null;
  return { id: user.id, name: user.email || user.id, role, verified: true };
}
export function canMutate(path: string, method: string, role: ReviewActor['role']) {
  path = path.replace(/\/+$/, '');
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) return true;
  if (path === '/api/knowledge' || path === '/api/evidence' || path === '/api/seed/reset') return role === 'Brand Admin';
  if (path === '/api/webhook/gate') return role !== 'Content Creator';
  return true; // Named review actions have additional model-level checks.
}
export function requestActor(request: Request): ReviewActor | null {
  const value = request.headers.get('x-veribrand-actor');
  return value ? JSON.parse(decodeURIComponent(value)) as ReviewActor : null;
}
