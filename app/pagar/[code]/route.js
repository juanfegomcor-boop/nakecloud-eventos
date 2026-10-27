import { getRegistration, siteUrl } from '@/lib/data';
import { checkoutUrl, wompiReady } from '@/lib/wompi';

export const dynamic = 'force-dynamic';

export async function GET(request, { params }) {
  const { code } = await params;
  const reg = await getRegistration(code);
  const base = await siteUrl();
  if (!reg) return Response.redirect(`${base}/`, 302);
  if (reg.status !== 'pending' || reg.amount <= 0 || !wompiReady()) {
    return Response.redirect(`${base}/pase/${reg.code}`, 302);
  }
  // Cada intento de pago lleva una referencia nueva: CÓDIGO-marca de tiempo.
  const reference = `${reg.code}-${Date.now().toString(36).toUpperCase()}`;
  const url = checkoutUrl({
    reference,
    amountInCents: reg.amount * 100,
    redirectUrl: `${base}/pase/${reg.code}`,
    name: reg.name,
    email: reg.email,
    phone: reg.phone
  });
  return Response.redirect(url, 302);
}
