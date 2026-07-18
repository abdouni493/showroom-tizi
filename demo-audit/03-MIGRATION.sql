-- ============================================================================
-- 03-MIGRATION.sql — new sections gap-fill (JTECH-demo parity)
-- ----------------------------------------------------------------------------
-- Idempotent. Safe to paste into the Supabase SQL Editor and run MORE THAN ONCE.
-- Targets Supabase Postgres. Follows schema.sql conventions:
--   snake_case · bigint generated always as identity · numeric(14,2) money ·
--   timestamptz dates · check() on enum-like text · frozen-rate money model
--   (canonical DZD + <x>_usd + a per-operation exchange_rate) ·
--   auth_all RLS for back-office, separate anon read only where the public site needs it.
-- Does NOT touch backend/prisma (drifted, out of scope) or any existing table's
-- money columns / triggers.
-- ============================================================================

-- ============================================================================
-- 1. REFERENCE SEQUENCES
-- ============================================================================
create sequence if not exists public.import_ref_seq;         -- IMP-00001
create sequence if not exists public.client_order_ref_seq;   -- CMD-00001
create sequence if not exists public.quote_ref_seq;          -- DEV-00001
create sequence if not exists public.invoice_ref_seq;        -- FAC-00001
create sequence if not exists public.admin_file_ref_seq;     -- DOS-00001

-- ============================================================================
-- 2. ADDITIVE ENHANCEMENT COLUMNS (existing tables — no drops / renames)
-- ============================================================================

-- ── cars: import-cost breakdown + descriptive fields (frozen-rate friendly) ──
alter table public.cars add column if not exists version             text;
alter table public.cars add column if not exists condition           text default 'USED' check (condition in ('NEW','USED'));
alter table public.cars add column if not exists country_of_origin   text;
alter table public.cars add column if not exists location            text;
alter table public.cars add column if not exists transport_cost      numeric(14,2) not null default 0;
alter table public.cars add column if not exists insurance_cost      numeric(14,2) not null default 0;
alter table public.cars add column if not exists customs_duty        numeric(14,2) not null default 0;
alter table public.cars add column if not exists tic_cost            numeric(14,2) not null default 0;
alter table public.cars add column if not exists registration_fees   numeric(14,2) not null default 0;
alter table public.cars add column if not exists other_import_costs  numeric(14,2) not null default 0;

-- ── clients: type / source / contact / fiscal / badges ──────────────────────
alter table public.clients add column if not exists type     text default 'INDIVIDUAL' check (type in ('INDIVIDUAL','COMPANY','ADMINISTRATION'));
alter table public.clients add column if not exists source   text;
alter table public.clients add column if not exists whatsapp text;
alter table public.clients add column if not exists city     text;
alter table public.clients add column if not exists wilaya   text;
alter table public.clients add column if not exists tin      text;
alter table public.clients add column if not exists badges   jsonb not null default '[]'::jsonb;

-- ── settings: extra fiscal / portal header fields (nif/nis/article/rc exist) ─
alter table public.settings add column if not exists slug     text;
alter table public.settings add column if not exists iban     text;
alter table public.settings add column if not exists activity text;
alter table public.settings add column if not exists city     text;
alter table public.settings add column if not exists wilaya   text;
alter table public.settings add column if not exists website  text;

-- ── expenses: optional category ─────────────────────────────────────────────
alter table public.expenses add column if not exists category text;

-- ── workers: commission rate + monthly target (Sales Team / Commissions) ─────
alter table public.workers add column if not exists commission_rate numeric(6,2)  not null default 0;
alter table public.workers add column if not exists monthly_target  numeric(14,2) not null default 0;

-- ============================================================================
-- 3. NEW TABLES  (created in FK-dependency order)
-- ============================================================================

-- ── leads (Pipeline / CRM) ──────────────────────────────────────────────────
create table if not exists public.leads (
  id            bigint generated always as identity primary key,
  client_id     bigint references public.clients(id) on delete set null,
  car_id        bigint references public.cars(id)    on delete set null,
  contact_name  text,
  contact_phone text,
  source        text not null default 'WALK_IN'
                  check (source in ('WALK_IN','PHONE','WHATSAPP','MARKETPLACE','REFERRAL','FACEBOOK','OTHER')),
  stage         text not null default 'NEW'
                  check (stage in ('NEW','CONTACTED','TEST_DRIVE','NEGOTIATION','WON','LOST')),
  value         numeric(14,2) not null default 0,
  notes         text,
  date          timestamptz not null default now(),
  created_at    timestamptz not null default now()
);

