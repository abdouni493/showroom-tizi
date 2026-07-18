# 01 — Demo Inventory

**Demo URL:** `https://heuristic-buck.2-58-81-41.plesk.page/app`
**Product name (theirs):** *JTECH AUTO* — "Logiciel de gestion pour concessionnaires automobiles" (vendor: dinateck.com).
**Positioning (from landing):** import/container management for **Algerian** car dealers — *"Du fournisseur à votre showroom"*, *"conteneurs, dossiers douane, livraisons, paiements"*, *"Multi-devises · FR/AR"*, *"Marge nette en réel"*.

## How this was captured (and its limits)

- The URL **500s server-side** on every deep link (`/login`, `/app/...`). The root `/` is a client-rendered SPA that first shows a **Plesk "technical domain" interstitial**; after clicking *Continue to website* it loads the login page.
- The login page exposes an **"Essayer la démo / Sans inscription"** button → enters the app in **read-only demo mode** (`"Mode démo · Lecture seule · Toutes les modifications sont désactivées"`). No credentials were used.
- Because the demo is read-only **and seeded empty**, every list shows its empty state. Data models below were derived from **create-forms / wizards** (which render fully) plus KPI tiles and filter controls, read from the live DOM accessibility tree.
- **Screenshots could not be saved.** The page runs continuous background animations, so the renderer never settles and `computer{screenshot}` times out (30 s) on every screen; additionally the available browser tools can't write a PNG to a disk path. `./demo-audit/shots/` is therefore empty. Structure was captured from the DOM instead (richer than a screenshot for the data model). This is the only part of Phase 1 I could not literally "see" as an image — everything below is from the real DOM, not invented.
- Scope respected: **no source, bundles, logo, images, brand name, marketing copy, or colors were copied.** Only structure, features and the implied data model.

## Global shell

- **Left sidebar**, grouped with section headers: **Overview · Sales · Purchases & Imports · Workshop · Finance · Tools**, then footer (Help, About, Settings). Collapsible ("Toggle Sidebar").
- **Top bar:** brand chip, global search (`⌘K`), SAV phone link, language switch (demo showed **EN/DE**; product advertises FR/AR), theme toggle (light/dark), notifications bell, user menu.
- **Patterns observed:** right-side **Sonner-style toasts** ("Notifications" region), **Radix-style dialogs** (`role=dialog` with Cancel/Save/Close), **tabbed forms**, **multi-step wizards** with a numbered step rail, **Kanban** (drag-drop) and **Table** view toggles, KPI stat-tile rows above every list, status **filter chips** with counts, CSV export buttons, empty-states with an icon + CTA.

---

## Screens

### 1. Dashboard — `/app`
One-line purpose: at-a-glance operations home.
- **KPI tiles:** Vehicles in stock (+ stock value DZD), Active deals, **Active containers**, Customers.
- **Widgets:** Revenue (last 6 months) bar chart; **Lead Pipeline** mini-board (New / Contacted / Test Drive / Nego. / Won / Lost, each a count linking to `/app/pipeline?stage=…`); Recent Vehicles; Recent Deals; "Add a vehicle" CTA.
- **Data model implied:** reads across vehicles, deals/sales, import containers, customers, leads.

### 2. Vehicles — `/app/vehicles` (+ `/app/vehicles/new`)
Purpose: vehicle inventory / fleet.
- **List:** search, status filter, **Show archived** toggle, **Group duplicates** toggle. Empty-state "No vehicles yet".
- **New-vehicle form** = tabbed (**Info · Specs · Photos · Pricing · Description**) with a **"Multiple units"** batch-create toggle ("same specs/photos; only VIN, registration and color differ").
  - **Info:** VIN, Make, Model, Version, Year, Mileage, Condition (New/Used), **Country of origin**, Registration, **Location**, Status (In stock), Save as draft / Save and publish.
  - **Pricing (money model):** Purchase price · **Currency (DZD)** · **Exchange rate**; **Import costs** = Transport, Insurance, Customs duty, VAT, Internal consumption tax (TIC), Registration fees, Other → **TOTAL COST**; **Caisse de paiement (coût total)** — links a cash register that is auto-debited on create; Sale price · Minimum (negotiation) price.
