import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Sirve la imagen de fondo de un evento. El ?v= cambia con cada imagen nueva, así que se puede cachear para siempre. */
export async function GET(_request, { params }) {
  const { id } = await params;
  const rows = await q('select mime, data from event_images where event_id = $1', [id]);
  if (!rows.length) return new Response('No encontrada', { status: 404 });
  return new Response(Buffer.from(rows[0].data, 'base64'), {
    headers: {
      'Content-Type': rows[0].mime,
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
}