-- ── import_orders (containers) ──────────────────────────────────────────────
-- Order-level frozen exchange rate; DZD totals are canonical, *_usd mirror them.
create table if not exists public.import_orders (
  id                  bigint generated always as identity primary key,
  reference           text default ('IMP-' || lpad(nextval('public.import_ref_seq')::text, 5, '0')),
  supplier_id         bigint references public.suppliers(id) on delete set null,
  order_date          timestamptz not null default now(),
  container_type      text,
  bl_number           text,
  container_number    text,
  port                text,
  eta                 date,
  etd                 date,
  carrier_link        text,
  status              text not null default 'ORDERED'
                        check (status in ('ORDERED','IN_TRANSIT','AT_PORT','CUSTOMS','DELIVERED','CANCELLED')),
  currency            text default 'USD' check (currency in ('DZD','USD')),
  exchange_rate       numeric(12,4),
  vehicles_total      numeric(14,2) not null default 0,   -- DZD canonical
  vehicles_total_usd  numeric(14,2),
  transport_cost      numeric(14,2) not null default 0,   -- DZD
  transport_cost_usd  numeric(14,2),
  other_costs         numeric(14,2) not null default 0,   -- DZD
  notes               text,
  created_at          timestamptz not null default now(),
  constraint import_orders_usd_needs_rate check (
    currency <> 'USD' or exchange_rate is not null
  )
);

-- ── import_order_cars (which vehicles ride in a container + allocated cost) ──
create table if not exists public.import_order_cars (
  id                bigint generated always as identity primary key,
  import_order_id   bigint not null references public.import_orders(id) on delete cascade,
  car_id            bigint references public.cars(id) on delete set null,
  brand             text,
  model             text,
  vin               text,
  vehicle_price     numeric(14,2) not null default 0,   -- DZD
  vehicle_price_usd numeric(14,2),
  allocated_cost    numeric(14,2) not null default 0,   -- DZD share of transport/other
  created_at        timestamptz not null default now()
);

-- ── client_orders (import-to-order contracts, with deposit ledger) ──────────
create table if not exists public.client_orders (
  id                  bigint generated always as identity primary key,
  reference           text default ('CMD-' || lpad(nextval('public.client_order_ref_seq')::text, 5, '0')),
  client_id           bigint references public.clients(id) on delete set null,
  import_order_id     bigint references public.import_orders(id) on delete set null,
  car_id              bigint references public.cars(id) on delete set null,
  brand               text,
  model               text,
  version             text,
  year                integer,
  color               text,
  vin                 text,
  options             text,
  currency            text default 'DZD' check (currency in ('DZD','USD')),
  exchange_rate       numeric(12,4),
  agreed_total        numeric(14,2) not null default 0,   -- DZD canonical
  agreed_total_usd    numeric(14,2),
  deposit_amount      numeric(14,2) not null default 0,
  amount_paid         numeric(14,2) not null default 0,
  amount_rest         numeric(14,2) not null default 0,   -- maintained by trigger
  order_date          timestamptz not null default now(),
  deposit_date        date,
  payment_method      text,
  estimated_delivery  date,
  cancellation_policy text,
  status              text not null default 'ACTIVE'
                        check (status in ('ACTIVE','IN_TRANSIT','AT_CUSTOMS','DELIVERED','CANCELLED')),
  notes               text,
  created_at          timestamptz not null default now(),
  constraint client_orders_usd_needs_rate check (
    currency <> 'USD' or exchange_rate is not null
  )
);

