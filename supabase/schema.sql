-- Run this once in the Supabase SQL editor to create the orders table.
create table if not exists public.orders (
  id text primary key,
  created_at timestamptz not null default now(),
  status text not null,
  data jsonb not null
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Lock the table down: the website talks to it with the service role key,
-- which bypasses row level security. No public access.
alter table public.orders enable row level security;

-- Product details edited from the admin panel (/admin/products).
create table if not exists public.products (
  slug text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
