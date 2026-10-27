import { requireAdmin } from '@/lib/auth';
import { q } from '@/lib/db';
import { mapEvent } from '@/lib/data';
import Scanner from '@/components/admin/Scanner';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Puerta', robots: { index: false, follow: false } };

export default async function DoorPage({ searchParams }) {
  await requireAdmin();
  const sp = await searchParams;
  const events = (await q(
    `select * from events where status <> 'draft' order by
       case when starts_at is null then 1 else 0 end,
       abs(extract(epoch from (starts_at - now()))) limit 12`
  )).map(mapEvent);
  const initial = events.find((e) => e.id === sp?.evento)?.id || events[0]?.id || null;

  if (!events.length) {
    return (
      <main className="screen">
        <a className="brand" href="/admin" style={{ textDecoration: 'none' }}>NAKECLOUD</a>
        <div className="grow" />
        <h1 className="title">No hay eventos</h1>
        <p className="lede">Crea un evento en el panel para empezar a escanear.</p>
        <a className="btn btn-primary" href="/admin/eventos/nuevo">Crear evento</a>
        <div className="grow" />
      </main>
    );
  }
  return <Scanner events={events.map((e) => ({ id: e.id, name: e.name }))} initialEventId={initial} />;
}
