import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' });

export const metadata = {
  title: { default: 'Nakecloud', template: '%s · Nakecloud' },
  description: 'Eventos de la comunidad Nakecloud. Regístrate y recibe tu QR de entrada al instante.',
  appleWebApp: { capable: true, title: 'Nakecloud', statusBarStyle: 'black-translucent' }
};

export const viewport = {
  themeColor: '#000000',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover'
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
