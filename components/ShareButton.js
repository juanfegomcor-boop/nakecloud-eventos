'use client';

import { useState } from 'react';

/** Comparte el pase con la hoja nativa del celular; si no existe, abre WhatsApp. */
export default function ShareButton({ url, text }) {
  const [copied, setCopied] = useState(false);
  async function share() {
    if (navigator.share) {
      try { await navigator.share({ title: 'Mi pase Nakecloud', text, url }); return; } catch (e) { if (e?.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
    window.open(`https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`, '_blank', 'noopener');
  }
  return (
    <button type="button" className="btn btn-text" onClick={share}>
      {copied ? 'Enlace copiado' : 'Enviármelo por WhatsApp'}
    </button>
  );
}