- **Data model implied — `vehicles`:** vin, make, model, version, year, mileage, condition, country_of_origin, registration, location, status(draft/in_stock/…), photos[], description; **cost breakdown:** purchase_price, currency, exchange_rate, transport, insurance, customs_duty, vat, tic, registration_fees, other_costs, total_cost; sale_price, min_price; optional link to a cash register.

### 3. Customers — `/app/customers` (+ Add Customer dialog)
Purpose: customer database.
- **List:** search, **All / Badges** filter, **Voir archivés** toggle.
- **Add-customer dialog:** **Customer Type** (Individual / Company / Administration); **Source** (Walk-in / Phone / WhatsApp / Marketplace / Referral / Facebook / Other); Full Name*, Phone, **WhatsApp**, Email, City, **State/Province (Wilaya — full 58-wilaya list)**, ID Card No., **TIN (Tax ID)**, **Passport/Travel Document** (number, place of issue, date of issue, expiry — "for foreign customers"), Notes; plus **Badges** (segments/tags).
- **Data model implied — `customers`:** type, source, full_name, phone, whatsapp, email, city, wilaya, id_card_no, tin, passport_no/place/issue/expiry, notes, badges[], archived.

### 4. Customer balances (Soldes clients) — `/app/customers/balances`
Purpose: **A/R statement & aging as-of a cutoff date**.
- Header "Arrêté au <date>"; KPIs: Total dû, Clients débiteurs, **Âge moyen impayés (j)**; per-customer rows with activity to that date.
- **Data model implied:** derived view over sales / invoices / payments per customer (no new base table strictly required).

### 5. Pipeline (CRM) — `/app/pipeline` (+ New Opportunity dialog)
Purpose: **sales-lead Kanban**, drag-drop cards between stages.
- Stages: **New · Contacted · Test Drive · Negotiation · Won · Lost**; header total "N • <value> DA".
- **New Opportunity:** Client* (with "+ Nouveau client" quick-add), **Vehicle of interest** (optional), **Source** (Walk-in…), **Value** (number), Notes.
- **Data model implied — `leads`:** client_id, vehicle_id?, source, value, stage, notes, timestamps; (optionally `lead_activities`).

### 6. Quotes (Devis) — `/app/quotes` (+ New quote dialog)
Purpose: professional quotes.
- Status chips w/ counts: **Draft · Sent · Accepted · Refused · Expired**.
- **New quote** = tabbed (**Info · Lines · Totals & terms**): Quote No., Quote date, Customer*, **Valid until**, Currency (DZD), Status, Payment method, Payment information; **line items**; **Net / VAT / Total**.
- **Data model implied — `quotes` + `quote_lines`:** number, date, customer_id, valid_until, currency, status, payment_method, net, vat, total; lines: label/service_id, qty, unit_price, vat_rate.

### 7. Sales — `/app/sales`
Purpose: sales transactions.
- Status chips: **Pending · Completed · Cancelled**; "New Sale". Empty-state.
- **Data model implied:** deals/sales with a status lifecycle (maps to existing `sales`).

### 8. Invoices (Factures) — `/app/invoices`
Purpose: **full invoicing** — invoices, payments & credit notes.
- Actions: **Legal Registry**, New Invoice. KPIs: Total Invoiced, Total Collected, Amount Due, Overdue. Status: **Draft · Sent · Partially Paid · Paid · Overdue · Cancelled**; type filter (invoice / credit note); sort.
- **Data model implied — `invoices` + `invoice_lines` + `invoice_payments`:** number (legal sequence), date, customer_id, type(invoice/credit_note), status, totals (net/vat/total), amount_paid/due; lines; payments; legal registry export.

