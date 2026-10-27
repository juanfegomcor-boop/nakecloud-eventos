import { notFound } from 'next/navigation';
import QRCode from 'qrcode';
import { getRegistration, getEventById, applyTransaction, siteUrl } from '@/lib/data';
import { fetchTransaction, wompiReady } from '@/lib/wompi';
import { money, shortDate, timeOf } from '@/lib/format';
import { Back, Check, Spinner, Sun } from '@/components/icons';
import PaymentWatcher from '@/components/PaymentWatcher';
import ShareButton from '@/components/ShareButton';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mi pase', robots: { index: false, follow: false } };

const FAILED = ['DECLINED', 'ERROR', 'VOIDED', 'AMOUNT_MISMATCH'];

export default async function PassPage({ params, searchParams }) {
  const { code } = await params;
  const sp = await searchParams;
  let reg = await getRegistration(code);
  if (!reg) notFound();

  // Al volver de Wompi llega ?id=<transacción>. La consultamos en Wompi (no confiamos en el navegador).
  const txId = typeof sp?.id === 'string' ? sp.id : null;
  if (reg.status === 'pending' && wompiReady() && (txId || reg.wompiTxId)) {
    const tx = await fetchTransaction(txId || reg.wompiTxId);
    if (tx && String(tx.reference || '').startsWith(`${reg.code}-`)) reg = (await applyTransaction(tx)) || reg;
  }

  const event = await getEventById(reg.eventId);
  const base = await siteUrl();
  const first = reg.name.split(' ')[0];
  const when = event?.startsAt ? `${shortDate(event.startsAt)} · ${timeOf(event.startsAt)}` : 'Fecha por definir';

  if (reg.status === 'cancelled') {
    return (
      <main className="screen">
        <span className="brand rise">NAKECLOUD</span>
        <div className="grow" />
        <h1 className="title rise d1">Este registro fue anulado</h1>
        <p className="lede rise d2">Si crees que es un error, escríbenos por Instagram a @nakecloud con tu código <span className="mono">{reg.code}</span>.</p>
        <div className="grow" />
      </main>
    );
  }

  if (reg.status === 'pending') {
    const failed = FAILED.includes(reg.wompiStatus);
    const waiting = !failed && (txId || reg.wompiStatus === 'PENDING');
    return (
      <main className="screen">
        <div className="between fade">
          {event ? <a className="icon-btn" href={`/e/${event.slug}`} aria-label="Volver al evento"><Back /></a> : <span />}
          <span className="brand">NAKECLOUD</span>
          <span style={{ width: 44 }} />
        </div>
        <div className="grow" />
        <div className="stack" style={{ gap: 14 }}>
          {waiting ? <span className="rise" style={{ color: 'var(--muted)' }}><Spinner size={28} /></span> : null}
          <h1 className="title rise d1">
            {waiting ? 'Confirmando tu pago' : failed ? 'El pago no se completó' : `${first}, falta el pago`}
          </h1>
          <p className="lede rise d2">
            {waiting
              ? 'Wompi está confirmando la transacción. Esta pantalla se actualiza sola en unos segundos.'
              : failed
                ? 'No se hizo ningún cobro. Puedes intentarlo otra vez con el mismo u otro medio de pago.'
                : wompiReady()
                  ? 'Tu cupo queda reservado unos minutos mientras pagas.'
                  : 'Tu registro quedó guardado. El equipo te confirma el pago por WhatsApp.'}
          </p>
          <div className="facts rise d3">
            <div><span>ENTRADA</span><span>{reg.ticketName}</span></div>
            <div><span>VALOR</span><span className="num">{money(reg.amount)}</span></div>
            <div><span>CÓDIGO</span><span className="mono">{reg.code}</span></div>
          </div>
        </div>
        <div className="grow" />
        {waiting ? <PaymentWatcher code={reg.code} /> : null}
        {!waiting && wompiReady() ? (
          <a className="btn btn-primary rise d4" href={`/pagar/${reg.code}`}>{failed ? 'Intentar de nuevo' : `Pagar ${money(reg.amount)}`}</a>
        ) : null}
      </main>
    );
  }

  const passUrl = `${base}/pase/${reg.code}`;
  const qrSvg = await QRCode.toString(passUrl, { type: 'svg', margin: 0, errorCorrectionLevel: 'M', color: { dark: '#000000', light: '#00000000' } });
  const inside = Boolean(reg.checkedInAt);

  return (
    <main className="screen" style={{ gap: 22 }}>
      <div className="stack center" style={{ alignItems: 'center', gap: 14, paddingTop: 8 }}>
        <span className="check pop"><Check color="#000" draw /></span>
        <h1 className="title rise d2" style={{ fontSize: 30 }}>{inside ? `Ya entraste, ${first}` : `Estás dentro, ${first}`}</h1>
        <span className="muted rise d3" style={{ fontSize: 15 }}>{inside ? 'Disfruta el evento' : 'Muestra este QR en la entrada'}</span>
      </div>

      <div className="pass-wrap">
        <div className="pass-glow glow" aria-hidden="true" />
        <article className={`pass pop d3${inside ? ' dim' : ''}`}>
          <div className="pass-head">
            <div className="between">
              <span className="brand" style={{ fontSize: 12 }}>NAKECLOUD</span>
              <span className="tag">{inside ? 'Ingresó' : reg.amount > 0 ? 'Pagado' : 'Confirmado'}</span>
            </div>
            <span className="pass-name">{event?.name || 'Evento'}</span>
            <div className="pass-facts">
              <div><span>FECHA</span><span>{event?.startsAt ? shortDate(event.startsAt) : 'Por definir'}</span></div>
              <div><span>HORA</span><span>{event?.startsAt ? timeOf(event.startsAt) : '—'}</span></div>
              <div><span>ENTRADA</span><span>{reg.ticketName}</span></div>
            </div>
          </div>
          <div className="perf" />
          <div className="pass-qr">
            <div role="img" aria-label={`Código QR de entrada ${reg.code}`} dangerouslySetInnerHTML={{ __html: qrSvg }} style={{ width: '100%', display: 'flex', justifyContent: 'center' }} />
            <span className="pass-code">{reg.code}</span>
            <span className="small" style={{ color: '#6e6e73' }}>{reg.name}</span>
          </div>
        </article>
      </div>

      <div className="stack rise d5" style={{ gap: 10 }}>
        <span className="small faint row" style={{ justifyContent: 'center', gap: 8 }}><Sun /> Sube el brillo al mostrarlo</span>
        <div className="grid2">
          <a className="btn btn-primary btn-sm" href={`/api/qr/${reg.code}`} download={`Nakecloud-${reg.code}.png`}>Guardar QR</a>
          <a className="btn btn-line btn-sm" href={`/api/ics/${reg.code}`}>Al calendario</a>
        </div>
        <ShareButton url={passUrl} text={`Mi pase para ${event?.name || 'el evento'} de Nakecloud · ${when}`} />
        {event?.placeUrl ? <a className="btn btn-text" href={event.placeUrl} target="_blank" rel="noopener noreferrer">Cómo llegar · {event.place}</a> : null}
      </div>
    </main>
  );
}
