import { cookies } from 'next/headers';
import { COOKIE } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const store = await cookies();
  store.delete(COOKIE);
  return Response.json({ ok: true });
}
