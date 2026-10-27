import { denyIfNotAdmin } from '@/lib/auth';
import { q } from '@/lib/db';
import { getRegistration, getEventById } from '@/lib/data';
import { CODE_RE } from '@/lib/format';

export const dynamic = 'force-dynamic';

/** Busca un registro por el QR (o el código escrito) y devuelve también el conteo del evento. */
export async function GET(request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  const { searchParams } = new URL(request.url);
  const raw = String(searchParams.get('code') || '').toUpperCase();
  const code = raw.match(CODE_RE)?.[0];
  const eventId = searchParams.get('evento');

  const counts = eventId
    ? (await q(
        `select count(*) filter (where status = 'paid')::int as total,
                count(*) filter (where status = 'paid' and checked_in_at is not null)::int as inside
         from registrations where event_id = $1`, [eventId]))[0]
    : null;

  if (!code) return Response.json({ registration: null, counts, error: 'Ese QR no es de Nakecloud' });
  const reg = await getRegistration(code);
  if (!reg) return Response.json({ registration: null, counts, error: `No existe el código ${code}` });
  const event = await getEventById(reg.eventId);
  return Response.json({ registration: reg, eventName: event?.name || '', counts }, { headers: { 'Cache-Control': 'no-store' } });
}
