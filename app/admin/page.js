import { requireAdmin } from '@/lib/auth';
import { q } from '@/lib/db';
import { mapEvent } from '@/lib/data';
import { moneyPlain as money, shortDate, timeOf } from '@/lib/format';
import TopBar from '@/components/admin/TopBar';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Eventos', robots: { index: false, follow: false } };

const STATUS = { open: 'Inscripciones abiertas', closed: 'Cerrado', draft: 'Borrador' };

export default async function AdminHome() {
  await requireAdmin();
  const rows = await q(
    `select e.*,
       coalesce(count(r.code) filter (where r.status = 'paid'), 0)::int as paid_count,
       coalesce(sum(r.amount) filter (where r.status = 'paid'), 0)::int as revenue,
       coalesce(count(r.code) filter (where r.checked_in_at is not null), 0)::int as inside
     from events e left join registrations r on r.event_id = e.id
     group by e.id
     order by e.starts_at desc nulls first, e.created_at desc`
  );
  const events = rows.map((r) => ({ ...mapEvent(r), paid: r.paid_count, revenue: r.revenue, inside: r.inside }));

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
        <div className="list">
          {events.map((e) => (
            <a key={e.id} href={`/admin/eventos/${e.id}`} className="list-row" style={{ textDecoration: 'none' }}>
              <span style={{ fontWeight: 600, fontSize: 17 }}>{e.name}</span>
              <span className={`pill ${e.status === 'open' ? 'paid' : e.status === 'draft' ? 'free' : 'in'}`}>{STATUS[e.status] || e.status}</span>
              <span className="meta">{e.startsAt ? `${shortDate(e.startsAt)} · ${timeOf(e.startsAt)}` : 'Sin fecha'}{e.place ? ` · ${e.place}` : ''}</span>
              <span className="meta num" style={{ textAlign: 'right' }}>{e.paid} confirmados · {money(e.revenue)}</span>
            </a>
          ))}
        </div>
      )}
    </main>
  );
}
