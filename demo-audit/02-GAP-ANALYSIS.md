# 02 — Gap Analysis

Comparing the JTECH AUTO demo against **this** codebase (Supabase Postgres via `schema.sql`, 15 sidebar sections).

**My current sections (display order):** dashboard · showroom · purchase · pos · sales · payments · caisse · websiteSettings · websiteReservations · suppliers · clients · workers · expenses · reports · settings.

**My current tables:** settings, users, worker_roles, workers, suppliers, clients, cars, car_document_types, car_documents, purchases, purchase_payments, sales, sale_payments, expenses, worker_payments, worker_advances, worker_absences, special_offers, website_reservations, cash_transactions.

Key finding: my **Reports** page already contains ledger sections the demo surfaces as their own screens — §6 *Dettes Clients*, §7 *Dettes Fournisseurs*, §4 *Analyse par Véhicule*, §10 *Opérations en Dollars*. So several demo "screens" are things I already compute, just presented differently.

---

## Table A — demo screen → my equivalent

| Demo screen | My route | Verdict |
|---|---|---|
| Dashboard | `/app/dashboard` | **ALREADY HAVE** (optional: add container/pipeline widgets) |
| Vehicles | `/app/showroom` | **ENHANCE EXISTING** (import-cost breakdown, condition, version, location) |
| Customers | `/app/clients` | **ENHANCE EXISTING** (type, source, whatsapp, wilaya/city, badges) |
| Customer balances (Soldes clients) | `/app/reports` §6 | **ALREADY HAVE** (as report; optional dedicated aging view) |
| Pipeline (CRM) | **NONE** | **NEW SECTION** |
| Quotes (Devis) | **NONE** | **NEW SECTION** |
| Sales | `/app/sales` | **ALREADY HAVE** |
| Invoices (Factures) | **NONE** (print only, no ledger) | **NEW SECTION** |
| Imports / containers | **NONE** | **NEW SECTION** ⭐ (flagship) |
| Fleet View | **NONE** | **NEW SECTION** (sub-view of Imports) |
| Customer Orders (import-to-order) | `/app/website-reservations` (loosely) | **NEW SECTION** |
| Suppliers | `/app/suppliers` | **ALREADY HAVE** |
| Supplier balances (Soldes fournisseurs) | `/app/reports` §7 | **ALREADY HAVE** (as report) |
| Admin Files (Dossiers) | **NONE** | **NEW SECTION** |
| Workshop (Atelier) | **NONE** | **SKIP** (service garage; out of scope for an import/showroom business — pending your call) |
| Services (catalog) | **NONE** | **SKIP** (only useful if Workshop/Quotes ship) |
| Finance (overview) | `/app/reports` + `/app/dashboard` | **ALREADY HAVE** (duplicate) |
| Expenses | `/app/expenses` | **ALREADY HAVE** (optional: add category) |
| Cash Registers | `/app/caisse` | **ENHANCE EXISTING** (multi-register + transfers — see Risks) |
| Commissions | **NONE** | **NEW SECTION** |
| Statistics | `/app/reports` | **ALREADY HAVE** |
| Profitability | `/app/reports` §4 | **ENHANCE EXISTING** (needs import-cost columns) |
| Sales Team (targets/leaderboard) | `/app/workers` (loosely) | **NEW SECTION** (or ENHANCE workers) |
| Customs Calculator | **NONE** | **NEW SECTION** (tool) |
| Price lists | `/app/website-settings` (loosely) | **NEW SECTION** |
| Settings | `/app/settings` | **ENHANCE EXISTING** (fiscal header fields) |
| Help & Tutorial | **NONE** | **SKIP** |

---

## Table B — proposed new sections

Ordered by how well each fits an Algerian import/showroom business and how self-contained it is. Sidebar position uses my existing `SECTIONS` order; **icons are lucide-react names**.

| # | Nav key (camelCase) | Route (kebab) | Icon | Sidebar position | New tables / columns |
|---|---|---|---|---|---|
| B1 ⭐ | `imports` | `imports` | `Ship` | after `purchase` | `import_orders`, `import_order_cars`; **+ import-cost columns on `cars`** (see C1) |
| B2 ⭐ | `clientOrders` | `client-orders` | `ClipboardList` | after `websiteReservations` | `client_orders`, `client_order_payments` |
| B3 | `pipeline` | `pipeline` | `KanbanSquare` | after `pos` (before `sales`) | `leads` (+ optional `lead_activities`) |
| B4 | `quotes` | `quotes` | `FileText` | after `sales` | `quotes`, `quote_lines` |
| B5 | `invoices` | `invoices` | `ReceiptText` | after `quotes` | `invoices`, `invoice_lines`, `invoice_payments`, `invoice_ref_seq` |
| B6 | `dossiers` | `dossiers` | `FolderKanban` | after `imports` | `admin_files` (+ optional `admin_file_docs`) |
| B7 | `commissions` | `commissions` | `Percent` | after `workers` | `commissions` (+ rate/target cols on `workers`) |
| B8 | `customsCalculator` | `customs-calculator` | `Calculator` | after `reports` (Tools) | none required (optional `customs_estimates`) |
| B9 | `priceLists` | `price-lists` | `Tags` | after `websiteSettings` | `price_lists`, `price_list_items` |
| B10 | `salesTeam` | `sales-team` | `Trophy` | after `workers` | reuses `workers` + `commissions`; optional `sales_targets` |

