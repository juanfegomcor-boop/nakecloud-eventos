// Formatos compartidos entre servidor y navegador (sin dependencias de Node).
export const TZ = 'America/Bogota';

const nf = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });
export const money = (n) => (Number(n) > 0 ? '$' + nf.format(Number(n)) : 'Gratis');
export const moneyPlain = (n) => '$' + nf.format(Number(n) || 0);

function parts(isoStr, opts) {
  if (!isoStr) return {};
  const out = {};
  for (const p of new Intl.DateTimeFormat('es-CO', { timeZone: TZ, ...opts }).formatToParts(new Date(isoStr))) out[p.type] = p.value;
  return out;
}
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');
const clean = (s) => (s || '').replace(/\./g, '');

/** "Sáb 8 nov" */
export function shortDate(isoStr) {
  if (!isoStr) return 'Fecha por definir';
  const p = parts(isoStr, { weekday: 'short', day: 'numeric', month: 'short' });
  return `${cap(clean(p.weekday))} ${p.day} ${clean(p.month)}`;
}
/** "8:00 a. m." */
export function timeOf(isoStr) {
  if (!isoStr) return '';
  return new Intl.DateTimeFormat('es-CO', { timeZone: TZ, hour: 'numeric', minute: '2-digit' }).format(new Date(isoStr));
}
/** "08.11" */
export function dotDate(isoStr) {
  if (!isoStr) return '';
  const p = parts(isoStr, { day: '2-digit', month: '2-digit' });
  return `${String(p.day).padStart(2, '0')}.${String(p.month).padStart(2, '0')}`;
}
/** "24 oct · 3:20 p. m." */
export function stamp(isoStr) {
  if (!isoStr) return '—';
  const p = parts(isoStr, { day: 'numeric', month: 'short' });
  return `${p.day} ${clean(p.month)} · ${timeOf(isoStr)}`;
}
/** Valor para <input type="datetime-local"> en hora de Bogotá. */
export function toLocalInput(isoStr) {
  if (!isoStr) return '';
  const p = parts(isoStr, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}
/** Días que faltan (en Bogotá). */
export function daysUntil(isoStr) {
  if (!isoStr) return null;
  const d = (s) => { const p = parts(s, { year: 'numeric', month: '2-digit', day: '2-digit' }); return Date.UTC(+p.year, +p.month - 1, +p.day); };
  return Math.round((d(isoStr) - d(new Date().toISOString())) / 864e5);
}

export const STATUS_LABEL = { paid: 'Pagado', pending: 'Pendiente', cancelled: 'Anulado' };
export const CODE_RE = /NK[A-Z0-9]{8}/;
