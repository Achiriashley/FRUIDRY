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

-- Public folder for product photos uploaded from the admin panel.
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- Rate limiting for admin sign-in, orders and the contact form.
-- Keys are hashed visitor addresses; rows expire on their own.
create table if not exists public.rate_limits (
  key text primary key,
  count integer not null,
  reset_at timestamptz not null
);

alter table public.rate_limits enable row level security;

-- Atomically counts one attempt and returns the current count for the window.
create or replace function public.hit_rate_limit(p_key text, p_window_seconds integer)
returns table (count integer, reset_at timestamptz)
language sql
security definer
set search_path = public
as $$
  delete from public.rate_limits where reset_at < now() - interval '1 day';
  insert into public.rate_limits as r (key, count, reset_at)
  values (p_key, 1, now() + make_interval(secs => p_window_seconds))
  on conflict (key) do update set
    count = case when r.reset_at <= now() then 1 else r.count + 1 end,
    reset_at = case when r.reset_at <= now()
      then now() + make_interval(secs => p_window_seconds) else r.reset_at end
  returning r.count, r.reset_at;
$$;

-- Only the website's server (secret key) may call it; not the public/anon key.
revoke execute on function public.hit_rate_limit(text, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer) to service_role;
