import { cookies } from 'next/headers';
import { checkPassword, makeToken, COOKIE, cookieOptions } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Freno simple contra adivinar la contraseña (por instancia del servidor).
const attempts = new Map();

export async function POST(request) {
  const ip = (request.headers.get('x-forwarded-for') || 'local').split(',')[0].trim();
  const now = Date.now();
  const recent = (attempts.get(ip) || []).filter((t) => now - t < 60_000);
  if (recent.length >= 8) return Response.json({ error: 'Demasiados intentos' }, { status: 429 });

  const { password } = await request.json().catch(() => ({}));
  if (!checkPassword(password)) {
    recent.push(now);
    attempts.set(ip, recent);
    return Response.json({ error: 'Contraseña incorrecta' }, { status: 401 });
  }
  attempts.delete(ip);
  const store = await cookies();
  store.set(COOKIE, makeToken(), cookieOptions);
  return Response.json({ ok: true });
}
