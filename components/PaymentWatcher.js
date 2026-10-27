'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Mientras Wompi confirma, pregunta cada 3 s hasta 2 minutos y refresca la página al cambiar. */
export default function PaymentWatcher({ code }) {
  const router = useRouter();
  useEffect(() => {
    let stop = false;
    let tries = 0;
    async function tick() {
      if (stop) return;
      tries += 1;
      try {
        const res = await fetch(`/api/pase/${code}`, { cache: 'no-store' });
        const data = await res.json();
        if (data.status !== 'pending' || ['DECLINED', 'ERROR', 'VOIDED', 'AMOUNT_MISMATCH'].includes(data.wompiStatus)) {
          window.location.replace(`/pase/${code}`);
          return;
        }
      } catch {}
      if (tries < 40) setTimeout(tick, 3000);
      else router.refresh();
    }
    const t = setTimeout(tick, 2500);
    return () => { stop = true; clearTimeout(t); };
  }, [code, router]);
  return null;
}
