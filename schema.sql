-- ============================================================================
--  PRESTIGE AUTO — SHOWROOM MANAGEMENT
--  Complete Supabase schema: tables, triggers, RLS, storage buckets, seed data.
--
--  HOW TO RUN
--  ----------
--  1. Create a new Supabase project.
--  2. Authentication → Providers → Email → turn OFF "Confirm email".
--     (The app signs users in immediately after sign-up; with confirmation on,
--      sign-up returns no session and the new account cannot log in.)
--  3. SQL Editor → New query → paste this whole file → Run.
--  4. Project Settings → API → copy the Project URL and the anon key into
--     frontend/src/lib/supabase.js (SUPABASE_URL / SUPABASE_ANON_KEY).
--
--  This script is idempotent: running it twice is safe.
--
--  MONEY MODEL (important)
--  -----------------------
--  Every *_price / total column is in ALGERIAN DINARS (DA) and is the single
--  source of truth for totals, debts and reports.
--  A price may be *entered* in dollars. When it is, three columns record it:
--      <x>_currency       'DZD' | 'USD'   — how the user typed it
--      <x>_price_usd      the dollar amount
--      <x>_exchange_rate  DA per 1 $ at the moment of the deal
--  and the dinar column stores usd × rate, computed at entry time. The rate is
--  frozen per operation on purpose: a purchase made at 250 DA/$ must keep
--  reporting at 250 even after the rate moves.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Extensions
-- ----------------------------------------------------------------------------
create extension if not exists pgcrypto;      -- gen_random_uuid(), crypt()

-- ============================================================================
-- 1. REFERENCE SEQUENCES  (human-readable ACH-00001 / VEN-00001 / CAI-00001)
-- ============================================================================
create sequence if not exists public.purchase_ref_seq;
create sequence if not exists public.sale_ref_seq;
create sequence if not exists public.cash_ref_seq;

-- ============================================================================
-- 2. TABLES
-- ============================================================================

-- ── settings ────────────────────────────────────────────────────────────────
-- Single row holding showroom identity, website contacts, the reusable
-- inspection checklist, and the default dollar rate.
create table if not exists public.settings (
  id                    bigint generated always as identity primary key,
  name                  text default 'Mon Showroom',
  description           text,
  email                 text,
  phone                 text,
  address               text,
  nif                   text,
  nis                   text,
  article               text,
  rc                    text,
  logo_url              text,                 -- public URL in the showroom-logo bucket
  inspection_template   jsonb  default '{}'::jsonb,
  -- Pre-filled on every new price typed in dollars. Each purchase/sale still
  -- stores the rate it was actually struck at; this is only a convenience default.
  default_exchange_rate numeric(12,4),
  facebook              text,
  instagram             text,
  tiktok                text,
  maps                  text,
  whatsapp              text,
  created_at            timestamptz not null default now()
);

-- ── users (admin profiles) ──────────────────────────────────────────────────
-- One row per admin, linked to auth.users. Workers live in `workers` instead.
create table if not exists public.users (
  id         bigint generated always as identity primary key,
  auth_id    uuid unique references auth.users(id) on delete cascade,
  full_name  text,
  username   text,
  email      text,
  role       text not null default 'admin' check (role in ('admin')),
  created_at timestamptz not null default now()
);

