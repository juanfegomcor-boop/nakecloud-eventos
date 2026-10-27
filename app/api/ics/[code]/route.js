import { getRegistration, getEventById, siteUrl } from '@/lib/data';

export const dynamic = 'force-dynamic';

const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');

export async function GET(_request, { params }) {
  const { code } = await params;
  const reg = await getRegistration(code);
  if (!reg) return new Response('No encontrado', { status: 404 });
  const event = await getEventById(reg.eventId);
  if (!event?.startsAt) return new Response('El evento aún no tiene fecha', { status: 404 });

  const start = new Date(event.startsAt);
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const url = `${await siteUrl()}/pase/${reg.code}`;
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Nakecloud//Eventos//ES', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${reg.code}@nakecloud`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${esc(`${event.name} · ${event.organizer}`)}`,
    `LOCATION:${esc(event.place)}`,
    `DESCRIPTION:${esc(`Entrada: ${reg.ticketName}\nCódigo: ${reg.code}\nTu pase: ${url}`)}`,
    `URL:${url}`,
    'BEGIN:VALARM', 'TRIGGER:-PT2H', 'ACTION:DISPLAY', `DESCRIPTION:${esc(event.name)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR'
  ].join('\r\n');

  return new Response(ics, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="nakecloud-${reg.code}.ics"`
    }
  });
}
