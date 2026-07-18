# 04 — schema.sql patch guide

`03-MIGRATION.sql` is what you actually **run** on Supabase. This file says how to fold the same changes into the canonical `schema.sql` so the source-of-truth file stays in sync. Every block below already matches `schema.sql` conventions; paste each into the section named.

> **Prisma note:** `backend/prisma/schema.prisma` has drifted from Supabase and is **out of scope** — do not mirror any of this into it.

Sections referenced are the numbered banners in `schema.sql`:
`0 Extensions · 1 Sequences · 2 Tables · 3 Triggers · 4 Auth trigger · 5 RLS · 6 Storage · 7 Provisioning · 8 Seed · 9 Verify`.

---

## 1 → Section 1 (REFERENCE SEQUENCES)
After the existing `cash_ref_seq` line (~line 40), add:

```sql
create sequence if not exists public.import_ref_seq;
create sequence if not exists public.client_order_ref_seq;
create sequence if not exists public.quote_ref_seq;
create sequence if not exists public.invoice_ref_seq;
create sequence if not exists public.admin_file_ref_seq;
```

## 2 → Section 2 (TABLES) — additive columns on existing tables
Add the `alter table ... add column if not exists` blocks from **§2 of `03-MIGRATION.sql`** immediately after each corresponding `create table` (or, simplest, drop them all in a clearly-commented "additive columns" block at the end of Section 2). They cover:
- **`cars`** — `version, condition, country_of_origin, location`, and money cols `transport_cost, insurance_cost, customs_duty, tic_cost, registration_fees, other_import_costs`.
- **`clients`** — `type, source, whatsapp, city, wilaya, tin, badges`.
- **`settings`** — `slug, iban, activity, city, wilaya, website` (`nif/nis/article/rc` already exist).
- **`expenses`** — `category`.
- **`workers`** — `commission_rate, monthly_target`.

*(In a from-scratch `schema.sql` you'd instead inline these columns into the original `create table` bodies. The `alter … if not exists` form is kept so the file re-runs cleanly either way.)*

## 3 → Section 2 (TABLES) — new tables
Paste the **17 `create table` blocks** from **§3 of `03-MIGRATION.sql`**, in that exact order (FK dependencies: `service_categories`→`services`→`quote_lines`/`invoice_lines`/`workshop_appointments`; `import_orders`→`import_order_cars`/`client_orders`; parents before payment children):

`leads · import_orders · import_order_cars · client_orders · client_order_payments · service_categories · services · quotes · quote_lines · invoices · invoice_lines · invoice_payments · admin_files · workshop_appointments · commissions · price_lists · price_list_items`

Then paste the **index block** from **§4 of `03-MIGRATION.sql`** at the end of Section 2, alongside the existing `idx_*` list.

## 4 → Section 3 (TRIGGERS)
Append the **four functions + four triggers** from **§5 of `03-MIGRATION.sql`**:
`client_orders_set_rest` / `client_order_payments_recalc` and `invoices_set_rest` / `invoice_payments_recalc`. They mirror the existing `purchases_set_rest` / `sales_set_rest` pair exactly.

## 5 → Section 5 (ROW LEVEL SECURITY)
1. Add the 17 `alter table … enable row level security;` lines to the enable list.
2. Add the 17 new table names to the **`auth_all`** `foreach … array[...]` loop (or paste the standalone loop from **§6 of `03-MIGRATION.sql`**).
3. Add the separate **anon SELECT** loop for `price_lists` + `price_list_items` (public website reads shared grids) — keep it separate; do **not** widen `auth_all`.

## 6 → Section 8 (SEED)
Append the default `service_categories` insert (guarded `on conflict (name) do nothing`) from **§7 of `03-MIGRATION.sql`**.

## 7 → Section 9 (VERIFY)
Optionally extend the verify query to include the 17 new table names (commented block at the bottom of `03-MIGRATION.sql`).

---

### Money-model compliance
All USD-enterable money follows the frozen-rate pattern: canonical DZD `numeric(14,2)` + a `_usd` mirror + a per-operation `exchange_rate`, with a `check (currency <> 'USD' or exchange_rate is not null)` guard on `import_orders` and `client_orders`. No existing money column or trigger was altered.
