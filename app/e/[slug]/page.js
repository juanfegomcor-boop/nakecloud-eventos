import { notFound } from 'next/navigation';
import { getEventBySlug, getTickets, usedSeats, siteUrl } from '@/lib/data';
import { wompiReady } from '@/lib/wompi';
import { shortDate, timeOf } from '@/lib/format';
import RegisterFlow from '@/components/RegisterFlow';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug).catch(() => null);
  if (!event) return { title: 'Evento' };
  const when = event.startsAt ? `${shortDate(event.startsAt)} · ${timeOf(event.startsAt)}` : '';
  const base = await siteUrl();
  return {
    title: event.name,
    description: [when, event.place, event.tagline].filter(Boolean).join(' · '),
    openGraph: {
      title: event.name,
      description: event.tagline || 'Regístrate y recibe tu QR de entrada.',
      images: event.imageUrl ? [{ url: `${base}${event.imageUrl}` }] : undefined
    },
    twitter: event.imageUrl ? { card: 'summary_large_image', images: [`${base}${event.imageUrl}`] } : undefined
  };
}

export default async function EventPage({ params }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event || event.status === 'draft') notFound();

  const [tickets, seats] = await Promise.all([getTickets(event.id, { onlyActive: true }), usedSeats(event.id)]);
  const eventFull = event.capacity != null && seats.total >= event.capacity;
  const options = tickets.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    price: t.price,
    soldOut: eventFull || (t.capacity != null && (seats.byTicket[t.id] || 0) >= t.capacity)
  }));

  return (
    <RegisterFlow
      event={{
        id: event.id,
        name: event.name,
        tagline: event.tagline,
        description: event.description,
        startsAt: event.startsAt,
        place: event.place,
        imageUrl: event.imageUrl,
        open: event.status === 'open'
      }}
      tickets={options}
      payments={wompiReady()}
    />
  );
}
