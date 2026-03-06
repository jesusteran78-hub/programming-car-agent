-- Create auto_hub_inventory table
create table if not exists public.auto_hub_inventory (
  id uuid default gen_random_uuid() primary key,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  model text not null,
  trim text,
  year int not null,
  color text,
  vin text unique,
  price_local numeric,
  price_export numeric,
  status text default 'available' check (status in ('available', 'sold', 'reserved', 'incoming')),
  media_assets jsonb default '[]'::jsonb,
  features jsonb default '[]'::jsonb
);

-- Enable Row Level Security (RLS)
alter table public.auto_hub_inventory enable row level security;

-- Create policy to allow read access for everyone (for the landing page)
create policy "Allow public read access"
  on public.auto_hub_inventory
  for select
  to anon
  using (true);

-- Create policy to allow all access for service_role (backend agents)
create policy "Allow internal agent access"
  on public.auto_hub_inventory
  for all
  to service_role
  using (true)
  with check (true);
