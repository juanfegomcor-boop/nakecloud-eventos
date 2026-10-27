export default function manifest() {
  return {
    name: 'Nakecloud',
    short_name: 'Nakecloud',
    description: 'Eventos de la comunidad Nakecloud y tu pase de entrada.',
    start_url: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' }
    ]
  };
}
