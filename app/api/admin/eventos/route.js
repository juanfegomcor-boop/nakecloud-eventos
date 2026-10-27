import { denyIfNotAdmin } from '@/lib/auth';
import { q } from '@/lib/db';
import { newId, slugify } from '@/lib/data';

export const dynamic = 'force-dynamic';

const intOrNull = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) && n > 0 ? n : null; };
const text = (v, max = 200) => String(v ?? '').trim().slice(0, max);

export async function POST(request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;

  const b = await request.json().catch(() => null);
  if (!b) return Response.json({ error: 'Solicitud inválida' }, { status: 400 });

  const name = text(b.name, 120);
  if (!name) return Response.json({ error: 'Ponle nombre al evento' }, { status: 400 });
  const status = ['open', 'closed', 'draft'].includes(b.status) ? b.status : 'draft';
  // datetime-local llega sin zona: es hora de Bogotá (UTC-5, sin horario de verano).
  const startsAt = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(b.startsLocal || '') ? new Date(`${b.startsLocal}:00-05:00`).toISOString() : null;
  const fields = [name, text(b.tagline, 180), startsAt, text(b.place, 120), text(b.placeUrl, 500), intOrNull(b.capacity), status];

  let id = b.id ? String(b.id) : null;
  let slug = slugify(b.slug || name);

  if (id) {
    const exists = await q('select id from events where id = $1', [id]);
    if (!exists.length) return Response.json({ error: 'Evento no encontrado' }, { status: 404 });
  }
  // Dirección única
  const taken = await q('select id from events where slug = $1 and id <> $2', [slug, id || '']);
  if (taken.length) slug = `${slug}-${newId('x').slice(2, 6)}`;

  if (id) {
    await q(
      `update events set name = $2, tagline = $3, starts_at = $4, place = $5, place_url = $6, capacity = $7, status = $8, slug = $9 where id = $1`,
      [id, ...fields, slug]
    );
  } else {
    id = newId('ev');
    await q(
      `insert into events (id, name, tagline, starts_at, place, place_url, capacity, status, slug) values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [id, ...fields, slug]
    );
  }

  // Entradas: se crean o actualizan; las que ya no vienen se ocultan (nunca se borran, por si tienen registros).
  const incoming = Array.isArray(b.tickets) ? b.tickets.slice(0, 20) : [];
  const keep = [];
  for (const [i, t] of incoming.entries()) {
    const tName = text(t.name, 80);
    if (!tName) continue;
    const price = Math.max(0, Math.round(Number(t.price) || 0));
    const values = [tName, text(t.description, 160), price, intOrNull(t.capacity), i, t.active !== false];
    const existing = t.id && !String(t.id).startsWith('new_')
      ? await q('select id from ticket_types where id = $1 and event_id = $2', [t.id, id])
      : [];
    if (existing.length) {
      await q('update ticket_types set name = $2, description = $3, price = $4, capacity = $5, sort = $6, active = $7 where id = $1', [t.id, ...values]);
      keep.push(t.id);
    } else {
      const tid = newId('tk');
      await q('insert into ticket_types (id, event_id, name, description, price, capacity, sort, active) values ($1, $2, $3, $4, $5, $6, $7, $8)', [tid, id, ...values]);
      keep.push(tid);
    }
  }
  if (keep.length) {
    await q('update ticket_types set active = false where event_id = $1 and not (id = any($2::text[]))', [id, keep]);
  }

  return Response.json({ id, slug });
}
