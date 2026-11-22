import { hasPersistentStorage, resetStore } from '@/lib/repository';

export async function POST() {
  if (hasPersistentStorage()) return Response.json({ error: 'Reset is disabled for the shared database.' }, { status: 409 });
  return Response.json(resetStore());
}
