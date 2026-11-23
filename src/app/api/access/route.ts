import { requestActor } from '@/lib/access';
export async function GET(request: Request) {
  return Response.json({ mode: request.headers.get('x-veribrand-mode') || 'authenticated', actor: requestActor(request) }, { headers: { 'Cache-Control': 'no-store' } });
}
