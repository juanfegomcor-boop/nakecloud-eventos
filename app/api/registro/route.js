import { q } from '@/lib/db';
import { getEventById, getTickets, usedSeats, newCode } from '@/lib/data';
import { wompiReady } from '@/lib/wompi';

export const dynamic = 'force-dynamic';

const bad = (error, status = 400) => Response.json({ error }, { status });

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return bad('Solicitud inválida.'); }

  const name = String(body?.name || '').trim().replace(/\s+/g, ' ').slice(0, 80);
  const phone = String(body?.phone || '').replace(/\D/g, '').slice(-12);
  const email = String(body?.email || '').trim().toLowerCase().slice(0, 120);
  if (name.length < 3) return bad('Escribe tu nombre completo.');
  if (phone.length < 10) return bad('Escribe un número de WhatsApp de 10 dígitos.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return bad('Revisa el correo.');

  const event = await getEventById(String(body?.eventId || ''));
  if (!event || event.status !== 'open') return bad('Las inscripciones de este evento están cerradas.', 409);

  const tickets = await getTickets(event.id, { onlyActive: true });
  const ticket = tickets.find((t) => t.id === body?.ticketId);
  if (!ticket) return bad('Esa entrada ya no está disponible.', 409);

  // Si la misma persona ya empezó un registro pendiente con esta entrada, lo reutilizamos.
  const existing = await q(
    `select code from registrations
     where event_id = $1 and ticket_type_id = $2 and phone = $3 and status = 'pending'
     order by created_at desc limit 1`,
    [event.id, ticket.id, phone]
  );

  let code = existing[0]?.code;
  if (code) {
    await q('update registrations set name = $2, email = $3, created_at = now() where code = $1', [code, name, email || null]);
  } else {
    const seats = await usedSeats(event.id);
    if (event.capacity != null && seats.total >= event.capacity) return bad('Se acabaron los cupos de este evento.', 409);
    if (ticket.capacity != null && (seats.byTicket[ticket.id] || 0) >= ticket.capacity) return bad('Se acabaron los cupos de esta entrada.', 409);

    const free = ticket.price <= 0;
    for (let attempt = 0; attempt < 5 && !code; attempt++) {
      const candidate = newCode();
      try {
        await q(
          `insert into registrations (code, event_id, ticket_type_id, ticket_name, amount, name, phone, email, status, method, paid_at)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [candidate, event.id, ticket.id, ticket.name, ticket.price, name, phone, email || null,
            free ? 'paid' : 'pending', free ? 'Gratis' : null, free ? new Date().toISOString() : null]
        );
        code = candidate;
      } catch (err) {
        if (!String(err?.message || '').includes('duplicate')) throw err;
      }
    }
    if (!code) return bad('No pudimos generar tu código. Intenta de nuevo.', 500);
  }

  const next = ticket.price > 0 && wompiReady() ? `/pagar/${code}` : `/pase/${code}`;
  return Response.json({ code, next });
}
