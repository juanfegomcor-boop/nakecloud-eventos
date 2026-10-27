import QRCode from 'qrcode';
import { getRegistration, siteUrl } from '@/lib/data';

export const dynamic = 'force-dynamic';

export async function GET(_request, { params }) {
  const { code } = await params;
  const reg = await getRegistration(code);
  if (!reg || reg.status !== 'paid') return new Response('No encontrado', { status: 404 });
  const png = await QRCode.toBuffer(`${await siteUrl()}/pase/${reg.code}`, { type: 'png', width: 900, margin: 3, errorCorrectionLevel: 'M' });
  return new Response(png, {
    headers: {
      'Content-Type': 'image/png',
      'Content-Disposition': `attachment; filename="Nakecloud-${reg.code}.png"`,
      'Cache-Control': 'private, max-age=300'
    }
  });
}