All new sections follow the **5-registration rule** (Sidebar `NAV`, permissions `SECTIONS` + `ROUTE_SECTION`, `App.jsx` route, `fr.json`/`ar.json`) and default to **admin-only visible**.

---

## Table C — enhancements to existing screens

Every item is **additive** — no existing column/route/component removed or renamed.

| # | Files changed | What's added | Schema change? |
|---|---|---|---|
| C1 | `schema.sql` (cars), `Showroom.jsx`/`CarCard.jsx`, `PriceInput.jsx`, `api.js` (cars) | Per-vehicle **import-cost breakdown** (transport, insurance, customs_duty, tic, registration_fees, other_costs) + `condition`, `version`, `location`, `country_of_origin`. Follows the frozen-rate money model. | **Yes** — additive columns on `cars` |
| C2 | `schema.sql` (clients), `ClientForm.jsx`, `Clients.jsx`, `api.js` (clients) | `type` (individual/company/administration), `source`, `whatsapp`, `city`, `wilaya`, `tin`, `badges jsonb` | **Yes** — additive columns on `clients` |
| C3 | `Reports.jsx` (Profitability), `api.js` | Net-margin-per-vehicle column using C1 costs; optional standalone aging view for client/supplier balances | No (reads C1) |
| C4 | `schema.sql` (settings), `Settings.jsx` | Fiscal header fields: `rc`, `nif`, `nis`, `article`, `iban`, `slug`, `activity` (for DZ document headers) | **Yes** — additive on `settings` |
| C5 | `schema.sql` (cash_transactions), `Caisse.jsx`, `api.js` | Optional **multi-register**: `cash_registers` table + nullable `register_id` on `cash_transactions` (defaults to a "Principale" register) + transfers | **Yes** — *see Risks* |
| C6 | `schema.sql` (expenses), `Expenses.jsx` | Optional `category` text column | **Yes** — additive on `expenses` |

---

## Risks

1. **Money model / frozen exchange rate.** Import costs (B1/C1) and client-order deposits (B2) introduce new money columns. They **must** follow the existing pattern: canonical `numeric(14,2)` in DZD + `<x>_currency` / `<x>_price_usd` / `<x>_exchange_rate` frozen per operation. Do **not** alter or recompute the existing `purchases`/`sales` USD columns or their `check` constraints.
2. **Purchase & sale wizards are untouchable.** Imports and Client Orders are **separate** flows. They must not reuse or modify the 3-step purchase/sale wizards in `Purchase.jsx` / `Sales.jsx`. A vehicle created from an import can later feed the normal sale wizard, but the wizard code stays as-is.
3. **Debt-ledger double-accounting.** Invoices (B5) and the demo's balances overlap with my existing `amount_rest` ledgers on `purchases`/`sales` and the Reports debt sections. Invoices must be a **parallel document layer**, not a rewrite of `sale_payments`/`amount_rest`. Decide up front whether an invoice references a `sale` or stands alone, to avoid a customer's debt being counted twice.
4. **Caisse multi-register (C5) is the riskiest enhancement.** `cash_transactions` is single-register today and the Vehicles/Client-Order forms want to auto-debit a chosen register. Adding `register_id` is additive **only if** every existing row/flow defaults to one "Principale" register and the Caisse page keeps working with no register selected. Recommend shipping this **last**, or deferring.
5. **Worker permission matrix.** Each new section is a new key in `permissions.js` `SECTIONS` + `ROUTE_SECTION`, the worker-role JSONB map, and the `AppShell` route gate. New sections default **hidden** for workers until a role grants `view`. Commissions/Sales-Team (B7/B10) touch worker data — confirm workers can't see each other's pay.
6. **Print templates are frozen.** Quotes/Invoices/Contracts would naturally want printing, but `PrintTemplates.jsx` **must not be modified**. Any new document print must be a **separate** component.
7. **Scope creep — Workshop/Services (SKIP).** These model a service garage, not an import/resale showroom. Included in the demo but recommended **out of scope** unless you actually run a workshop. Flagged for your decision, not built by default.
8. **Prisma drift.** `backend/prisma/schema.prisma` is legacy and already out of sync with Supabase; it is **out of scope** and will not be touched.
