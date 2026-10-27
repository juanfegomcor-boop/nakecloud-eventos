import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const COOKIE = 'nk_admin';
const MAX_AGE = 30 * 24 * 60 * 60; // 30 días

function secret() {
  return process.env.SESSION_SECRET || process.env.ADMIN_PASSWORD || '';
}
function sign(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}
function same(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function makeToken() {
  const exp = String(Date.now() + MAX_AGE * 1000);
  return `${exp}.${sign(exp)}`;
}

function validToken(token) {
  if (!token || !secret()) return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || !same(sig, sign(exp))) return false;
  return Number(exp) > Date.now();
}

export function checkPassword(input) {
  const real = process.env.ADMIN_PASSWORD;
  if (!real) return false;
  const a = crypto.createHash('sha256').update(String(input || '')).digest();
  const b = crypto.createHash('sha256').update(real).digest();
  return crypto.timingSafeEqual(a, b);
}

export const cookieOptions = { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE };

export async function isAdmin() {
  const store = await cookies();
  return validToken(store.get(COOKIE)?.value);
}

/** Para páginas: manda al login si no hay sesión. */
export async function requireAdmin() {
  if (!(await isAdmin())) redirect('/admin/login');
}

/** Para rutas API: devuelve una respuesta 401 o null si hay sesión. */
export async function denyIfNotAdmin() {
  if (await isAdmin()) return null;
  return Response.json({ error: 'Inicia sesión en el panel.' }, { status: 401 });
}
