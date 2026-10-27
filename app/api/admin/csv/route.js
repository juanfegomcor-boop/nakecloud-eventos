import { denyIfNotAdmin } from '@/lib/auth';
import { q } from '@/lib/db';
import { getEventById, mapReg } from '@/lib/data';
import { stamp, STATUS_LABEL } from '@/lib/format';

export const dynamic = 'force-dynamic';

const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export async function GET(request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('evento');
  const event = await getEventById(id);
  if (!event) return new Response('Evento no encontrado', { status: 404 });
  const regs = (await q('select * from registrations where event_id = $1 order by name', [id])).map(mapReg);

  const head = ['Código', 'Nombre', 'WhatsApp', 'Correo', 'Entrada', 'Valor', 'Estado', 'Medio', 'Pagó', 'Llegó', 'Hora de llegada', 'ID Wompi', 'Notas', 'Registrado'];
  const lines = regs.map((r) => [
    r.code, r.name, r.phone, r.email, r.ticketName, r.amount, STATUS_LABEL[r.status] || r.status, r.method,
    r.paidAt ? stamp(r.paidAt) : '', r.checkedInAt ? 'Sí' : 'No', r.checkedInAt ? stamp(r.checkedInAt) : '', r.wompiTxId, r.notes, stamp(r.createdAt)
  ].map(cell).join(','));
  const csv = '﻿' + [head.map(cell).join(','), ...lines].join('\r\n');

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${event.slug}-registros.csv"`
    }
  });
}
