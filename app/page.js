import { redirect } from 'next/navigation';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function Home() {
  let slug = null;
  try {
    const rows = await q(
      `select slug from events
       where status = 'open' and (starts_at is null or starts_at > now() - interval '12 hours')
       order by starts_at nulls last limit 1`
    );
    slug = rows[0]?.slug || null;
  } catch {
    slug = null;
  }
  if (slug) redirect(`/e/${slug}`);

  return (
    <main className="screen">
      <div className="between rise"><span className="brand">NAKECLOUD</span><span className="live off">Sin inscripciones abiertas</span></div>
      <div className="grow" />
      <div className="stack">
        <h1 className="display rise d1">Pronto,<br />el próximo.</h1>
        <p className="lede rise d2">Estamos armando el siguiente evento de la comunidad. Lo anunciamos primero en Instagram.</p>
      </div>
      <a className="btn btn-line rise d3" href="https://instagram.com/nakecloud" target="_blank" rel="noopener noreferrer">@nakecloud</a>
    </main>
  );
}
