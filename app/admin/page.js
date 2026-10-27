import { requireAdmin } from '@/lib/auth';
import { q } from '@/lib/db';
import { mapEvent } from '@/lib/data';
import TopBar from '@/components/admin/TopBar';
import EventList from '@/components/admin/EventList';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Eventos', robots: { index: false, follow: false } };

export default async function AdminHome() {
  await requireAdmin();
  const rows = await q(
    `select e.*,
       coalesce(count(r.code) filter (where r.status <> 'cancelled'), 0)::int as total_count,
       coalesce(count(r.code) filter (where r.status = 'paid'), 0)::int as paid_count,
       coalesce(sum(r.amount) filter (where r.status = 'paid'), 0)::int as revenue
     from events e left join registrations r on r.event_id = e.id
     group by e.id
     order by e.starts_at desc nulls first, e.created_at desc`
  );
  const events = rows.map((r) => ({ ...mapEvent(r), total: r.total_count, paid: r.paid_count, revenue: r.revenue }));

  return (
    <main className="admin">
      <TopBar current="eventos" />
      <div className="between">
        <h1 className="h2">Eventos</h1>
        <a className="btn btn-primary btn-sm" href="/admin/eventos/nuevo" style={{ width: 'auto' }}>Nuevo evento</a>
      </div>
      {events.length === 0 ? (
        <div className="card" style={{ alignItems: 'flex-start' }}>
          <span className="h3">Aún no hay eventos</span>
          <p className="muted" style={{ margin: 0 }}>Crea el primero con su fecha, lugar y tipos de entrada. Cuando lo publiques, el link principal del sitio lleva directo a su registro.</p>
          <a className="btn btn-primary btn-sm" href="/admin/eventos/nuevo" style={{ width: 'auto' }}>Crear evento</a>
        </div>
      ) : (
        <EventList events={events} />
      )}
    </main>
  );
}
