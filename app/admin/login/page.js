import { redirect } from 'next/navigation';
import { isAdmin } from '@/lib/auth';
import LoginForm from '@/components/admin/LoginForm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Panel', robots: { index: false, follow: false } };

export default async function LoginPage() {
  if (await isAdmin()) redirect('/admin');
  const configured = Boolean(process.env.ADMIN_PASSWORD);
  return (
    <main className="screen">
      <span className="brand rise">NAKECLOUD</span>
      <div className="grow" />
      <div className="stack rise d1" style={{ gap: 10 }}>
        <h1 className="title">Panel de eventos</h1>
        <p className="lede">{configured ? 'Entra con la contraseña del equipo.' : 'Falta la variable ADMIN_PASSWORD en Vercel. Agrégala y vuelve a publicar.'}</p>
      </div>
      {configured ? <LoginForm /> : null}
      <div className="grow" />
    </main>
  );
}
