'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { money, stamp, timeOf, CODE_RE } from '@/lib/format';
import { Back, Bang, Check, Cross, Spinner } from '../icons';

const TONE = {
  ok: { color: 'var(--ok)', label: 'PUEDE ENTRAR', Icon: Check },
  warn: { color: 'var(--warn)', label: 'DEBE PAGAR', Icon: Bang },
  bad: { color: 'var(--bad)', label: 'NO PUEDE ENTRAR', Icon: Cross }
};

export default function Scanner({ events, initialEventId }) {
  const [eventId, setEventId] = useState(initialEventId);
  const [camera, setCamera] = useState('idle'); // idle | starting | on | denied | unavailable
  const [result, setResult] = useState(null); // { tone, title, reg, eventName, message }
  const [counts, setCounts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [manual, setManual] = useState('');
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const pausedRef = useRef(false);
  const lastRef = useRef({ code: '', at: 0 });
  const eventRef = useRef(eventId);
  eventRef.current = eventId;

  const lookup = useCallback(async (text) => {
    const code = String(text || '').toUpperCase().match(CODE_RE)?.[0] || String(text || '').toUpperCase().trim();
    pausedRef.current = true;
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/lookup?code=${encodeURIComponent(code)}&evento=${encodeURIComponent(eventRef.current || '')}`, { cache: 'no-store' });
      if (res.status === 401) { window.location.assign('/admin/login'); return; }
      const data = await res.json();
      if (data.counts) setCounts(data.counts);
      const reg = data.registration;
      let tone; let title;
      if (!reg) { tone = 'bad'; title = data.error || 'Código no encontrado'; }
      else if (reg.eventId !== eventRef.current) { tone = 'bad'; title = `Es de otro evento: ${data.eventName}`; }
      else if (reg.status === 'cancelled') { tone = 'bad'; title = 'Registro anulado'; }
      else if (reg.checkedInAt) { tone = 'bad'; title = `Ya entró a las ${timeOf(reg.checkedInAt)}`; }
      else if (reg.status === 'pending') { tone = 'warn'; title = `Debe ${money(reg.amount)}`; }
      else { tone = 'ok'; title = 'Puede entrar'; }
      setResult({ tone, title, reg });
      try { navigator.vibrate?.(tone === 'ok' ? 60 : [80, 60, 80]); } catch {}
    } catch {
      setResult({ tone: 'bad', title: 'Sin conexión. Intenta de nuevo.', reg: null });
    } finally {
      setBusy(false);
    }
  }, []);

  // Cámara
  const startCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setCamera('unavailable'); return; }
    setCamera('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play();
      setCamera('on');
    } catch (err) {
      setCamera(err?.name === 'NotAllowedError' ? 'denied' : 'unavailable');
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => { streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [startCamera]);

  // Lectura continua del QR
  useEffect(() => {
    if (camera !== 'on') return;
    let raf; let last = 0;
    const detector = typeof window !== 'undefined' && 'BarcodeDetector' in window ? new window.BarcodeDetector({ formats: ['qr_code'] }) : null;
    async function loop(t) {
      raf = requestAnimationFrame(loop);
      if (pausedRef.current || t - last < 180) return;
      last = t;
      const video = videoRef.current;
      if (!video || video.readyState < 2) return;
      let text = null;
      try {
        if (detector) {
          const codes = await detector.detect(video);
          text = codes[0]?.rawValue || null;
        } else {
          const canvas = canvasRef.current;
          const w = 480; const h = Math.round((video.videoHeight / video.videoWidth) * w) || 360;
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(video, 0, 0, w, h);
          text = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' })?.data || null;
        }
      } catch {}
      if (!text) return;
      const now = Date.now();
      if (text === lastRef.current.code && now - lastRef.current.at < 4000) return;
      lastRef.current = { code: text, at: now };
      lookup(text);
    }
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [camera, lookup]);

  // Conteo inicial / al cambiar de evento
  useEffect(() => {
    let alive = true;
    fetch(`/api/admin/lookup?evento=${encodeURIComponent(eventId || '')}`, { cache: 'no-store' })
      .then((r) => r.json()).then((d) => { if (alive && d.counts) setCounts(d.counts); }).catch(() => {});
    return () => { alive = false; };
  }, [eventId]);

  function close() {
    setResult(null);
    setManual('');
    setTimeout(() => { pausedRef.current = false; }, 400);
  }

  async function act(action, method) {
    if (!result?.reg) return;
    setBusy(true);
    const res = await fetch('/api/admin/registros', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: result.reg.code, action, method })
    }).catch(() => null);
    setBusy(false);
    if (!res?.ok) { setResult((r) => ({ ...r, tone: 'bad', title: 'No se pudo guardar. Intenta de nuevo.' })); return; }
    setCounts((c) => (c ? { ...c, inside: c.inside + 1, total: c.total + (action === 'pay-checkin' ? 1 : 0) } : c));
    try { navigator.vibrate?.(40); } catch {}
    close();
  }

  const tone = result ? TONE[result.tone] : null;
  const reg = result?.reg;

  return (
    <div className="scanner">
      <video ref={videoRef} playsInline muted aria-hidden="true" />
      <canvas ref={canvasRef} hidden />
      <div className="shade" />

      <div className="scan-top">
        <div className="row" style={{ gap: 10, minWidth: 0 }}>
          <a className="icon-btn" href="/admin" aria-label="Volver al panel" style={{ background: 'rgba(0,0,0,.4)' }}><Back /></a>
          <label htmlFor="ev" className="stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="brand" style={{ fontSize: 11, color: 'var(--faint)' }}>PUERTA</span>
            <select id="ev" value={eventId || ''} onChange={(e) => setEventId(e.target.value)} style={{ background: 'transparent', border: 0, color: 'var(--ink)', font: '600 17px var(--font)', maxWidth: 200, padding: 0 }}>
              {events.map((e) => <option key={e.id} value={e.id} style={{ color: '#000' }}>{e.name}</option>)}
            </select>
          </label>
        </div>
        <div className="stack" style={{ alignItems: 'flex-end', gap: 2 }}>
          <span className="num" style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-.02em' }}>{counts ? counts.inside : '–'}<span style={{ color: 'var(--faint)', fontSize: 16 }}> / {counts ? counts.total : '–'}</span></span>
          <span className="small faint">adentro</span>
        </div>
      </div>

      <div className="frame" aria-hidden="true"><i /><i /><i /><i />{camera === 'on' && !result ? <span className="scanline" /> : null}</div>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 'calc(38% + 150px)', padding: '0 24px', textAlign: 'center' }}>
        {camera === 'on' ? <span className="muted small">Apunta al QR del asistente</span> : null}
        {camera === 'starting' || camera === 'idle' ? <span className="muted small row" style={{ justifyContent: 'center', gap: 8 }}><Spinner size={16} /> Abriendo cámara</span> : null}
        {camera === 'denied' ? (
          <div className="stack" style={{ alignItems: 'center' }}>
            <span className="muted small">El navegador bloqueó la cámara. Permite el acceso en la configuración del sitio y vuelve a intentar.</span>
            <button type="button" className="chip" onClick={startCamera}>Intentar de nuevo</button>
          </div>
        ) : null}
        {camera === 'unavailable' ? <span className="muted small">No hay cámara disponible. Escribe el código abajo.</span> : null}
      </div>

      {!result ? (
        <form
          onSubmit={(e) => { e.preventDefault(); if (manual.trim()) lookup(manual); }}
          style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '0 20px max(24px, env(safe-area-inset-bottom))', display: 'flex', gap: 10 }}
        >
          <input className="field mono" value={manual} onChange={(e) => setManual(e.target.value.toUpperCase())} placeholder="O escribe el código NK…" aria-label="Código de entrada" style={{ background: 'rgba(14,14,16,.85)', letterSpacing: '.08em' }} />
          <button className="btn btn-primary" style={{ width: 'auto', padding: '0 22px' }} disabled={!manual.trim() || busy}>{busy ? <Spinner /> : 'Buscar'}</button>
        </form>
      ) : null}

      {result ? (
        <>
          <div className="scrim fade" onClick={close} />
          <div className="sheet sheet-in" role="dialog" aria-modal="true" aria-label="Resultado del escaneo">
            <span className="grabber" />
            <div className="row">
              <span className="verdict-icon" style={{ background: tone.color }}><tone.Icon color="#000" /></span>
              <div className="stack" style={{ gap: 2, minWidth: 0 }}>
                <span style={{ fontSize: 13, fontWeight: 600, letterSpacing: '.1em', color: tone.color }}>{result.title.toUpperCase()}</span>
                <span style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-.02em', overflowWrap: 'anywhere' }}>{reg ? reg.name : 'Sin registro'}</span>
              </div>
            </div>
            {reg ? (
              <>
                <div className="kv">
                  <div><span>ENTRADA</span><span>{reg.ticketName}</span></div>
                  <div><span>{reg.status === 'paid' ? 'PAGÓ' : 'VALOR'}</span><span className="num">{money(reg.amount)}</span></div>
                  <div><span>MEDIO</span><span>{reg.status === 'paid' ? (reg.method || '—') : 'Sin pagar'}</span></div>
                  <div><span>CUÁNDO</span><span>{reg.paidAt ? stamp(reg.paidAt) : '—'}</span></div>
                </div>
                <span className="mono small faint" style={{ letterSpacing: '.12em' }}>{reg.code}{reg.notes ? ` · ${reg.notes}` : ''}</span>
              </>
            ) : null}
            {result.tone === 'ok' ? (
              <button type="button" className="btn" style={{ background: 'var(--ok)', color: '#000' }} disabled={busy} onClick={() => act('checkin')}>{busy ? <Spinner /> : 'Marcar ingreso'}</button>
            ) : null}
            {result.tone === 'warn' ? (
              <div className="grid2">
                <button type="button" className="btn" style={{ background: 'var(--warn)', color: '#000', fontSize: 15 }} disabled={busy} onClick={() => act('pay-checkin', 'Efectivo')}>Pagó efectivo · entra</button>
                <button type="button" className="btn btn-line" style={{ fontSize: 15 }} disabled={busy} onClick={() => act('pay-checkin', 'Nequi')}>Pagó Nequi · entra</button>
              </div>
            ) : null}
            <button type="button" className="btn btn-text" onClick={close}>{result.tone === 'ok' || result.tone === 'warn' ? 'Cancelar' : 'Escanear otro'}</button>
          </div>
        </>
      ) : null}
    </div>
  );
}
