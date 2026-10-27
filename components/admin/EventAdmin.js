'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { money, moneyPlain, shortDate, timeOf, stamp, toLocalInput, STATUS_LABEL } from '@/lib/format';
import { Spinner } from '../icons';

const STATUS_OPTIONS = [
  ['open', 'Inscripciones abiertas'],
  ['closed', 'Cerrado'],
  ['draft', 'Borrador (no visible)']
];
const MANUAL_METHODS = ['Efectivo', 'Nequi', 'Transferencia', 'Cortesía'];

let tmp = 0;
const tempId = () => `new_${Date.now().toString(36)}_${tmp++}`;

export default function EventAdmin({ event, initialTab, tickets, registrations, publicBase, payments }) {
  const router = useRouter();
  const [tab, setTab] = useState(event ? (initialTab || 'registros') : 'editar');
  const [toast, setToast] = useState('');
  const say = (t) => { setToast(t); clearTimeout(say.t); say.t = setTimeout(() => setToast(''), 2600); };
  const publicUrl = event ? `${publicBase}/e/${event.slug}` : '';

  // Copia con el portapapeles moderno; si el navegador lo bloquea, usa el método clásico
  // y, como último recurso, deja el link seleccionado para copiarlo a mano.
  async function copy(text, msg) {
    try {
      await navigator.clipboard.writeText(text);
      say(msg);
      return;
    } catch {}
    const field = document.getElementById('public-link');
    if (field) {
      field.focus();
      field.select();
      field.setSelectionRange(0, text.length);
      let ok = false;
      try { ok = document.execCommand('copy'); } catch {}
      say(ok ? msg : 'Link seleccionado: cópialo con Cmd+C o mantén presionado');
    }
  }

  async function share(text) {
    if (navigator.share) {
      try { await navigator.share({ title: event.name, url: text }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    copy(text, 'Link copiado');
  }

  return (
    <>
      <div className="stack" style={{ gap: 10 }}>
        <div className="between" style={{ flexWrap: 'wrap' }}>
          <h1 className="h2">{event ? event.name : 'Nuevo evento'}</h1>
          {event ? (
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <a className="chip" href={publicUrl} target="_blank" rel="noopener noreferrer">Ver página</a>
              <a className="chip" href={`/admin/puerta?evento=${event.id}`}>Abrir puerta</a>
            </div>
          ) : null}
        </div>
        {event ? <span className="muted small">{event.startsAt ? `${shortDate(event.startsAt)} · ${timeOf(event.startsAt)}` : 'Sin fecha'}{event.place ? ` · ${event.place}` : ''}</span> : null}
        {event ? (
          <div className="card" style={{ gap: 10, padding: 16 }}>
            <label className="h3" htmlFor="public-link">Link para historias</label>
            <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
              <input
                id="public-link"
                className="field mono"
                readOnly
                value={publicUrl}
                onFocus={(e) => e.target.select()}
                style={{ flex: '1 1 280px', height: 48, fontSize: 15 }}
              />
              <button type="button" className="btn btn-primary btn-sm" style={{ width: 'auto' }} onClick={() => copy(publicUrl, 'Link copiado')}>Copiar</button>
              <button type="button" className="btn btn-line btn-sm" style={{ width: 'auto' }} onClick={() => share(publicUrl)}>Compartir</button>
            </div>
          </div>
        ) : null}
        {!payments.ready ? (
          <p className="pill pending" style={{ height: 'auto', padding: '8px 12px', whiteSpace: 'normal' }}>Wompi aún no está configurado: las entradas con precio quedan como pendientes y se cobran en la puerta.</p>
        ) : payments.sandbox ? (
          <p className="pill pending" style={{ height: 'auto', padding: '8px 12px', whiteSpace: 'normal' }}>Wompi está en modo de pruebas: los pagos no son reales.</p>
        ) : null}
      </div>

      {event ? (
        <nav className="row" style={{ gap: 6, flexWrap: 'wrap' }} aria-label="Secciones del evento">
          {[['registros', `Registros · ${registrations.filter((r) => r.status !== 'cancelled').length}`], ['resumen', 'Resumen'], ['editar', 'Editar evento']].map(([k, l]) => (
            <button key={k} type="button" className="chip" aria-pressed={tab === k} onClick={() => setTab(k)}>{l}</button>
          ))}
        </nav>
      ) : null}

      {tab === 'registros' && event ? <Registrations event={event} tickets={tickets} regs={registrations} publicBase={publicBase} say={say} refresh={() => router.refresh()} /> : null}
      {tab === 'resumen' && event ? <Summary tickets={tickets} regs={registrations} /> : null}
      {tab === 'editar' ? <Editor event={event} tickets={tickets} say={say} onSaved={(id, created) => { if (created) router.push(`/admin/eventos/${id}`); else router.refresh(); }} /> : null}

      {toast ? <div className="toast" role="status">{toast}</div> : null}
    </>
  );
}

/* ---------------- Registros ---------------- */
function Registrations({ event, tickets, regs, publicBase, say, refresh }) {
  const [filter, setFilter] = useState('todos');
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(null);
  const [busy, setBusy] = useState('');
  const [confirmCancel, setConfirmCancel] = useState(null);
  const [adding, setAdding] = useState(false);

  const list = useMemo(() => {
    const n = query.trim().toLowerCase();
    return regs.filter((r) => {
      if (filter === 'pagados' && r.status !== 'paid') return false;
      if (filter === 'pendientes' && r.status !== 'pending') return false;
      if (filter === 'llegaron' && !r.checkedInAt) return false;
      if (filter === 'faltan' && (r.checkedInAt || r.status !== 'paid')) return false;
      if (filter === 'anulados' && r.status !== 'cancelled') return false;
      if (filter !== 'anulados' && r.status === 'cancelled') return false;
      if (n && !(`${r.name} ${r.phone} ${r.email} ${r.code}`.toLowerCase().includes(n))) return false;
      return true;
    });
  }, [regs, filter, query]);

  async function act(code, action, extra = {}) {
    setBusy(code + action);
    const res = await fetch('/api/admin/registros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, action, ...extra })
    }).catch(() => null);
    setBusy('');
    setConfirmCancel(null);
    if (!res?.ok) { say('No se pudo guardar'); return; }
    say({ pay: 'Pago registrado', checkin: 'Ingreso marcado', undo: 'Ingreso deshecho', cancel: 'Registro anulado', restore: 'Registro restaurado' }[action] || 'Guardado');
    refresh();
  }

  function waLink(r) {
    const phone = r.phone.length === 10 ? `57${r.phone}` : r.phone;
    const text = r.status === 'paid'
      ? `Hola ${r.name.split(' ')[0]}, este es tu pase para ${event.name} de Nakecloud: ${publicBase}/pase/${r.code}\nMuestra el QR en la entrada.`
      : `Hola ${r.name.split(' ')[0]}, tu registro para ${event.name} está pendiente de pago (${moneyPlain(r.amount)}). Puedes pagar aquí: ${publicBase}/pagar/${r.code}`;
    return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  }

  return (
    <section className="stack" style={{ gap: 14 }}>
      <div className="row" style={{ flexWrap: 'wrap', gap: 10 }}>
        <input className="field" style={{ flex: '1 1 260px', height: 48 }} placeholder="Buscar nombre, celular, correo o código" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Buscar registros" />
        <a className="chip" href={`/api/admin/csv?evento=${event.id}`}>Exportar CSV</a>
        <button type="button" className="chip" aria-pressed={adding} onClick={() => setAdding((v) => !v)}>Agregar a mano</button>
      </div>
      <div className="row" style={{ flexWrap: 'wrap', gap: 6 }}>
        {[['todos', 'Todos'], ['pagados', 'Pagados'], ['pendientes', 'Pendientes'], ['llegaron', 'Llegaron'], ['faltan', 'Faltan por llegar'], ['anulados', 'Anulados']].map(([k, l]) => (
          <button key={k} type="button" className="chip" aria-pressed={filter === k} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {adding ? <ManualAdd event={event} tickets={tickets} say={say} done={() => { setAdding(false); refresh(); }} /> : null}

      {list.length === 0 ? (
        <div className="card"><span className="muted">{regs.length ? 'Nadie coincide con ese filtro.' : 'Aún no hay registros. Comparte el link en tus historias o agrega a alguien a mano.'}</span></div>
      ) : (
        <div className="list">
          {list.map((r) => (
            <div key={r.code} className="list-row" style={{ cursor: 'pointer' }} onClick={() => setOpen(open === r.code ? null : r.code)}>
              <span style={{ fontWeight: 600 }}>{r.name}</span>
              <span className="row" style={{ gap: 6, justifyContent: 'flex-end' }}>
                <span className={`pill ${r.status === 'paid' && r.amount === 0 ? 'free' : r.status}`}>{r.status === 'paid' && r.amount === 0 ? 'Gratis' : STATUS_LABEL[r.status]}</span>
                {r.checkedInAt ? <span className="pill in">Llegó {timeOf(r.checkedInAt)}</span> : null}
              </span>
              <span className="meta">{r.ticketName} · <span className="num">{money(r.amount)}</span> · <span className="mono">{r.code}</span></span>
              <span className="meta" style={{ textAlign: 'right' }}>{r.status === 'paid' ? `${r.method || ''} · ${stamp(r.paidAt)}` : stamp(r.createdAt)}</span>
              {open === r.code ? (
                <div style={{ gridColumn: '1 / -1', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }} onClick={(e) => e.stopPropagation()}>
                  <span className="small muted">{r.phone ? `WhatsApp ${r.phone}` : 'Sin celular'}{r.email ? ` · ${r.email}` : ''}{r.wompiStatus && r.status === 'pending' ? ` · Último intento en Wompi: ${r.wompiStatus}` : ''}{r.notes ? ` · ${r.notes}` : ''}</span>
                  <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
                    {r.status === 'pending' ? MANUAL_METHODS.slice(0, 3).map((m) => (
                      <button key={m} type="button" className="chip" disabled={!!busy} onClick={() => act(r.code, 'pay', { method: m })}>Pagó en {m.toLowerCase()}</button>
                    )) : null}
                    {r.status === 'paid' && !r.checkedInAt ? <button type="button" className="chip" disabled={!!busy} onClick={() => act(r.code, 'checkin')}>Marcar ingreso</button> : null}
                    {r.checkedInAt ? <button type="button" className="chip" disabled={!!busy} onClick={() => act(r.code, 'undo')}>Deshacer ingreso</button> : null}
                    {r.phone ? <a className="chip" href={waLink(r)} target="_blank" rel="noopener noreferrer">{r.status === 'paid' ? 'Enviar pase por WhatsApp' : 'Recordar pago por WhatsApp'}</a> : null}
                    {r.status === 'paid' ? <a className="chip" href={`/pase/${r.code}`} target="_blank" rel="noopener noreferrer">Ver pase</a> : null}
                    {r.status === 'cancelled' ? (
                      <button type="button" className="chip" onClick={() => act(r.code, 'restore')}>Restaurar</button>
                    ) : confirmCancel === r.code ? (
                      <>
                        <button type="button" className="chip" style={{ color: 'var(--bad)', borderColor: 'var(--bad)' }} onClick={() => act(r.code, 'cancel')}>Sí, anular · su QR deja de servir</button>
                        <button type="button" className="chip" onClick={() => setConfirmCancel(null)}>No</button>
                      </>
                    ) : (
                      <button type="button" className="chip" style={{ color: 'var(--bad)' }} onClick={() => setConfirmCancel(r.code)}>Anular</button>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      )}
      {busy ? <span className="small faint row"><Spinner size={14} /> Guardando</span> : null}
    </section>
  );
}

function ManualAdd({ event, tickets, say, done }) {
  const active = tickets.filter((t) => t.active);
  const [f, setF] = useState({ name: '', phone: '', email: '', ticketId: active[0]?.id || '', amount: active[0]?.price || 0, status: 'paid', method: active[0]?.price ? 'Efectivo' : 'Cortesía', notes: '' });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  async function save(e) {
    e.preventDefault();
    if (f.name.trim().length < 3) { say('Escribe el nombre'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/registros', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...f, eventId: event.id, amount: Number(f.amount) || 0 })
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { const d = await res?.json().catch(() => ({})); say(d?.error || 'No se pudo registrar'); return; }
    say('Registrado');
    done();
  }

  return (
    <form className="card" onSubmit={save}>
      <span className="h3">Agregar a mano</span>
      <div className="form-grid">
        <label className="label" htmlFor="m_name">Nombre<input id="m_name" className="field" value={f.name} onChange={set('name')} /></label>
        <label className="label" htmlFor="m_phone">WhatsApp<input id="m_phone" className="field" inputMode="tel" value={f.phone} onChange={set('phone')} /></label>
        <label className="label" htmlFor="m_email">Correo<input id="m_email" className="field" value={f.email} onChange={set('email')} /></label>
        <label className="label" htmlFor="m_ticket">Entrada
          <select id="m_ticket" className="field" value={f.ticketId} onChange={(e) => { const t = active.find((x) => x.id === e.target.value); setF((s) => ({ ...s, ticketId: e.target.value, amount: t?.price || 0, method: t?.price ? s.method === 'Cortesía' ? 'Efectivo' : s.method : 'Cortesía' })); }}>
            {active.map((t) => <option key={t.id} value={t.id}>{t.name} · {money(t.price)}</option>)}
          </select>
        </label>
        <label className="label" htmlFor="m_amount">Valor cobrado (COP)<input id="m_amount" className="field num" type="number" min="0" step="1000" value={f.amount} onChange={set('amount')} /></label>
        <label className="label" htmlFor="m_status">Estado
          <select id="m_status" className="field" value={f.status} onChange={set('status')}><option value="paid">Pagado</option><option value="pending">Pendiente</option></select>
        </label>
        <label className="label" htmlFor="m_method">Medio
          <select id="m_method" className="field" value={f.method} onChange={set('method')}>{MANUAL_METHODS.map((m) => <option key={m}>{m}</option>)}</select>
        </label>
        <label className="label" htmlFor="m_notes">Notas<input id="m_notes" className="field" value={f.notes} onChange={set('notes')} placeholder="Invitado de…, talla…" /></label>
      </div>
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary btn-sm" style={{ width: 'auto' }} disabled={busy}>{busy ? <Spinner /> : 'Registrar y generar QR'}</button>
      </div>
    </form>
  );
}

/* ---------------- Resumen ---------------- */
function Summary({ tickets, regs }) {
  const live = regs.filter((r) => r.status !== 'cancelled');
  const paid = live.filter((r) => r.status === 'paid');
  const pending = live.filter((r) => r.status === 'pending');
  const revenue = paid.reduce((a, r) => a + r.amount, 0);
  const owed = pending.reduce((a, r) => a + r.amount, 0);
  const inside = live.filter((r) => r.checkedInAt).length;
  const byMethod = {};
  for (const r of paid) { const m = r.amount === 0 ? 'Gratis / cortesía' : (r.method || 'Otro'); byMethod[m] = byMethod[m] || { n: 0, v: 0 }; byMethod[m].n++; byMethod[m].v += r.amount; }

  return (
    <section className="stack" style={{ gap: 18 }}>
      <div className="stats">
        <div className="stat"><span>Confirmados</span><b>{paid.length}</b></div>
        <div className="stat"><span>Recaudado</span><b>{moneyPlain(revenue)}</b></div>
        <div className="stat"><span>Pendientes</span><b>{pending.length}</b><span>{moneyPlain(owed)} por cobrar</span></div>
        <div className="stat"><span>Han llegado</span><b>{inside}<span style={{ fontSize: 16, color: 'var(--faint)' }}> / {paid.length}</span></b></div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="h3">Por tipo de entrada</span>
        <div className="table-wrap"><table>
          <thead><tr><th>Entrada</th><th className="r">Precio</th><th className="r">Confirmados</th><th className="r">Pendientes</th><th className="r">Recaudado</th><th className="r">Llegaron</th></tr></thead>
          <tbody>{tickets.map((t) => {
            const rs = live.filter((r) => r.ticketId === t.id);
            const p = rs.filter((r) => r.status === 'paid');
            return <tr key={t.id}><td>{t.name}{!t.active ? ' (oculta)' : ''}</td><td className="r">{money(t.price)}</td><td className="r">{p.length}{t.capacity != null ? ` / ${t.capacity}` : ''}</td><td className="r">{rs.filter((r) => r.status === 'pending').length}</td><td className="r">{moneyPlain(p.reduce((a, r) => a + r.amount, 0))}</td><td className="r">{rs.filter((r) => r.checkedInAt).length}</td></tr>;
          })}</tbody>
        </table></div>
      </div>
      <div className="stack" style={{ gap: 8 }}>
        <span className="h3">Por medio de pago</span>
        <div className="table-wrap"><table>
          <thead><tr><th>Medio</th><th className="r">Pagos</th><th className="r">Total</th></tr></thead>
          <tbody>{Object.keys(byMethod).length ? Object.entries(byMethod).sort((a, b) => b[1].v - a[1].v).map(([m, o]) => <tr key={m}><td>{m}</td><td className="r">{o.n}</td><td className="r">{moneyPlain(o.v)}</td></tr>) : <tr><td colSpan={3} className="muted">Todavía no hay pagos confirmados.</td></tr>}</tbody>
        </table></div>
      </div>
    </section>
  );
}

/** Reduce la foto a máx. 1920 px y la pasa a JPEG liviano antes de subirla. */
async function compressImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const max = 1920;
    const scale = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.naturalWidth * scale);
    canvas.height = Math.round(img.naturalHeight * scale);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    let quality = 0.82;
    let data = canvas.toDataURL('image/jpeg', quality);
    while (data.length > 1_400_000 && quality > 0.45) { quality -= 0.1; data = canvas.toDataURL('image/jpeg', quality); }
    return data;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/* ---------------- Editor ---------------- */
function Editor({ event, tickets, say, onSaved }) {
  const [f, setF] = useState({
    name: event?.name || '',
    organizer: event?.organizer || 'Nakecloud',
    eyebrow: event ? event.eyebrow : 'Evento de comunidad',
    slug: event?.slug || '',
    tagline: event?.tagline || '',
    startsLocal: toLocalInput(event?.startsAt),
    place: event?.place || '',
    placeUrl: event?.placeUrl || '',
    capacity: event?.capacity ?? '',
    status: event?.status || 'draft'
  });
  const [ts, setTs] = useState(tickets.length ? tickets.map((t) => ({ ...t, capacity: t.capacity ?? '' })) : [
    { id: tempId(), name: 'Solo entreno', description: 'La sesión guiada', price: 25000, capacity: '', active: true },
    { id: tempId(), name: 'Entreno + comida', description: 'Sesión y brunch después', price: 45000, capacity: '', active: true }
  ]);
  const [busy, setBusy] = useState(false);
  // Imagen: null = sin cambios, '' = quitarla, 'data:...' = nueva (ya comprimida)
  const [image, setImage] = useState(null);
  const [imageBusy, setImageBusy] = useState(false);
  const preview = image === null ? (event?.imageUrl || '') : image;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const setT = (i, k) => (e) => setTs((list) => list.map((t, j) => (j === i ? { ...t, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value } : t)));

  async function pickImage(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) { say('Elige una imagen (JPG, PNG o WebP)'); return; }
    setImageBusy(true);
    try { setImage(await compressImage(file)); } catch { say('No se pudo leer esa imagen'); }
    setImageBusy(false);
  }

  async function save(e) {
    e.preventDefault();
    if (!f.name.trim()) { say('Ponle nombre al evento'); return; }
    if (!ts.some((t) => t.name.trim() && t.active)) { say('Agrega al menos una entrada visible'); return; }
    setBusy(true);
    const res = await fetch('/api/admin/eventos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: event?.id, ...f, tickets: ts.filter((t) => t.name.trim()).map((t, i) => ({ ...t, sort: i })) })
    }).catch(() => null);
    const d = await res?.json().catch(() => ({}));
    if (!res?.ok) { setBusy(false); say(d?.error || 'No se pudo guardar'); return; }

    if (image !== null) {
      const imgRes = image
        ? await fetch('/api/admin/eventos/imagen', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: d.id, dataUrl: image }) }).catch(() => null)
        : await fetch(`/api/admin/eventos/imagen?id=${encodeURIComponent(d.id)}`, { method: 'DELETE' }).catch(() => null);
      if (!imgRes?.ok) {
        const err = await imgRes?.json().catch(() => ({}));
        setBusy(false);
        say(err?.error || 'El evento se guardó, pero la imagen no. Intenta de nuevo.');
        onSaved(d.id, !event);
        return;
      }
    }
    setBusy(false);
    setImage(null);
    say('Evento guardado');
    onSaved(d.id, !event);
  }

  return (
    <form className="stack" style={{ gap: 18 }} onSubmit={save}>
      <div className="card">
        <div className="between"><span className="h3">Imagen de fondo</span><span className="small faint">Vertical u horizontal · se ve detrás de la portada</span></div>
        <div
          style={{
            position: 'relative', borderRadius: 18, overflow: 'hidden', border: '1px solid var(--line-2)',
            aspectRatio: '16 / 9', maxWidth: '100%', background: preview ? `#000 center / cover no-repeat url("${preview}")` : 'var(--bg)',
            display: 'flex', alignItems: 'flex-end'
          }}
        >
          <div style={{ position: 'absolute', inset: 0, background: preview ? 'linear-gradient(180deg, rgba(0,0,0,.15), rgba(0,0,0,.75))' : 'transparent' }} />
          <div style={{ position: 'relative', padding: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span className="brand" style={{ fontSize: 11 }}>{(f.organizer || 'Nakecloud').toUpperCase()}</span>
            {f.eyebrow ? <span className="eyebrow" style={{ fontSize: 10 }}>{f.eyebrow}</span> : null}
            <span style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-.03em', lineHeight: 1 }}>{f.name || 'Nombre del evento'}</span>
            {!preview ? <span className="small faint">Sin imagen: se usa el fondo negro con la órbita.</span> : null}
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
          <label className="chip" htmlFor="e_image" style={{ cursor: 'pointer' }}>
            {imageBusy ? <Spinner size={14} /> : null}{preview ? 'Cambiar imagen' : 'Subir imagen'}
          </label>
          <input id="e_image" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/*" onChange={pickImage} hidden />
          {preview ? <button type="button" className="chip" onClick={() => setImage('')}>Quitar imagen</button> : null}
          {image ? <span className="small faint" style={{ alignSelf: 'center' }}>Se guarda al tocar “{event ? 'Guardar cambios' : 'Crear evento'}”</span> : null}
        </div>
      </div>

      <div className="card">
        <span className="h3">Evento</span>
        <div className="form-grid">
          <label className="label" htmlFor="e_name">Nombre<input id="e_name" className="field" value={f.name} onChange={set('name')} placeholder="Entreno + brunch" /></label>
          <label className="label" htmlFor="e_org">Organizador (sale arriba y en el pase)<input id="e_org" className="field" value={f.organizer} onChange={set('organizer')} placeholder="Nakecloud" maxLength={60} /></label>
          <label className="label" htmlFor="e_eyebrow">Texto sobre el título (vacío = no se muestra)<input id="e_eyebrow" className="field" value={f.eyebrow} onChange={set('eyebrow')} placeholder="Evento de comunidad" maxLength={60} /></label>
          <label className="label" htmlFor="e_when">Fecha y hora (Bogotá)<input id="e_when" type="datetime-local" className="field" value={f.startsLocal} onChange={set('startsLocal')} /></label>
          <label className="label" htmlFor="e_place">Lugar<input id="e_place" className="field" value={f.place} onChange={set('place')} placeholder="Parque de la 93" /></label>
          <label className="label" htmlFor="e_map">Link de Google Maps (opcional)<input id="e_map" className="field" value={f.placeUrl} onChange={set('placeUrl')} placeholder="https://maps.app.goo.gl/…" /></label>
          <label className="label" htmlFor="e_cap">Cupo total (vacío = sin límite)<input id="e_cap" type="number" min="1" className="field num" value={f.capacity} onChange={set('capacity')} /></label>
          <label className="label" htmlFor="e_status">Estado
            <select id="e_status" className="field" value={f.status} onChange={set('status')}>{STATUS_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          </label>
          <label className="label" htmlFor="e_slug">Dirección corta (opcional)<input id="e_slug" className="field mono" value={f.slug} onChange={set('slug')} placeholder="se crea sola con el nombre" /></label>
        </div>
        <label className="label" htmlFor="e_tag">Frase de portada<textarea id="e_tag" className="field" value={f.tagline} onChange={set('tagline')} placeholder="Entrenamos juntos y después compartimos mesa. Regístrate y recibe tu QR al instante." maxLength={180} /></label>
      </div>

      <div className="card">
        <div className="between"><span className="h3">Entradas</span><span className="small faint">Precio 0 = gratis</span></div>
        {ts.map((t, i) => (
          <div key={t.id} className="stack" style={{ gap: 10, paddingTop: i ? 14 : 0, borderTop: i ? '1px solid var(--line)' : 0 }}>
            <div className="ticket-edit">
              <label className="label wide" htmlFor={`t_name_${i}`}>Nombre<input id={`t_name_${i}`} className="field" value={t.name} onChange={setT(i, 'name')} /></label>
              <label className="label" htmlFor={`t_price_${i}`}>Precio (COP)<input id={`t_price_${i}`} type="number" min="0" step="1000" className="field num" value={t.price} onChange={setT(i, 'price')} /></label>
              <label className="label" htmlFor={`t_cap_${i}`}>Cupo<input id={`t_cap_${i}`} type="number" min="1" className="field num" value={t.capacity} onChange={setT(i, 'capacity')} placeholder="∞" /></label>
              <label className="row small muted" htmlFor={`t_on_${i}`} style={{ height: 56 }}><input id={`t_on_${i}`} type="checkbox" checked={t.active} onChange={setT(i, 'active')} /> Visible</label>
            </div>
            <label className="label" htmlFor={`t_desc_${i}`}>Qué incluye<input id={`t_desc_${i}`} className="field" value={t.description} onChange={setT(i, 'description')} placeholder="Sesión y brunch después" /></label>
          </div>
        ))}
        <div className="row"><button type="button" className="chip" onClick={() => setTs((l) => [...l, { id: tempId(), name: '', description: '', price: 0, capacity: '', active: true }])}>+ Agregar entrada</button></div>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" style={{ width: 'auto', minWidth: 220 }} disabled={busy}>{busy ? <Spinner /> : event ? 'Guardar cambios' : 'Crear evento'}</button>
      </div>
    </form>
  );
}