create table if not exists public.client_order_payments (
  id              bigint generated always as identity primary key,
  client_order_id bigint not null references public.client_orders(id) on delete cascade,
  amount          numeric(14,2) not null default 0,
  description     text,
  date            timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- ── service catalog (reused by quotes / invoices / workshop) ────────────────
create table if not exists public.service_categories (
  id         bigint generated always as identity primary key,
  name       text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.services (
  id          bigint generated always as identity primary key,
  category_id bigint references public.service_categories(id) on delete set null,
  name        text not null,
  description text,
  price       numeric(14,2) not null default 0,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

-- ── quotes (devis) ──────────────────────────────────────────────────────────
create table if not exists public.quotes (
  id             bigint generated always as identity primary key,
  reference      text default ('DEV-' || lpad(nextval('public.quote_ref_seq')::text, 5, '0')),
  client_id      bigint references public.clients(id) on delete set null,
  car_id         bigint references public.cars(id)    on delete set null,
  date           timestamptz not null default now(),
  valid_until    date,
  currency       text default 'DZD' check (currency in ('DZD','USD')),
  status         text not null default 'DRAFT'
                   check (status in ('DRAFT','SENT','ACCEPTED','REFUSED','EXPIRED')),
  payment_method text,
  payment_info   text,
  tva_enabled    boolean not null default false,
  tva_rate       numeric(6,2)  not null default 0,
  subtotal       numeric(14,2) not null default 0,
  tva_amount     numeric(14,2) not null default 0,
  total          numeric(14,2) not null default 0,
  notes          text,
  created_at     timestamptz not null default now()
);

create table if not exists public.quote_lines (
  id         bigint generated always as identity primary key,
  quote_id   bigint not null references public.quotes(id) on delete cascade,
  service_id bigint references public.services(id) on delete set null,
  label      text not null,
  quantity   numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

-- ── invoices (factures, payments + credit notes) ────────────────────────────
create table if not exists public.invoices (
  id          bigint generated always as identity primary key,
  reference   text default ('FAC-' || lpad(nextval('public.invoice_ref_seq')::text, 5, '0')),
  client_id   bigint references public.clients(id) on delete set null,
  sale_id     bigint references public.sales(id)   on delete set null,
  doc_type    text not null default 'INVOICE' check (doc_type in ('INVOICE','CREDIT_NOTE')),
  date        timestamptz not null default now(),
  due_date    date,
  currency    text default 'DZD' check (currency in ('DZD','USD')),
  status      text not null default 'DRAFT'
                check (status in ('DRAFT','SENT','PARTIAL','PAID','OVERDUE','CANCELLED')),
  tva_enabled boolean not null default false,
  tva_rate    numeric(6,2)  not null default 0,
  subtotal    numeric(14,2) not null default 0,
  tva_amount  numeric(14,2) not null default 0,
  total       numeric(14,2) not null default 0,
  amount_paid numeric(14,2) not null default 0,
  amount_rest numeric(14,2) not null default 0,   -- maintained by trigger
  notes       text,
  created_at  timestamptz not null default now()
);

create table if not exists public.invoice_lines (
  id         bigint generated always as identity primary key,
  invoice_id bigint not null references public.invoices(id) on delete cascade,
  service_id bigint references public.services(id) on delete set null,
  label      text not null,
  quantity   numeric(12,2) not null default 1,
  unit_price numeric(14,2) not null default 0,
  line_total numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.invoice_payments (
  id          bigint generated always as identity primary key,
  invoice_id  bigint not null references public.invoices(id) on delete cascade,
  amount      numeric(14,2) not null default 0,
  description text,
  date        timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── admin_files (dossiers: customs / registration / COC / tax clearance) ────
create table if not exists public.admin_files (
  id         bigint generated always as identity primary key,
  reference  text default ('DOS-' || lpad(nextval('public.admin_file_ref_seq')::text, 5, '0')),
  car_id     bigint references public.cars(id)    on delete set null,
  client_id  bigint references public.clients(id) on delete set null,
  type       text not null default 'CUSTOMS'
               check (type in ('CUSTOMS','REGISTRATION','COC','TAX_CLEARANCE','OTHER')),
  assignee   text,
  status     text not null default 'PENDING'
               check (status in ('PENDING','IN_PROGRESS','SUBMITTED','COMPLETED','BLOCKED')),
  due_date   date,
  cost       numeric(14,2) not null default 0,
  notes      text,
  date       timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ── workshop_appointments (atelier) ─────────────────────────────────────────
create table if not exists public.workshop_appointments (
  id           bigint generated always as identity primary key,
  client_id    bigint references public.clients(id)  on delete set null,
  car_id       bigint references public.cars(id)     on delete set null,
  service_id   bigint references public.services(id) on delete set null,
  title        text,
  scheduled_at timestamptz not null default now(),
  duration_min integer not null default 60,
  status       text not null default 'SCHEDULED'
                 check (status in ('SCHEDULED','IN_PROGRESS','COMPLETED','CANCELLED')),
  cost         numeric(14,2) not null default 0,
  notes        text,
  created_at   timestamptz not null default now()
);

-- ── commissions (sales-team) ────────────────────────────────────────────────
create table if not exists public.commissions (
  id          bigint generated always as identity primary key,
  worker_id   bigint references public.workers(id) on delete set null,
  sale_id     bigint references public.sales(id)   on delete set null,
  label       text,
  base_amount numeric(14,2) not null default 0,
  rate        numeric(6,2)  not null default 0,
  amount      numeric(14,2) not null default 0,
  period      text,   -- 'YYYY-MM'
  status      text not null default 'DUE' check (status in ('DUE','PAID')),
  date        timestamptz not null default now(),
  paid_at     date,
  created_at  timestamptz not null default now()
);

-- ── price_lists (public shareable grids) ────────────────────────────────────
create table if not exists public.price_lists (
  id          bigint generated always as identity primary key,
  name        text not null,
  slug        text unique,
  description text,
  share_token text unique default replace(gen_random_uuid()::text, '-', ''),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.price_list_items (
  id            bigint generated always as identity primary key,
  price_list_id bigint not null references public.price_lists(id) on delete cascade,
  car_id        bigint references public.cars(id) on delete set null,
  label         text,
  price         numeric(14,2) not null default 0,
  created_at    timestamptz not null default now()
);

-- ============================================================================
-- 4. INDEXES  (every FK the app joins on + common sort columns)
-- ============================================================================
create index if not exists idx_leads_client            on public.leads(client_id);
create index if not exists idx_leads_car               on public.leads(car_id);
create index if not exists idx_leads_stage             on public.leads(stage);
create index if not exists idx_leads_date              on public.leads(date desc);

create index if not exists idx_import_orders_supplier  on public.import_orders(supplier_id);
create index if not exists idx_import_orders_status    on public.import_orders(status);
create index if not exists idx_import_orders_date      on public.import_orders(order_date desc);
create index if not exists idx_import_cars_order       on public.import_order_cars(import_order_id);
create index if not exists idx_import_cars_car         on public.import_order_cars(car_id);

create index if not exists idx_client_orders_client    on public.client_orders(client_id);
create index if not exists idx_client_orders_import    on public.client_orders(import_order_id);
create index if not exists idx_client_orders_car       on public.client_orders(car_id);
create index if not exists idx_client_orders_status    on public.client_orders(status);
create index if not exists idx_client_orders_date      on public.client_orders(order_date desc);
create index if not exists idx_client_order_pay_parent on public.client_order_payments(client_order_id);

create index if not exists idx_services_category       on public.services(category_id);

create index if not exists idx_quotes_client           on public.quotes(client_id);
create index if not exists idx_quotes_car              on public.quotes(car_id);
create index if not exists idx_quotes_status           on public.quotes(status);
create index if not exists idx_quotes_date             on public.quotes(date desc);
create index if not exists idx_quote_lines_parent      on public.quote_lines(quote_id);

create index if not exists idx_invoices_client         on public.invoices(client_id);
create index if not exists idx_invoices_sale           on public.invoices(sale_id);
create index if not exists idx_invoices_status         on public.invoices(status);
create index if not exists idx_invoices_date           on public.invoices(date desc);
create index if not exists idx_invoice_lines_parent    on public.invoice_lines(invoice_id);
create index if not exists idx_invoice_pay_parent      on public.invoice_payments(invoice_id);

create index if not exists idx_admin_files_car         on public.admin_files(car_id);
create index if not exists idx_admin_files_client      on public.admin_files(client_id);
create index if not exists idx_admin_files_status      on public.admin_files(status);
create index if not exists idx_admin_files_date        on public.admin_files(date desc);

create index if not exists idx_workshop_client         on public.workshop_appointments(client_id);
create index if not exists idx_workshop_car            on public.workshop_appointments(car_id);
create index if not exists idx_workshop_service        on public.workshop_appointments(service_id);
create index if not exists idx_workshop_sched          on public.workshop_appointments(scheduled_at desc);

create index if not exists idx_commissions_worker      on public.commissions(worker_id);
create index if not exists idx_commissions_sale        on public.commissions(sale_id);
create index if not exists idx_commissions_status      on public.commissions(status);
create index if not exists idx_commissions_period      on public.commissions(period);

create index if not exists idx_price_list_items_parent on public.price_list_items(price_list_id);
create index if not exists idx_price_list_items_car    on public.price_list_items(car_id);

-- ============================================================================
-- 5. TRIGGERS — maintain amount_rest on the two new debt ledgers
--    (mirrors purchases/sales pattern in schema.sql §3)
-- ============================================================================

-- ── client_orders.amount_rest = agreed_total − paid − later payments ────────
create or replace function public.client_orders_set_rest()
returns trigger language plpgsql as $$
begin
  new.amount_rest := coalesce(new.agreed_total, 0)
                   - coalesce(new.amount_paid, 0)
                   - coalesce((select sum(p.amount)
                                 from public.client_order_payments p
                                where p.client_order_id = new.id), 0);
  return new;
end $$;

drop trigger if exists trg_client_orders_set_rest on public.client_orders;
create trigger trg_client_orders_set_rest
  before insert or update on public.client_orders
  for each row execute function public.client_orders_set_rest();

create or replace function public.client_order_payments_recalc()
returns trigger language plpgsql as $$
declare v_id bigint;
begin
  v_id := coalesce(new.client_order_id, old.client_order_id);
  update public.client_orders set amount_paid = amount_paid where id = v_id;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_client_order_payments_recalc on public.client_order_payments;
create trigger trg_client_order_payments_recalc
  after insert or update or delete on public.client_order_payments
  for each row execute function public.client_order_payments_recalc();

-- ── invoices.amount_rest = total − paid − later payments ────────────────────
create or replace function public.invoices_set_rest()
returns trigger language plpgsql as $$
begin
  new.amount_rest := coalesce(new.total, 0)
                   - coalesce(new.amount_paid, 0)
                   - coalesce((select sum(p.amount)
                                 from public.invoice_payments p
                                where p.invoice_id = new.id), 0);
  return new;
end $$;

drop trigger if exists trg_invoices_set_rest on public.invoices;
create trigger trg_invoices_set_rest
  before insert or update on public.invoices
  for each row execute function public.invoices_set_rest();

create or replace function public.invoice_payments_recalc()
returns trigger language plpgsql as $$
declare v_id bigint;
begin
  v_id := coalesce(new.invoice_id, old.invoice_id);
  update public.invoices set amount_paid = amount_paid where id = v_id;
  return coalesce(new, old);
end $$;

drop trigger if exists trg_invoice_payments_recalc on public.invoice_payments;
create trigger trg_invoice_payments_recalc
  after insert or update or delete on public.invoice_payments
  for each row execute function public.invoice_payments_recalc();

-- ============================================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================================
alter table public.leads                  enable row level security;
alter table public.import_orders           enable row level security;
alter table public.import_order_cars       enable row level security;
alter table public.client_orders           enable row level security;
alter table public.client_order_payments   enable row level security;
alter table public.service_categories      enable row level security;
alter table public.services                enable row level security;
alter table public.quotes                  enable row level security;
alter table public.quote_lines             enable row level security;
alter table public.invoices                enable row level security;
alter table public.invoice_lines           enable row level security;
alter table public.invoice_payments        enable row level security;
alter table public.admin_files             enable row level security;
alter table public.workshop_appointments   enable row level security;
alter table public.commissions             enable row level security;
alter table public.price_lists             enable row level security;
alter table public.price_list_items        enable row level security;

-- ── back-office tables: any signed-in account (auth_all) ────────────────────
do $$
declare t text;
begin
  foreach t in array array[
    'leads','import_orders','import_order_cars','client_orders','client_order_payments',
    'service_categories','services','quotes','quote_lines','invoices','invoice_lines',
    'invoice_payments','admin_files','workshop_appointments','commissions',
    'price_lists','price_list_items'
  ] loop
    execute format('drop policy if exists "auth_all" on public.%I', t);
    execute format(
      'create policy "auth_all" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- ── price lists: the public website reads a shared grid (separate anon SELECT,
--    auth_all above is NOT widened) ─────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['price_lists','price_list_items'] loop
    execute format('drop policy if exists "%s_anon_read" on public.%I', t, t);
    execute format(
      'create policy "%s_anon_read" on public.%I for select to anon using (true)', t, t);
  end loop;
end $$;

-- ============================================================================
-- 7. SEED — default service categories (feature is usable without them, but
--    these make the catalog immediately useful). Guarded, so re-runs no-op.
-- ============================================================================
insert into public.service_categories (name) values
  ('Mécanique'), ('Carrosserie'), ('Entretien'), ('Préparation'), ('Administratif')
on conflict (name) do nothing;

-- ============================================================================
-- 8. VERIFY (optional) — every new table should list here after a run.
-- ============================================================================
-- select table_name from information_schema.tables
--  where table_schema = 'public'
--    and table_name in ('leads','import_orders','import_order_cars','client_orders',
--      'client_order_payments','service_categories','services','quotes','quote_lines',
--      'invoices','invoice_lines','invoice_payments','admin_files',
--      'workshop_appointments','commissions','price_lists','price_list_items')
--  order by table_name;