-- ── worker_roles ────────────────────────────────────────────────────────────
-- `permissions` is the map the UI gates on, e.g.
--   {"purchase":{"view":true,"create":true,"edit":false,"delete":false,"print":true}}
-- `name` is unique: it is the natural key the seed below upserts on, and two
-- roles with the same name would be indistinguishable in the Workers UI.
create table if not exists public.worker_roles (
  id          bigint generated always as identity primary key,
  name        text not null unique,
  permissions jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

-- Back-fill the constraint on databases created before it was added, so the
-- seed's ON CONFLICT below has something to conflict against.
do $$ begin
  alter table public.worker_roles add constraint worker_roles_name_key unique (name);
exception when duplicate_table or duplicate_object then null;
end $$;

-- ── workers ─────────────────────────────────────────────────────────────────
create table if not exists public.workers (
  id              bigint generated always as identity primary key,
  auth_id         uuid unique references auth.users(id) on delete set null,
  full_name       text not null,
  phone           text,
  birthday        date,
  id_card_number  text,
  role_id         bigint references public.worker_roles(id) on delete set null,
  payment_type    text default 'NONE' check (payment_type in ('DAILY','MONTHLY','NONE')),
  payment_amount  numeric(14,2) default 0,
  start_date      date,
  account_enabled boolean not null default false,
  email           text,
  username        text,
  created_at      timestamptz not null default now()
);

-- ── suppliers ───────────────────────────────────────────────────────────────
create table if not exists public.suppliers (
  id         bigint generated always as identity primary key,
  full_name  text not null,
  phone      text,
  address    text,
  nif        text,
  nis        text,
  article    text,
  rs         text,
  created_at timestamptz not null default now()
);

-- ── clients ─────────────────────────────────────────────────────────────────
create table if not exists public.clients (
  id                   bigint generated always as identity primary key,
  first_name           text not null,
  last_name            text not null,
  phone_primary        text,
  phone_secondary      text,
  email                text,
  address              text,
  profession           text,
  birth_date           date,
  birth_place          text,
  gender               text check (gender in ('M','F') or gender is null),
  photo_url            text,                  -- public URL in the client-photos bucket
  doc_type             text,
  doc_number           text,
  doc_delivery_date    date,
  doc_expiry           date,
  doc_delivery_address text,
  nif                  text,
  rc                   text,
  created_at           timestamptz not null default now()
);

-- ── cars ────────────────────────────────────────────────────────────────────
-- `images` is a JSON array of PUBLIC URLs from the car-images bucket:
--   ["https://<ref>.supabase.co/storage/v1/object/public/car-images/12/uuid.jpg", ...]
create table if not exists public.cars (
  id         bigint generated always as identity primary key,
  brand      text not null,
  model      text not null,
  plate      text,
  year       integer,
  color      text,
  energy     text default 'ESSENCE' check (energy in ('ESSENCE','DIESEL','HYBRID','ELECTRIC')),
  gearbox    text default 'MANUAL'  check (gearbox in ('MANUAL','AUTO')),
  seats      integer,
  mileage    integer,
  vin        text,
  keys_count integer,
  fiche      text,
  images     jsonb not null default '[]'::jsonb,
  inspection jsonb not null default '{}'::jsonb,
  status     text  not null default 'AVAILABLE' check (status in ('AVAILABLE','SOLD','RESERVED')),
  hidden     boolean not null default false,   -- hidden from the public website
  created_at timestamptz not null default now()
);

-- ── car_document_types / car_documents ──────────────────────────────────────
create table if not exists public.car_document_types (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  created_at timestamptz not null default now()
);

-- A type can be checked with no file attached, so doc_url may be ''.
create table if not exists public.car_documents (
  id         bigint generated always as identity primary key,
  car_id     bigint not null references public.cars(id) on delete cascade,
  type       text not null,
  doc_url    text default '',                 -- public URL in the car-documents bucket
  created_at timestamptz not null default now()
);

-- ── purchases ───────────────────────────────────────────────────────────────
create table if not exists public.purchases (
  id                    bigint generated always as identity primary key,
  reference             text default ('ACH-' || lpad(nextval('public.purchase_ref_seq')::text, 5, '0')),
  car_id                bigint not null unique references public.cars(id) on delete cascade,
  source_type           text not null default 'SUPPLIER' check (source_type in ('SUPPLIER','CLIENT')),
  supplier_id           bigint references public.suppliers(id) on delete set null,
  client_id             bigint references public.clients(id)   on delete set null,

  purchase_price        numeric(14,2) not null default 0,   -- DA — canonical
  selling_price         numeric(14,2) not null default 0,   -- DA — canonical
  amount_paid           numeric(14,2) not null default 0,   -- DA paid up front
  amount_rest           numeric(14,2) not null default 0,   -- maintained by trigger

  -- dollar side of the purchase price (null when the deal was in dinars)
  purchase_currency      text default 'DZD' check (purchase_currency in ('DZD','USD')),
  purchase_price_usd     numeric(14,2),
  purchase_exchange_rate numeric(12,4),
  -- dollar side of the selling price
  selling_currency       text default 'DZD' check (selling_currency in ('DZD','USD')),
  selling_price_usd      numeric(14,2),
  selling_exchange_rate  numeric(12,4),

  date       timestamptz not null default now(),
  created_at timestamptz not null default now(),

  -- a USD price is meaningless without the rate it was converted at
  constraint purchases_usd_needs_rate check (
    purchase_currency <> 'USD'
    or (purchase_price_usd is not null and purchase_exchange_rate is not null)
  ),
  constraint purchases_selling_usd_needs_rate check (
    selling_currency <> 'USD'
    or (selling_price_usd is not null and selling_exchange_rate is not null)
  )
);

create table if not exists public.purchase_payments (
  id          bigint generated always as identity primary key,
  purchase_id bigint not null references public.purchases(id) on delete cascade,
  amount      numeric(14,2) not null default 0,
  description text,
  date        timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── sales ───────────────────────────────────────────────────────────────────
-- NOTE on the dollar columns: `sale_price_usd` is the BASE price in dollars.
-- TVA and reductions are applied to the DINAR value, so the final total's
-- dollar equivalent is total_after_reduction ÷ sale_exchange_rate — the app
-- converts it back rather than storing a second dollar figure.
create table if not exists public.sales (
  id                    bigint generated always as identity primary key,
  reference             text default ('VEN-' || lpad(nextval('public.sale_ref_seq')::text, 5, '0')),
  car_id                bigint not null references public.cars(id)    on delete cascade,
  client_id             bigint not null references public.clients(id) on delete cascade,
  sale_type             text not null default 'NORMAL' check (sale_type in ('NORMAL','DEPOSIT')),

  total_before_tax      numeric(14,2) not null default 0,   -- DA — canonical base
  tva_enabled           boolean not null default false,
  tva_rate              numeric(6,2)  not null default 0,
  reduction_type        text not null default 'NONE' check (reduction_type in ('NONE','PERCENT','FIXED')),
  reduction_value       numeric(14,2) not null default 0,
  total_after_reduction numeric(14,2) not null default 0,   -- DA — final total
  amount_paid           numeric(14,2) not null default 0,
  amount_rest           numeric(14,2) not null default 0,   -- maintained by trigger

  -- dollar side of the BASE price
  sale_currency         text default 'DZD' check (sale_currency in ('DZD','USD')),
  sale_price_usd        numeric(14,2),
  sale_exchange_rate    numeric(12,4),

  client_take_car       boolean not null default true,
  inspection            jsonb   not null default '{}'::jsonb,
  date                  timestamptz not null default now(),
  created_at            timestamptz not null default now(),

  constraint sales_usd_needs_rate check (
    sale_currency <> 'USD'
    or (sale_price_usd is not null and sale_exchange_rate is not null)
  )
);

create table if not exists public.sale_payments (
  id          bigint generated always as identity primary key,
  sale_id     bigint not null references public.sales(id) on delete cascade,
  car_id      bigint references public.cars(id) on delete cascade,
  amount      numeric(14,2) not null default 0,
  description text,
  date        timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── expenses ────────────────────────────────────────────────────────────────
create table if not exists public.expenses (
  id          bigint generated always as identity primary key,
  type        text not null default 'SHOWROOM' check (type in ('CAR','SHOWROOM')),
  car_id      bigint references public.cars(id) on delete cascade,
  name        text not null,
  description text,
  amount      numeric(14,2) not null default 0,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

-- ── payroll ─────────────────────────────────────────────────────────────────
create table if not exists public.worker_payments (
  id          bigint generated always as identity primary key,
  worker_id   bigint not null references public.workers(id) on delete cascade,
  month       text,
  amount      numeric(14,2) not null default 0,
  description text,
  date        date not null default current_date,
  created_at  timestamptz not null default now()
);

create table if not exists public.worker_advances (
  id          bigint generated always as identity primary key,
  worker_id   bigint not null references public.workers(id) on delete cascade,
  amount      numeric(14,2) not null default 0,
  description text,
  date        date not null default current_date,
  is_paid     boolean not null default false,
  paid_at     date,
  payment_id  bigint references public.worker_payments(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.worker_absences (
  id          bigint generated always as identity primary key,
  worker_id   bigint not null references public.workers(id) on delete cascade,
  cost        numeric(14,2) not null default 0,
  description text,
  date        date not null default current_date,
  is_paid     boolean not null default false,
  paid_at     date,
  payment_id  bigint references public.worker_payments(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ── website ─────────────────────────────────────────────────────────────────
create table if not exists public.special_offers (
  id            bigint generated always as identity primary key,
  car_id        bigint not null references public.cars(id) on delete cascade,
  special_price numeric(14,2) not null default 0,
  old_price     numeric(14,2),
  start_date    timestamptz not null default now(),
  end_date      timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.website_reservations (
  id           bigint generated always as identity primary key,
  car_id       bigint not null references public.cars(id) on delete cascade,
  client_name  text not null,
  client_phone text not null,
  status       text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','CANCELLED')),
  created_at   timestamptz not null default now()
);

-- ── caisse (cash register) ──────────────────────────────────────────────────
create table if not exists public.cash_transactions (
  id           bigint generated always as identity primary key,
  reference    text default ('CAI-' || lpad(nextval('public.cash_ref_seq')::text, 5, '0')),
  type         text not null default 'DEPOSIT' check (type in ('DEPOSIT','WITHDRAWAL')),
  client_id    bigint references public.clients(id) on delete set null,
  client_name  text,
  client_phone text,
  amount       numeric(14,2) not null default 0,
  description  text,
  date         timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ── indexes on every foreign key the app joins on ───────────────────────────
create index if not exists idx_purchases_car        on public.purchases(car_id);
create index if not exists idx_purchases_supplier   on public.purchases(supplier_id);
create index if not exists idx_purchases_client     on public.purchases(client_id);
create index if not exists idx_purchases_date       on public.purchases(date desc);
create index if not exists idx_purchase_pay_parent  on public.purchase_payments(purchase_id);
create index if not exists idx_sales_car            on public.sales(car_id);
create index if not exists idx_sales_client         on public.sales(client_id);
create index if not exists idx_sales_date           on public.sales(date desc);
create index if not exists idx_sale_pay_parent      on public.sale_payments(sale_id);
create index if not exists idx_sale_pay_car         on public.sale_payments(car_id);
create index if not exists idx_car_documents_car    on public.car_documents(car_id);
create index if not exists idx_expenses_car         on public.expenses(car_id);
create index if not exists idx_expenses_date        on public.expenses(date desc);
create index if not exists idx_cars_status          on public.cars(status);
create index if not exists idx_workers_auth         on public.workers(auth_id);
create index if not exists idx_workers_role         on public.workers(role_id);
create index if not exists idx_users_auth           on public.users(auth_id);
create index if not exists idx_advances_worker      on public.worker_advances(worker_id);
create index if not exists idx_absences_worker      on public.worker_absences(worker_id);
create index if not exists idx_wpayments_worker     on public.worker_payments(worker_id);
create index if not exists idx_special_offers_car   on public.special_offers(car_id);
create index if not exists idx_reservations_car     on public.website_reservations(car_id);
create index if not exists idx_cash_date            on public.cash_transactions(date desc);

-- ============================================================================
-- 3. TRIGGERS — derived money & car status
-- ============================================================================

-- ── amount_rest on purchases ────────────────────────────────────────────────
-- rest = price − upfront paid − every later debt payment.
-- Deliberately NOT clamped at 0: the app treats rest <= 0 as fully paid, and an
-- overpayment should stay visible as a negative rather than silently vanish.
create or replace function public.purchases_set_rest()
returns trigger language plpgsql as $$
begin
  new.amount_rest := coalesce(new.purchase_price, 0)
                   - coalesce(new.amount_paid, 0)
                   - coalesce((select sum(pp.amount)
                                 from public.purchase_payments pp
                                where pp.purchase_id = new.id), 0);
  return new;
end $$;

drop trigger if exists trg_purchases_set_rest on public.purchases;
create trigger trg_purchases_set_rest
  before insert or update on public.purchases
  for each row execute function public.purchases_set_rest();

-- A payment row changes the parent's rest. The no-op self-update below re-fires
-- the BEFORE trigger above, which does the actual recomputation — one formula,
-- one place.
create or replace function public.purchase_payments_recalc()
returns trigger language plpgsql as $$
declare v_id bigint;
begin
  v_id := coalesce(new.purchase_id, old.purchase_id);
  update public.purchases set amount_paid = amount_paid where id = v_id;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_purchase_payments_recalc on public.purchase_payments;
create trigger trg_purchase_payments_recalc
  after insert or update or delete on public.purchase_payments
  for each row execute function public.purchase_payments_recalc();

-- ── amount_rest on sales ────────────────────────────────────────────────────
create or replace function public.sales_set_rest()
returns trigger language plpgsql as $$
begin
  new.amount_rest := coalesce(new.total_after_reduction, 0)
                   - coalesce(new.amount_paid, 0)
                   - coalesce((select sum(sp.amount)
                                 from public.sale_payments sp
                                where sp.sale_id = new.id), 0);
  return new;
end $$;

drop trigger if exists trg_sales_set_rest on public.sales;
create trigger trg_sales_set_rest
  before insert or update on public.sales
  for each row execute function public.sales_set_rest();

create or replace function public.sale_payments_recalc()
returns trigger language plpgsql as $$
declare v_id bigint;
begin
  v_id := coalesce(new.sale_id, old.sale_id);
  update public.sales set amount_paid = amount_paid where id = v_id;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_sale_payments_recalc on public.sale_payments;
create trigger trg_sale_payments_recalc
  after insert or update or delete on public.sale_payments
  for each row execute function public.sale_payments_recalc();

-- ── car status follows its sale ─────────────────────────────────────────────
-- Selling a car takes it out of the POS list; deleting the sale puts it back
-- (unless another sale still covers it).
create or replace function public.sales_sync_car_status()
returns trigger language plpgsql as $$
begin
  if (tg_op = 'INSERT') then
    update public.cars set status = 'SOLD' where id = new.car_id;
  elsif (tg_op = 'DELETE') then
    if not exists (select 1 from public.sales s where s.car_id = old.car_id and s.id <> old.id) then
      update public.cars set status = 'AVAILABLE' where id = old.car_id;
    end if;
  end if;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_sales_sync_car_status on public.sales;
create trigger trg_sales_sync_car_status
  after insert or delete on public.sales
  for each row execute function public.sales_sync_car_status();

-- ============================================================================
-- 4. AUTH → PROFILE TRIGGER
-- ============================================================================
-- Sign-up carries metadata: { kind: 'admin' | 'worker', full_name, username }.
-- Admins get their `users` row created here, server-side, so it exists even
-- when RLS would block the client from inserting it.
-- Workers are NOT created here: the admin creates the `workers` row explicitly
-- from the Workers page; we only back-fill its auth_id link.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if coalesce(new.raw_user_meta_data ->> 'kind', 'admin') = 'admin' then
    insert into public.users (auth_id, full_name, username, email, role)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'full_name', ''),
      coalesce(new.raw_user_meta_data ->> 'username', ''),
      new.email,
      'admin'
    )
    on conflict (auth_id) do nothing;
  else
    -- worker signed up from the admin's Workers page: link an existing row by email
    update public.workers
       set auth_id = new.id, account_enabled = true
     where email = new.email and auth_id is null;
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================
-- Model:
--   • anon          → read-only on what the PUBLIC WEBSITE shows, plus the
--                     ability to submit a reservation.
--   • authenticated → full access to the back-office (admins and workers alike;
--                     finer-grained gating is done in the UI by the role's
--                     permission map, which is not a security boundary).
--   • users table   → each account may only see/patch its own row.

alter table public.settings             enable row level security;
alter table public.users                enable row level security;
alter table public.worker_roles         enable row level security;
alter table public.workers              enable row level security;
alter table public.suppliers            enable row level security;
alter table public.clients              enable row level security;
alter table public.cars                 enable row level security;
alter table public.car_document_types   enable row level security;
alter table public.car_documents        enable row level security;
alter table public.purchases            enable row level security;
alter table public.purchase_payments    enable row level security;
alter table public.sales                enable row level security;
alter table public.sale_payments        enable row level security;
alter table public.expenses             enable row level security;
alter table public.worker_payments      enable row level security;
alter table public.worker_advances      enable row level security;
alter table public.worker_absences      enable row level security;
alter table public.special_offers       enable row level security;
alter table public.website_reservations enable row level security;
alter table public.cash_transactions    enable row level security;

-- ── back-office tables: any signed-in account ───────────────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'worker_roles','workers','suppliers','clients','car_document_types',
    'purchases','purchase_payments','sales','sale_payments','expenses',
    'worker_payments','worker_advances','worker_absences','cash_transactions'
  ] loop
    execute format('drop policy if exists "auth_all" on public.%I', t);
    execute format(
      'create policy "auth_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ── settings: world-readable (logo + name appear on the login page and the
--    public website), writable only when signed in ─────────────────────────
drop policy if exists "settings_read"  on public.settings;
drop policy if exists "settings_write" on public.settings;
create policy "settings_read"  on public.settings for select to anon, authenticated using (true);
create policy "settings_write" on public.settings for all    to authenticated using (true) with check (true);

-- ── cars / car_documents / special_offers: public website reads them ───────
do $$
declare t text;
begin
  foreach t in array array['cars','car_documents','special_offers'] loop
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format('drop policy if exists "%s_write" on public.%I', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select to anon, authenticated using (true)', t, t);
    execute format(
      'create policy "%s_write" on public.%I for all to authenticated using (true) with check (true)', t, t);
  end loop;
end $$;

-- ── website_reservations: a visitor may submit one, staff manage them ──────
drop policy if exists "reservations_insert" on public.website_reservations;
drop policy if exists "reservations_manage" on public.website_reservations;
create policy "reservations_insert" on public.website_reservations
  for insert to anon, authenticated with check (true);
create policy "reservations_manage" on public.website_reservations
  for all to authenticated using (true) with check (true);

-- ── users: own row only ────────────────────────────────────────────────────
drop policy if exists "users_own_select" on public.users;
drop policy if exists "users_own_insert" on public.users;
drop policy if exists "users_own_update" on public.users;
create policy "users_own_select" on public.users for select to authenticated using (auth_id = auth.uid());
create policy "users_own_insert" on public.users for insert to authenticated with check (auth_id = auth.uid());
create policy "users_own_update" on public.users for update to authenticated
  using (auth_id = auth.uid()) with check (auth_id = auth.uid());

-- ============================================================================
-- 6. STORAGE BUCKETS
-- ============================================================================
-- One bucket per upload surface in the app. All are PUBLIC-READ: the database
-- stores the resulting public URL as plain text (cars.images[], car_documents.
-- doc_url, clients.photo_url, settings.logo_url) and the UI renders straight
-- from those URLs — so anything the browser must display has to be readable
-- without a token.
--
--   car-images     ← Purchase wizard, vehicle photo gallery   → cars.images (jsonb array)
--   car-documents  ← "scan" on each document type             → car_documents.doc_url
--   client-photos  ← client identity photo                    → clients.photo_url
--   showroom-logo  ← Settings → logo                          → settings.logo_url
--
-- file_size_limit is in bytes. Scans may be PDFs, hence the extra mime type.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('car-images',    'car-images',    true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('car-documents', 'car-documents', true, 20971520, array['image/jpeg','image/png','image/webp','image/gif','application/pdf']),
  ('client-photos', 'client-photos', true, 10485760, array['image/jpeg','image/png','image/webp','image/gif']),
  ('showroom-logo', 'showroom-logo', true,  5242880, array['image/jpeg','image/png','image/webp','image/gif','image/svg+xml'])
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Anyone may read (the <img> tags are unauthenticated); only signed-in staff
-- may upload, replace or delete.
do $$
declare b text;
begin
  foreach b in array array['car-images','car-documents','client-photos','showroom-logo'] loop
    execute format('drop policy if exists "%s_read"   on storage.objects', b);
    execute format('drop policy if exists "%s_insert" on storage.objects', b);
    execute format('drop policy if exists "%s_update" on storage.objects', b);
    execute format('drop policy if exists "%s_delete" on storage.objects', b);

    execute format($f$create policy "%s_read" on storage.objects
      for select to anon, authenticated using (bucket_id = %L)$f$, b, b);
    execute format($f$create policy "%s_insert" on storage.objects
      for insert to authenticated with check (bucket_id = %L)$f$, b, b);
    execute format($f$create policy "%s_update" on storage.objects
      for update to authenticated using (bucket_id = %L) with check (bucket_id = %L)$f$, b, b, b);
    execute format($f$create policy "%s_delete" on storage.objects
      for delete to authenticated using (bucket_id = %L)$f$, b, b);
  end loop;
end $$;

-- ============================================================================
-- 7. ACCOUNT PROVISIONING HELPER
-- ============================================================================
-- Creates a real Supabase Auth account (auth.users + auth.identities) so the
-- person can sign in with email + password from the login page, exactly like an
-- account made through the UI. Returns the existing id if the email is taken,
-- which keeps this whole script re-runnable.
--
-- `email_confirmed_at` is pre-set so the account works even if you later turn
-- "Confirm email" back on.
create or replace function public.create_auth_account(
  p_email     text,
  p_password  text,
  p_full_name text,
  p_username  text,
  p_kind      text default 'admin'   -- 'admin' → gets a users row via the trigger
)
returns uuid
language plpgsql
security definer set search_path = public, auth, extensions
as $$
declare
  v_id uuid;
begin
  select id into v_id from auth.users where email = p_email;
  if v_id is not null then
    return v_id;
  end if;

  v_id := gen_random_uuid();

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change, email_change_token_new
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_id, 'authenticated', 'authenticated', p_email,
    crypt(p_password, gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('kind', p_kind, 'full_name', p_full_name, 'username', p_username),
    now(), now(),
    '', '', '', ''
  );

  -- Without a matching identity row, password sign-in fails.
  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', p_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  return v_id;
end $$;

-- ============================================================================
-- 8. SEED DATA
-- ============================================================================

-- ── the single settings row ────────────────────────────────────────────────
insert into public.settings (name, description, email, phone, address, default_exchange_rate)
select 'Prestige Auto', 'Showroom automobile', 'contact@showroom.dz', '', '', 262.00
where not exists (select 1 from public.settings);

-- ── document types offered by the Purchase wizard ──────────────────────────
insert into public.car_document_types (name) values
  ('Carte grise'), ('Assurance'), ('Contrôle technique'),
  ('Facture d''achat'), ('Certificat de cession'), ('Quitus fiscal')
on conflict (name) do nothing;

-- ── worker roles + their permission maps ───────────────────────────────────
-- Shape read by the UI: permissions[section][action] — sections match the
-- sidebar, actions are view / create / edit / delete / print.
insert into public.worker_roles (name, permissions) values
  ('Manager', '{
      "dashboard":{"view":true},
      "showroom":{"view":true},
      "purchase":{"view":true,"create":true,"edit":true,"delete":true,"print":true},
      "pos":{"view":true,"create":true,"edit":true,"delete":false,"print":true},
      "sales":{"view":true,"create":true,"edit":true,"delete":false,"print":true},
      "payments":{"view":true,"create":true,"edit":true,"delete":false,"print":true},
      "caisse":{"view":true,"create":true,"edit":true,"delete":false,"print":true},
      "clients":{"view":true,"create":true,"edit":true,"delete":false},
      "suppliers":{"view":true,"create":true,"edit":true,"delete":false},
      "expenses":{"view":true,"create":true,"edit":true,"delete":false},
      "reports":{"view":true,"print":true},
      "workers":{"view":true,"create":false,"edit":false,"delete":false},
      "settings":{"view":true,"edit":false}
   }'::jsonb),
  ('Vendeur', '{
      "dashboard":{"view":true},
      "showroom":{"view":true},
      "purchase":{"view":true,"create":false,"edit":false,"delete":false,"print":true},
      "pos":{"view":true,"create":true,"edit":false,"delete":false,"print":true},
      "sales":{"view":true,"create":true,"edit":false,"delete":false,"print":true},
      "payments":{"view":true,"create":true,"edit":false,"delete":false,"print":true},
      "caisse":{"view":false},
      "clients":{"view":true,"create":true,"edit":true,"delete":false},
      "suppliers":{"view":true,"create":false,"edit":false,"delete":false},
      "expenses":{"view":false},
      "reports":{"view":false},
      "workers":{"view":false},
      "settings":{"view":false}
   }'::jsonb),
  ('Caissier', '{
      "dashboard":{"view":true},
      "showroom":{"view":true},
      "purchase":{"view":true,"create":false,"edit":false,"delete":false,"print":true},
      "pos":{"view":false},
      "sales":{"view":true,"create":false,"edit":false,"delete":false,"print":true},
      "payments":{"view":true,"create":true,"edit":true,"delete":false,"print":true},
      "caisse":{"view":true,"create":true,"edit":true,"delete":false,"print":true},
      "clients":{"view":true,"create":false,"edit":false,"delete":false},
      "suppliers":{"view":false},
      "expenses":{"view":true,"create":true,"edit":false,"delete":false},
      "reports":{"view":false},
      "workers":{"view":false},
      "settings":{"view":false}
   }'::jsonb)
on conflict (name) do nothing;

-- ── the admin account + the worker accounts ────────────────────────────────
--
--   ┌──────────────────────┬──────────────┬───────────┐
--   │ email                │ password     │ role      │
--   ├──────────────────────┼──────────────┼───────────┤
--   │ admin@showroom.dz    │ admin1234    │ admin     │
--   │ manager@showroom.dz  │ manager1234  │ Manager   │
--   │ vendeur@showroom.dz  │ vendeur1234  │ Vendeur   │
--   │ caissier@showroom.dz │ caissier1234 │ Caissier  │
--   └──────────────────────┴──────────────┴───────────┘
--
--   ⚠  CHANGE THESE PASSWORDS before going live (Settings → Mon Compte, or
--      edit the values below before running this script).
--
-- All four are real auth.users rows, so they log in through the normal login
-- page. The admin's `users` row is created by the handle_new_user trigger; each
-- worker gets a `workers` row wired to its auth_id and its role.
do $$
declare
  v_admin    uuid;
  v_manager  uuid;
  v_vendeur  uuid;
  v_caissier uuid;
begin
  -- admin (kind = 'admin' → the trigger writes public.users)
  v_admin := public.create_auth_account('admin@showroom.dz', 'admin1234', 'Administrateur', 'admin', 'admin');

  -- workers (kind = 'worker' → the trigger does NOT write public.users)
  v_manager  := public.create_auth_account('manager@showroom.dz',  'manager1234',  'Manager Showroom', 'manager',  'worker');
  v_vendeur  := public.create_auth_account('vendeur@showroom.dz',  'vendeur1234',  'Vendeur Showroom', 'vendeur',  'worker');
  v_caissier := public.create_auth_account('caissier@showroom.dz', 'caissier1234', 'Caissier Showroom','caissier', 'worker');

  -- worker profiles, linked to the auth accounts and to their roles
  insert into public.workers (auth_id, full_name, phone, role_id, payment_type, payment_amount, start_date, account_enabled, email, username)
  select v_manager, 'Manager Showroom', '0550000001',
         (select id from public.worker_roles where name = 'Manager' limit 1),
         'MONTHLY', 60000, current_date, true, 'manager@showroom.dz', 'manager'
  where not exists (select 1 from public.workers where email = 'manager@showroom.dz');

  insert into public.workers (auth_id, full_name, phone, role_id, payment_type, payment_amount, start_date, account_enabled, email, username)
  select v_vendeur, 'Vendeur Showroom', '0550000002',
         (select id from public.worker_roles where name = 'Vendeur' limit 1),
         'MONTHLY', 45000, current_date, true, 'vendeur@showroom.dz', 'vendeur'
  where not exists (select 1 from public.workers where email = 'vendeur@showroom.dz');

  insert into public.workers (auth_id, full_name, phone, role_id, payment_type, payment_amount, start_date, account_enabled, email, username)
  select v_caissier, 'Caissier Showroom', '0550000003',
         (select id from public.worker_roles where name = 'Caissier' limit 1),
         'MONTHLY', 40000, current_date, true, 'caissier@showroom.dz', 'caissier'
  where not exists (select 1 from public.workers where email = 'caissier@showroom.dz');

  -- back-fill auth_id if the worker rows already existed from a previous run
  update public.workers set auth_id = v_manager  where email = 'manager@showroom.dz'  and auth_id is null;
  update public.workers set auth_id = v_vendeur  where email = 'vendeur@showroom.dz'  and auth_id is null;
  update public.workers set auth_id = v_caissier where email = 'caissier@showroom.dz' and auth_id is null;
end $$;

-- ============================================================================
-- 9. VERIFY
-- ============================================================================
-- Expect: 4 accounts, 1 admin profile, 3 workers each with a role, 4 buckets.
select 'auth accounts'  as check, count(*)::text as value from auth.users
union all select 'admin profiles', count(*)::text from public.users
union all select 'workers',        count(*)::text from public.workers
union all select 'worker roles',   count(*)::text from public.worker_roles
union all select 'storage buckets',count(*)::text from storage.buckets
                                   where id in ('car-images','car-documents','client-photos','showroom-logo')
union all select 'doc types',      count(*)::text from public.car_document_types;
