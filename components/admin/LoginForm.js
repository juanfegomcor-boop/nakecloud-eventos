'use client';

import { useState } from 'react';
import { Spinner } from '../icons';

export default function LoginForm() {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    }).catch(() => null);
    if (res?.ok) { window.location.assign('/admin'); return; }
    setBusy(false);
    setError(res?.status === 429 ? 'Demasiados intentos. Espera un minuto.' : 'Contraseña incorrecta.');
  }

  return (
    <form className="stack rise d2" style={{ gap: 14 }} onSubmit={submit}>
      <label className="label" htmlFor="pw">Contraseña
        <input id="pw" type="password" className="field" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus />
      </label>
      {error ? <p className="error" role="alert">{error}</p> : null}
      <button className="btn btn-primary" disabled={!password || busy}>{busy ? <Spinner /> : 'Entrar'}</button>
    </form>
  );
}
