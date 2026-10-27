import { denyIfNotAdmin } from '@/lib/auth';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

const MAX_BYTES = 2.5 * 1024 * 1024;

/** Guarda la imagen de fondo de un evento (llega ya comprimida desde el navegador como data URL). */
export async function POST(request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  const { id, dataUrl } = await request.json().catch(() => ({}));
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(dataUrl || ''));
  if (!id || !match) return Response.json({ error: 'Imagen inválida. Usa JPG, PNG o WebP.' }, { status: 400 });
  const [, mime, data] = match;
  if (Buffer.byteLength(data, 'base64') > MAX_BYTES) return Response.json({ error: 'La imagen es muy pesada (máx. 2,5 MB).' }, { status: 413 });

  const exists = await q('select id from events where id = $1', [id]);
  if (!exists.length) return Response.json({ error: 'Evento no encontrado' }, { status: 404 });

  await q(
    `insert into event_images (event_id, mime, data, updated_at) values ($1, $2, $3, now())
     on conflict (event_id) do update set mime = excluded.mime, data = excluded.data, updated_at = now()`,
    [id, mime, data]
  );
  await q('update events set image_version = coalesce(image_version, 0) + 1 where id = $1', [id]);
  return Response.json({ ok: true });
}

export async function DELETE(request) {
  const denied = await denyIfNotAdmin();
  if (denied) return denied;
  const id = new URL(request.url).searchParams.get('id');
  await q('delete from event_images where event_id = $1', [id]);
  await q('update events set image_version = null where id = $1', [id]);
  return Response.json({ ok: true });
}
