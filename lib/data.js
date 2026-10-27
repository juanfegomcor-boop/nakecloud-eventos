import 'server-only';
import crypto from 'node:crypto';
import { headers } from 'next/headers';
import { q, iso } from './db';
import { methodLabel } from './wompi';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const rand = (n) => Array.from({ length: n }, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');
export const newCode = () => 'NK' + rand(8);
export const newId = (prefix) => `${prefix}_${rand(10).toLowerCase()}`;

export function slugify(s) {
  return String(s || 'evento')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 48) || 'evento';
}

/** Dirección pública del sitio (dominio propio si SITE_URL está definida). */
export async function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/+$/, '');
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host') || 'localhost:3000';
  const proto = h.get('x-forwarded-proto') || (host.startsWith('localhost') ? 'http' : 'https');
  return `${proto}://${host}`;
}

export const mapEvent = (r) => r && ({
  id: r.id, slug: r.slug, name: r.name, tagline: r.tagline || '', description: r.description || '',
  startsAt: iso(r.starts_at), place: r.place || '', placeUrl: r.place_url || '',
  capacity: r.capacity, status: r.status, createdAt: iso(r.created_at),
  imageUrl: r.image_version ? `/api/imagen/${r.id}?v=${r.image_version}` : '',
  organizer: r.organizer || 'Nakecloud',
  eyebrow: r.eyebrow ?? 'Evento de comunidad'
});

export const mapTicket = (r) => ({
  id: r.id, eventId: r.event_id, name: r.name, description: r.description || '',
  price: Number(r.price) || 0, capacity: r.capacity, sort: r.sort, active: r.active
});

export const mapReg = (r) => r && ({
  code: r.code, eventId: r.event_id, ticketId: r.ticket_type_id, ticketName: r.ticket_name,
  amount: Number(r.amount) || 0, name: r.name, phone: r.phone || '', email: r.email || '',
  status: r.status, method: r.method || '', wompiTxId: r.wompi_tx_id || '', wompiStatus: r.wompi_status || '',
  paidAt: iso(r.paid_at), checkedInAt: iso(r.checked_in_at), notes: r.notes || '', createdAt: iso(r.created_at)
});

export async function getEventBySlug(slug) {
  const rows = await q('select * from events where slug = $1', [slug]);
  return mapEvent(rows[0]);
}
export async function getEventById(id) {
  const rows = await q('select * from events where id = $1', [id]);
  return mapEvent(rows[0]);
}
export async function getTickets(eventId, { onlyActive = false } = {}) {
  const rows = await q(
    `select * from ticket_types where event_id = $1 ${onlyActive ? 'and active' : ''} order by sort, price`,
    [eventId]
  );
  return rows.map(mapTicket);
}
export async function getRegistration(code) {
  const rows = await q('select * from registrations where code = $1', [String(code || '').toUpperCase()]);
  return mapReg(rows[0]);
}

/** Cupos ocupados: pagados + pendientes de los últimos 30 minutos (pago en curso). */
export async function usedSeats(eventId) {
  const rows = await q(
    `select ticket_type_id, count(*)::int as n from registrations
     where event_id = $1 and (status = 'paid' or (status = 'pending' and created_at > now() - interval '30 minutes'))
     group by ticket_type_id`,
    [eventId]
  );
  const byTicket = {};
  let total = 0;
  for (const r of rows) { byTicket[r.ticket_type_id] = r.n; total += r.n; }
  return { byTicket, total };
}

/**
 * Aplica una transacción de Wompi a su registro. Solo marca "pagado" si Wompi dice APPROVED
 * y el monto y la moneda coinciden con lo que vale la entrada.
 */
export async function applyTransaction(tx) {
  if (!tx?.reference) return null;
  const code = String(tx.reference).split('-')[0];
  const reg = await getRegistration(code);
  if (!reg) return null;
  const amountOk = Number(tx.amount_in_cents) === reg.amount * 100 && tx.currency === 'COP';
  if (tx.status === 'APPROVED' && amountOk) {
    await q(
      `update registrations set status = 'paid', method = $2, wompi_tx_id = $3, wompi_reference = $4,
         wompi_status = 'APPROVED', paid_at = coalesce(paid_at, now())
       where code = $1 and status = 'pending'`,
      [code, `Wompi · ${methodLabel(tx.payment_method_type)}`, tx.id, tx.reference]
    );
  } else {
    await q(
      `update registrations set wompi_status = $2, wompi_tx_id = $3, wompi_reference = $4
       where code = $1 and status = 'pending'`,
      [code, tx.status === 'APPROVED' ? 'AMOUNT_MISMATCH' : tx.status, tx.id, tx.reference]
    );
  }
  return getRegistration(code);
}
