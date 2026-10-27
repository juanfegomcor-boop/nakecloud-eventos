import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { q } from '@/lib/db';
import { getEventById, getTickets, mapReg, siteUrl } from '@/lib/data';
import { wompiReady, isSandbox } from '@/lib/wompi';
import TopBar from '@/components/admin/TopBar';
import EventAdmin from '@/components/admin/EventAdmin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Evento', robots: { index: false, follow: false } };

export default async function EventAdminPage({ params, searchParams }) {
  await requireAdmin();
  const { id } = await params;
  const sp = await searchParams;
  const initialTab = ['registros', 'resumen', 'editar'].includes(sp?.tab) ? sp.tab : null;
  const isNew = id === 'nuevo';
  const event = isNew ? null : await getEventById(id);
  if (!isNew && !event) notFound();

  const tickets = event ? await getTickets(event.id) : [];
  const regs = event
    ? (await q('select * from registrations where event_id = $1 order by created_at desc', [event.id])).map(mapReg)
    : [];

  return (
    <main className="admin">
      <TopBar current="eventos" />
      <EventAdmin
        event={event}
        initialTab={initialTab}
        tickets={tickets}
        registrations={regs}
        publicBase={await siteUrl()}
        payments={{ ready: wompiReady(), sandbox: isSandbox() }}
      />
    </main>
  );
}
