import { denyIfNotAdmin } from '@/lib/auth';
import { q } from '@/lib/db';
import { getEventById, getTickets, getRegistration, newCode } from '@/lib/data';

export const dynamic = 'force-dynamic';

const METHODS = ['Efectivo', 'Nequi', 'Transferencia', 'Cortesía', 'Daviplata'];

/** Registro manual hecho por el equipo. */
export async function POST(request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  const b = await request.json().catch(() => ({}));

  const event = await getEventById(String(b.eventId || ''));
  if (!event) return Response.json({ error: 'Evento no encontrado' }, { status: 404 });
  const ticket = (await getTickets(event.id)).find((t) => t.id === b.ticketId);
  if (!ticket) return Response.json({ error: 'Elige una entrada' }, { status: 400 });
  const name = String(b.name || '').trim().slice(0, 80);
  if (name.length < 3) return Response.json({ error: 'Escribe el nombre' }, { status: 400 });

  const amount = Math.max(0, Math.round(Number(b.amount) || 0));
  const paid = b.status !== 'pending';
  const method = paid ? (amount === 0 ? 'Cortesía' : (METHODS.includes(b.method) ? b.method : 'Efectivo')) : null;

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    try {
      await q(
        `insert into registrations (code, event_id, ticket_type_id, ticket_name, amount, name, phone, email, status, method, paid_at, notes)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [code, event.id, ticket.id, ticket.name, amount, name,
          String(b.phone || '').replace(/\D/g, '').slice(-12) || null, String(b.email || '').trim().toLowerCase() || null,
          paid ? 'paid' : 'pending', method, paid ? new Date().toISOString() : null, String(b.notes || '').trim().slice(0, 200) || null]
      );
      return Response.json({ code });
    } catch (err) {
      if (!String(err?.message || '').includes('duplicate')) throw err;
    }
  }
  return Response.json({ error: 'No se pudo generar el código' }, { status: 500 });
}

/** Acciones sobre un registro: pago manual, ingreso, deshacer, anular, restaurar. */
export async function PATCH(request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  const { code, action, method } = await request.json().catch(() => ({}));
  const reg = await getRegistration(code);
  if (!reg) return Response.json({ error: 'Registro no encontrado' }, { status: 404 });

  switch (action) {
    case 'pay':
      await q(`update registrations set status = 'paid', method = $2, paid_at = now() where code = $1 and status = 'pending'`,
        [reg.code, METHODS.includes(method) ? method : 'Efectivo']);
      break;
    case 'checkin':
      await q(`update registrations set checked_in_at = coalesce(checked_in_at, now()) where code = $1 and status = 'paid'`, [reg.code]);
      break;
    case 'pay-checkin':
      await q(`update registrations set status = 'paid', method = $2, paid_at = now(), checked_in_at = coalesce(checked_in_at, now()) where code = $1 and status = 'pending'`,
        [reg.code, METHODS.includes(method) ? method : 'Efectivo']);
      break;
    case 'undo':
      await q('update registrations set checked_in_at = null where code = $1', [reg.code]);
      break;
    case 'cancel':
      await q(`update registrations set status = 'cancelled' where code = $1`, [reg.code]);
      break;
    case 'restore':
      await q(`update registrations set status = case when paid_at is not null then 'paid' else 'pending' end where code = $1 and status = 'cancelled'`, [reg.code]);
      break;
    default:
      return Response.json({ error: 'Acción desconocida' }, { status: 400 });
  }
  return Response.json({ registration: await getRegistration(reg.code) });
}
