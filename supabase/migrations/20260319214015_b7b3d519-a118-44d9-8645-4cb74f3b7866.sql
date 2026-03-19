
-- Marketplace listings for the client ecosystem
create type public.listing_type as enum (
  'einstellplatz', 'kurs', 'dienstleistung', 'produkt', 'gesuch', 'sonstiges'
);

create type public.listing_status as enum (
  'active', 'paused', 'expired', 'draft'
);

create table public.client_marketplace_listings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  listing_type public.listing_type not null,
  status public.listing_status not null default 'active',
  title text not null,
  description text,
  category text,
  location_name text,
  location_plz text,
  location_country text default 'DE',
  price_amount numeric,
  price_unit text default 'EUR',
  price_label text,
  images text[] default '{}',
  tags text[] default '{}',
  contact_email text,
  contact_phone text,
  capacity int,
  available_from date,
  available_until date,
  is_featured boolean default false,
  view_count int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  expires_at timestamptz default (now() + interval '90 days')
);

alter table public.client_marketplace_listings enable row level security;

create policy "Anyone can view active listings"
  on public.client_marketplace_listings for select
  to authenticated
  using (status = 'active');

create policy "Owners manage own listings"
  on public.client_marketplace_listings for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create table public.client_marketplace_inquiries (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.client_marketplace_listings(id) on delete cascade not null,
  sender_id uuid references auth.users(id) on delete cascade not null,
  message text not null,
  status text default 'pending',
  created_at timestamptz default now()
);

alter table public.client_marketplace_inquiries enable row level security;

create policy "Sender can insert inquiry"
  on public.client_marketplace_inquiries for insert
  to authenticated
  with check (sender_id = auth.uid());

create policy "Parties can view inquiry"
  on public.client_marketplace_inquiries for select
  to authenticated
  using (
    sender_id = auth.uid()
    or listing_id in (
      select id from public.client_marketplace_listings where owner_id = auth.uid()
    )
  );
