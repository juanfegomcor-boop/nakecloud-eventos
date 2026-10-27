'use client';

export default function TopBar({ current }) {
  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' }).catch(() => {});
    window.location.assign('/admin/login');
  }
  return (
    <header className="topbar">
      <a href="/admin" className="brand" style={{ textDecoration: 'none' }}>NAKECLOUD</a>
      <nav aria-label="Panel">
        <a className="chip" href="/admin" aria-current={current === 'eventos' ? 'page' : undefined}>Eventos</a>
        <a className="chip" href="/admin/puerta" aria-current={current === 'puerta' ? 'page' : undefined}>Puerta</a>
        <button type="button" className="chip" onClick={logout}>Salir</button>
      </nav>
    </header>
  );
}