### 9. Imports — `/app/imports` (+ `/app/imports/new` wizard)
Purpose: **import orders / container tracking** (flagship feature).
- KPIs: En transit, **Au port / Douane**, En retard, Valeur en transit (DA), **Total véhicules (USD)**, Transport (USD), Total (USD), Total (DZD). Filters: status, supplier, **port**. "Vue flotte", CSV, New import order.
- **New-import wizard** (4 steps: **Supplier · Vehicles · Costs · Summary**), step 1: Supplier*, Order Date, **Currency (USD)**, **Exchange Rate to DZD**, **Container Type** (e.g. Conteneur 40 pieds), **N° BL / connaissement**, **Port of Arrival** (Port d'Alger…), **Estimated Arrival (ETA)**, **Date départ origine (ETD)**, **Lien armateur** (MSC/CMA-CGM/Maersk) + **SeaRates** auto-tracking by container/BL number. Step Vehicles = attach vehicles; Costs = shipping/allocated costs; Summary.
- **Data model implied — `import_orders` (+ `import_order_vehicles`):** reference, supplier_id, order_date, currency, exchange_rate, container_type, bl_number, container_number, port, eta, etd, carrier_link, status; per-vehicle allocation of transport/costs.

### 10. Fleet View — `/app/imports/fleet`
Purpose: real-time board of all in-transit containers ("Suivi en temps réel de tous vos conteneurs en cours").
- KPIs: En transit, Au port/Douane, En retard, Valeur totale. Read-only tracking view over `import_orders`.

### 11. Customer Orders (import-to-order) — `/app/client-orders` (+ `/app/client-orders/new`)
Purpose: **"Vehicles imported to order for identified clients"** — pre-order contracts with deposits.
- KPIs: Active, In Transit, At Customs, Delivered this month, **Deposits collected (DZD)**, Overdue. Views: **All / Kanban / Table**.
- **New Import Contract:** Customer* (+ create); **Vehicle spec** (Brand*, Model*, Version, Year, Color, VIN "filled when it arrives", Requested Options); **Financial** — Devise, **Agreed Total Price (DZD)***, **Deposit** (Amount | Percentage, quick 10/30/50/100%), Order Date, Deposit Date, Payment Method, **Register**; **Delivery** — Estimated Delivery, **link to an import container** ("statut du contrat se synchronise avec le container"); **Terms** — Cancellation Policy, Notes.
- **Data model implied — `client_orders` (+ payments):** customer_id, vehicle spec fields, currency, agreed_total, deposit_amount, deposit_pct, order_date, deposit_date, payment_method, register_id, estimated_delivery, import_order_id?, cancellation_policy, status(active/in_transit/at_customs/delivered/…), notes.

### 12. Suppliers — `/app/suppliers`
Purpose: supplier database (maps to existing `suppliers`).

### 13. Supplier balances (Soldes fournisseurs) — `/app/suppliers/balances`
Purpose: **A/P statement & aging as-of a cutoff date**. Toggle "Facture d'achat". KPIs: Total dû aux fournisseurs, Fournisseurs à payer, Fournisseurs actifs. Derived view over purchases/imports/payments.

### 14. Admin Files (Dossiers) — `/app/dossiers`
Purpose: **administrative paperwork tracking** — "Customs clearance, vehicle registration, COC, tax clearance, registration tracking".
- Filters: status, **type**, **responsable (assignee)**; **Liste / Kanban** views; CSV; New file.
- **Data model implied — `admin_files`:** vehicle_id?, type(customs/registration/coc/tax_clearance/…), status, assignee, dates, documents.

### 15. Workshop (Atelier) — `/app/atelier`
Purpose: **service shop** — appointments & work orders, calendar (Day/Week/Month), statuses (Appointments today / In progress / Completed / Overdue). *(Tangential to a pure import/showroom business — flagged for a scope decision.)*

### 16. Services — `/app/services`
Purpose: **catalog of reusable services** (categories + services, active/inactive) added to quotes/invoices ("oil change, diagnosis, wash…"). Supports Workshop + Quotes/Invoices.

### 17. Finance — `/app/finances`
Purpose: financial overview: Revenue this month, **Gross margin (actual)**, Total collected, Expenses this month, **Estimated net profit**, Revenue-vs-expenses (6 mo) chart, Expenses by category, Cash balances, Recent movements. (Overlaps my Dashboard + Reports.)

### 18. Expenses — `/app/finances/expenses`
Purpose: outgoing charges. New expense, **Category** filter, date range (From/To), filtered total, CSV export. Maps to existing `expenses` (adds a category).

### 19. Cash Registers — `/app/finances/cash-registers`
Purpose: **multiple named registers** — "Balances, movements, **transfers** and **daily closures**". New register, **Transfer** between registers. (My `caisse` is single-register.)

### 20. Commissions — `/app/finances/commissions`
Purpose: **sales commissions** by period & status (This month/quarter/year/all). KPIs: Total période, À payer, Payées, count; "Tout marquer payé"; per-line list.
- **Data model implied — `commissions`:** sale_id, salesperson_id, base, rate, amount, status(due/paid), period.

### 21. Statistics — `/app/finances/reports`
Purpose: analytics/reports (maps to my `reports`).

### 22. Profitability — `/app/finances/profitability`
Purpose: **real net margin per vehicle** ("achat + transport + frais additionnels"). KPIs: Véhicules vendus, CA total, Coût total, **Marge nette (DA + %)**, Marge moy./véhicule. Filters Vendus/En stock/Tous. (This is the landing's "Marge nette en réel"; depends on the import-cost breakdown.)

### 23. Sales Team (Équipe commerciale) — `/app/finances/sales-team`
Purpose: **salesperson leaderboard, monthly targets & commission rules**. "Taux par défaut", period selector; KPIs: CA équipe, Commissions dues, Ventes finalisées, Commerciaux actifs.
- **Data model implied:** per-salesperson targets + commission rate (extends workers), feeds `commissions`.

### 24. Customs Calculator — `/app/tools/customs-calculator`
Purpose: **Algerian import duty/tax estimator** (stateless tool).
- Inputs: Currency (EUR/…), vehicle price, exchange rate, **customs rate**, service fees, **cylindrée (cm³)**, **énergie**, âge, **état (Neuf/Occasion)**, régime (Aucun / **CCR sans DD**).
- Computes: Valeur en douane, **Contribution Solidaire (3%)**, **Droits de douane (30%)**, **TIC (30/60/100%)**, **TVA (19%)**, **TVN** (forfait/cylindrée), **frais portuaires** (dégroupage, visite, expertise, transitaire, redevance, quittance, parking) → totals + "à payer à la commande / à la douane" + "Copier le résumé".
- **Data model implied:** none required (pure calculator); optionally persist an estimate per vehicle/order.

### 25. Price lists (Grilles tarifaires) — `/app/price-lists`
Purpose: **multiple price grids** (Public / Revendeur / VIP…) each with a **shareable public link**.
- **Data model implied — `price_lists` (+ items):** name, slug/share token, items(vehicle_id/label, price).

### 26. Settings — `/app/settings`
Purpose: control center, tabbed: **Identité · Marque · Facturation · Portail client · Équipe · Caisses & comm. · Badges · Modules · Journal (audit) · Sécurité · Tarification**.
- Identity/fiscal fields: dealership name, **public slug**, phone, WhatsApp, email, website, wilaya, city, address, **Registre de commerce**, **NIF**, **NIS**, **Article d'imposition**, Bank IBAN/RIB, Activité — "Apparaît dans l'en-tête fiscale des documents (DZ)".

### 27. Help & Tutorial — `/app/help`
Onboarding/help content. **Skipped** (not a business feature).
