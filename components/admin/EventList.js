'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { moneyPlain, shortDate, timeOf } from '@/lib/format';
import { Spinner } from '../icons';

const STATUS = { open: 'Inscripciones abiertas', closed: 'Cerrado', draft: 'Borrador' };

export default function EventList({ events }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(null);
  const [toast, setToast] = useState('');

  async function remove(e) {
    setBusy(e.id);
    const res = await fetch(`/api/admin/eventos?id=${encodeURIComponent(e.id)}`, { method: 'DELETE' }).catch(() => null);
    setBusy(null);
    setConfirming(null);
    if (!res?.ok) { setToast('No se pudo borrar. Intenta de nuevo.'); }
    else { setToast(`"${e.name}" borrado`); router.refresh(); }
    setTimeout(() => setToast(''), 2600);
  }

  return (
    <>
      <div className="list">
        {events.map((e) => (
          <div key={e.id} className="list-row" style={{ gridTemplateColumns: 'minmax(0, 1fr) auto' }}>
            <a href={`/admin/eventos/${e.id}`} style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 }}>
              <span className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 17 }}>{e.name}</span>
                <span className={`pill ${e.status === 'open' ? 'paid' : e.status === 'draft' ? 'free' : 'in'}`}>{STATUS[e.status] || e.status}</span>
              </span>
              <span className="meta">
                {e.startsAt ? `${shortDate(e.startsAt)} · ${timeOf(e.startsAt)}` : 'Sin fecha'}{e.place ? ` · ${e.place}` : ''}
                {' · '}<span className="num">{e.paid} confirmados · {moneyPlain(e.revenue)}</span>
              </span>
            </a>
            <div className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
              {confirming === e.id ? null : (
                <button type="button" className="chip" style={{ color: 'var(--bad)' }} onClick={() => setConfirming(e.id)} aria-label={`Borrar ${e.name}`}>Borrar</button>
              )}
            </div>
            {confirming === e.id ? (
              <div style={{ gridColumn: '1 / -1', marginTop: 10, padding: 14, borderRadius: 16, border: '1px solid var(--bad)', background: 'rgba(255,69,58,.08)', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <span style={{ fontWeight: 600 }}>¿Borrar “{e.name}”?</span>
                <span className="small muted">
                  {e.total > 0
                    ? `Se borran también sus ${e.total} registros${e.paid > 0 ? ` (${e.paid} confirmados, ${moneyPlain(e.revenue)} recaudados)` : ''} y sus QR dejan de funcionar. Exporta el CSV antes si lo necesitas. No se puede deshacer.`
                    : 'No tiene registros. No se puede deshacer.'}
                </span>
                <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
                  <button type="button" className="chip" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} disabled={busy === e.id} onClick={() => remove(e)}>
                    {busy === e.id ? <Spinner size={14} /> : 'Sí, borrar evento'}
                  </button>
                  {e.total > 0 ? <a className="chip" href={`/api/admin/csv?evento=${e.id}`}>Exportar CSV</a> : null}
                  <button type="button" className="chip" onClick={() => setConfirming(null)}>Cancelar</button>
                </div>
              </div>
            ) : null}
          </div>
        ))}
      </div>
      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </>
  );
}
