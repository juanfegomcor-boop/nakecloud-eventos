import 'server-only';
import crypto from 'node:crypto';

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex');

export function wompiReady() {
  return Boolean(process.env.WOMPI_PUBLIC_KEY && process.env.WOMPI_INTEGRITY_SECRET);
}

export function isSandbox() {
  return !(process.env.WOMPI_PUBLIC_KEY || '').startsWith('pub_prod_');
}

function apiBase() {
  return isSandbox() ? 'https://sandbox.wompi.co/v1' : 'https://production.wompi.co/v1';
}

/**
 * URL del Web Checkout de Wompi.
 * Firma de integridad: SHA256(referencia + monto en centavos + moneda + secreto de integridad).
 */
export function checkoutUrl({ reference, amountInCents, redirectUrl, name, email, phone }) {
  const signature = sha256(`${reference}${amountInCents}COP${process.env.WOMPI_INTEGRITY_SECRET}`);
  const p = new URLSearchParams();
  p.set('public-key', process.env.WOMPI_PUBLIC_KEY);
  p.set('currency', 'COP');
  p.set('amount-in-cents', String(amountInCents));
  p.set('reference', reference);
  p.set('signature:integrity', signature);
  p.set('redirect-url', redirectUrl);
  if (email) p.set('customer-data:email', email);
  if (name) p.set('customer-data:full-name', name);
  const digits = String(phone || '').replace(/\D/g, '').replace(/^57(?=3\d{9}$)/, '');
  if (/^3\d{9}$/.test(digits)) {
    p.set('customer-data:phone-number', digits);
    p.set('customer-data:phone-number-prefix', '+57');
  }
  return `https://checkout.wompi.co/p/?${p.toString()}`;
}

/** Consulta una transacción directamente en Wompi (no confía en lo que diga el navegador). */
export async function fetchTransaction(id) {
  if (!id) return null;
  try {
    const res = await fetch(`${apiBase()}/transactions/${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data || null;
  } catch {
    return null;
  }
}

/** Valida la firma de un evento enviado por Wompi al webhook. */
export function verifyEvent(body) {
  const secret = process.env.WOMPI_EVENTS_SECRET;
  const props = body?.signature?.properties;
  const given = String(body?.signature?.checksum || '').toLowerCase();
  if (!secret || !Array.isArray(props) || !given || body?.timestamp == null) return false;
  const values = props.map((path) => String(path).split('.').reduce((obj, key) => (obj == null ? obj : obj[key]), body.data));
  const expected = sha256(values.map((v) => (v == null ? '' : String(v))).join('') + String(body.timestamp) + secret);
  const a = Buffer.from(expected);
  const b = Buffer.from(given);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const METHOD_LABEL = {
  NEQUI: 'Nequi',
  PSE: 'PSE',
  CARD: 'Tarjeta',
  BANCOLOMBIA_TRANSFER: 'Bancolombia',
  BANCOLOMBIA_QR: 'QR Bancolombia',
  BANCOLOMBIA_COLLECT: 'Corresponsal Bancolombia',
  BANCOLOMBIA_BNPL: 'Bancolombia a cuotas',
  DAVIPLATA: 'Daviplata',
  PCOL: 'Puntos Colombia',
  SU_PLUS: 'SU+'
};
export const methodLabel = (type) => METHOD_LABEL[type] || type || 'Wompi';
