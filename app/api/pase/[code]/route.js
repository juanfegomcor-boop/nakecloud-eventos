import { getRegistration, applyTransaction } from '@/lib/data';
import { fetchTransaction, wompiReady } from '@/lib/wompi';

export const dynamic = 'force-dynamic';

// Estado mínimo de un registro para que la pantalla de pago sepa cuándo cambió.
export async function GET(_request, { params }) {
  const { code } = await params;
  let reg = await getRegistration(code);
  if (!reg) return Response.json({ error: 'No encontrado' }, { status: 404 });
  if (reg.status === 'pending' && reg.wompiTxId && wompiReady()) {
    const tx = await fetchTransaction(reg.wompiTxId);
    if (tx && String(tx.reference || '').startsWith(`${reg.code}-`)) reg = (await applyTransaction(tx)) || reg;
  }
  return Response.json({ status: reg.status, wompiStatus: reg.wompiStatus }, { headers: { 'Cache-Control': 'no-store' } });
}
