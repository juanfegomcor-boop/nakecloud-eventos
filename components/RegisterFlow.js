'use client';

import { useMemo, useState } from 'react';
import { money, shortDate, timeOf, dotDate } from '@/lib/format';
import { Arrow, Back, Check, Lock, Spinner } from './icons';

export default function RegisterFlow({ event, tickets, payments }) {
  const available = tickets.filter((t) => !t.soldOut);
  const [step, setStep] = useState('home');
  const [ticketId, setTicketId] = useState(available.length === 1 ? available[0].id : (available[1] || available[0])?.id || null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const ticket = tickets.find((t) => t.id === ticketId) || null;
  const digits = phone.replace(/\D/g, '');
  const valid = name.trim().length >= 3 && digits.length >= 10 && (!email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  const paid = ticket && ticket.price > 0;
  const allSoldOut = tickets.length > 0 && available.length === 0;

  const facts = useMemo(() => ([
    ['FECHA', event.startsAt ? shortDate(event.startsAt) : 'Por definir'],
    ['HORA', event.startsAt ? timeOf(event.startsAt) : '—'],
    ['LUGAR', event.place || 'Por definir']
  ]), [event]);

  function start() {
    setError('');
    setStep(tickets.length > 1 ? 'tickets' : 'form');
  }

  async function submit(e) {
    e.preventDefault();
    if (!valid || !ticket || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/registro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId: event.id, ticketId: ticket.id, name: name.trim(), phone: digits, email: email.trim() })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No pudimos registrarte. Intenta de nuevo.');
      window.location.assign(data.next);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  if (step === 'home') {
    const closed = !event.open || allSoldOut || tickets.length === 0;
    return (
      <main className="screen">
        <svg className="orbit orbit-deco" aria-hidden="true" width="560" height="560" viewBox="0 0 560 560">
          <circle cx="280" cy="280" r="270" fill="none" stroke="#2A2A2E" />
          <circle cx="280" cy="280" r="200" fill="none" stroke="#1F1F23" strokeDasharray="2 10" />
          <circle cx="280" cy="10" r="4" fill="#F5F5F7" />
        </svg>
        <div className="between rise" style={{ position: 'relative' }}>
          <span className="brand">NAKECLOUD</span>
          <span className={`live${closed ? ' off' : ''}`}>{closed ? (allSoldOut ? 'Cupos agotados' : 'Inscripciones cerradas') : 'Inscripciones abiertas'}</span>
        </div>
        <div className="grow" />
        <div className="stack" style={{ gap: 22, position: 'relative' }}>
          <div className="eyebrow rise d1">Evento de comunidad{event.startsAt ? ` · ${dotDate(event.startsAt)}` : ''}</div>
          <h1 className="display rise d2">{event.name}</h1>
          {event.tagline ? <p className="lede rise d3">{event.tagline}</p> : null}
          <div className="facts rise d4">
            {facts.map(([k, v]) => <div key={k}><span>{k}</span><span>{v}</span></div>)}
          </div>
          <div className="stack rise d5">
            <button type="button" className="btn btn-primary" onClick={start} disabled={closed}>
              {closed ? (allSoldOut ? 'Cupos agotados' : 'Inscripciones cerradas') : <>Registrarme <Arrow /></>}
            </button>
            {!closed ? <span className="small faint center">Toma menos de un minuto</span> : null}
          </div>
        </div>
      </main>
    );
  }

  if (step === 'tickets') {
    return (
      <main className="screen" key="tickets">
        <div className="between fade">
          <button type="button" className="icon-btn" onClick={() => setStep('home')} aria-label="Volver"><Back /></button>
          <span className="mono small faint">1 / 2</span>
        </div>
        <h2 className="title rise">Elige tu<br />entrada</h2>
        <div className="stack">
          {tickets.map((t, i) => (
            <button
              key={t.id}
              type="button"
              className={`option rise d${Math.min(i + 1, 6)}`}
              aria-pressed={t.id === ticketId}
              disabled={t.soldOut}
              onClick={() => setTicketId(t.id)}
            >
              <span className="stack" style={{ gap: 6 }}>
                <span className="name">{t.name}</span>
                <span className="desc">{t.soldOut ? 'Agotado' : t.description}</span>
              </span>
              <span className="row" style={{ gap: 14 }}>
                <span className="num" style={{ fontSize: 17, fontWeight: 500 }}>{money(t.price)}</span>
                <span className="radio">{t.id === ticketId ? <Check size={12} color="#000" /> : null}</span>
              </span>
            </button>
          ))}
        </div>
        <div className="grow" />
        <button type="button" className="btn btn-primary" disabled={!ticket || ticket.soldOut} onClick={() => setStep('form')}>
          {ticket ? `Continuar · ${money(ticket.price)}` : 'Elige una entrada'}
        </button>
      </main>
    );
  }

  return (
    <main className="screen" key="form">
      <div className="between fade">
        <button type="button" className="icon-btn" onClick={() => setStep(tickets.length > 1 ? 'tickets' : 'home')} aria-label="Volver"><Back /></button>
        <span className="mono small faint">{tickets.length > 1 ? '2 / 2' : '1 / 1'}</span>
      </div>
      <div className="stack rise" style={{ gap: 10 }}>
        <h2 className="title">Tus datos</h2>
        <span className="muted" style={{ fontSize: 15 }}>{ticket?.name} · {money(ticket?.price)}</span>
      </div>
      <form id="reg" className="stack rise d1" style={{ gap: 14 }} onSubmit={submit} noValidate>
        <label className="label" htmlFor="f_name">Nombre completo
          <input id="f_name" className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Cómo te llamas" required />
        </label>
        <label className="label" htmlFor="f_phone">WhatsApp
          <input id="f_phone" className="field num" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="300 000 0000" required />
        </label>
        <label className="label" htmlFor="f_email">Correo (opcional)
          <input id="f_email" className="field" value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="tu@correo.com" />
        </label>
        {error ? <p className="error" role="alert">{error}</p> : null}
      </form>
      <div className="grow" />
      <div className="stack">
        <button type="submit" form="reg" className="btn btn-primary" disabled={!valid || busy}>
          {busy ? <><Spinner /> {paid && payments ? 'Abriendo pago seguro' : 'Registrando'}</> : paid && payments ? `Pagar ${money(ticket.price)}` : 'Confirmar registro'}
        </button>
        <span className="small faint center row" style={{ justifyContent: 'center', gap: 6 }}>
          {paid && payments ? <><Lock /> Pago seguro con Wompi · Nequi, PSE, tarjeta</> : 'Tu QR aparece apenas confirmes'}
        </span>
      </div>
    </main>
  );
}
