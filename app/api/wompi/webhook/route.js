import { applyTransaction } from '@/lib/data';
import { verifyEvent } from '@/lib/wompi';

export const dynamic = 'force-dynamic';

/**
 * Wompi llama aquí cuando una transacción cambia de estado (evento transaction.updated).
 * Configura esta URL en el panel de Wompi: https://TU-DOMINIO/api/wompi/webhook
 */
export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return new Response('bad request', { status: 400 }); }

  if (!verifyEvent(body)) {
    // Firma inválida: se ignora. Respondemos 401 para que quede registrado en Wompi.
    return new Response('invalid signature', { status: 401 });
  }

  if (body.event === 'transaction.updated' && body.data?.transaction) {
    try {
      await applyTransaction(body.data.transaction);
    } catch (err) {
      console.error('Error aplicando transacción de Wompi', err);
      return new Response('error', { status: 500 }); // Wompi reintentará
    }
  }
  return new Response('ok', { status: 200 });
}
