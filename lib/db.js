import 'server-only';
import { neon } from '@neondatabase/serverless';

let client = null;
let ready = null;

function connection() {
  if (!client) {
    const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!url) throw new Error('Falta DATABASE_URL: conecta la base de datos en Vercel (Storage → Neon).');
    client = neon(url);
  }
  return client;
}

const SCHEMA = [
  `create table if not exists events (
    id text primary key,
    slug text unique not null,
    name text not null,
    tagline text,
    description text,
    starts_at timestamptz,
    place text,
    place_url text,
    capacity int,
    status text not null default 'draft',
    created_at timestamptz not null default now()
  )`,
  `create table if not exists ticket_types (
    id text primary key,
    event_id text not null references events(id) on delete cascade,
    name text not null,
    description text,
    price int not null default 0,
    capacity int,
    sort int not null default 0,
    active boolean not null default true
  )`,
  `create table if not exists registrations (
    code text primary key,
    event_id text not null references events(id) on delete cascade,
    ticket_type_id text,
    ticket_name text not null,
    amount int not null default 0,
    name text not null,
    phone text,
    email text,
    status text not null default 'pending',
    method text,
    wompi_tx_id text,
    wompi_reference text,
    wompi_status text,
    paid_at timestamptz,
    checked_in_at timestamptz,
    notes text,
    created_at timestamptz not null default now()
  )`,
  `alter table events add column if not exists image_version int`,
  `create table if not exists event_images (
    event_id text primary key references events(id) on delete cascade,
    mime text not null,
    data text not null,
    updated_at timestamptz not null default now()
  )`,
  `create index if not exists registrations_event_idx on registrations(event_id)`,
  `create index if not exists ticket_types_event_idx on ticket_types(event_id)`
];

async function init() {
  const sql = connection();
  for (const statement of SCHEMA) await sql.query(statement);
}

/** Ejecuta una consulta parametrizada ($1, $2...) y devuelve las filas. */
export async function q(text, params = []) {
  if (!ready) ready = init().catch((err) => { ready = null; throw err; });
  await ready;
  return connection().query(text, params);
}

export const iso = (v) => (v ? new Date(v).toISOString() : null);
