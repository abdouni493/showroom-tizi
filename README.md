# 🚗 Prestige Auto — Showroom Management System

A complete, production-ready bilingual (French/Arabic) automotive showroom management web application.

- **Frontend:** React 18 + Vite + React Router v6 + Tailwind CSS + Zustand + Recharts + react-i18next
- **Backend:** Node.js + Express + Prisma ORM
- **Database:** SQLite
- **Auth:** JWT (httpOnly cookie + Bearer) + bcrypt
- **Design:** Dark luxury crimson glassmorphism aesthetic

---

## Installation

### 1. Backend

```bash
cd backend
npm install
npx prisma generate
npx prisma db push      # creates dev.db with all tables
node prisma/seed.js     # seeds demo account + sample data
npm run dev             # starts API on http://localhost:4000
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev             # starts app on http://localhost:5173
```

The Vite dev server proxies `/api` and `/uploads` to the backend on port 4000.

---

## Demo credentials

```
Email:    demo@showroom.dz
Password: demo1234
```

Or click **"Compte démo — Accès direct"** on the login page.

---

## Routes

| Route | Description |
|-------|-------------|
| `/login` | Login + admin registration |
| `/website` | Public showroom website (no auth) |
| `/website/contacts` | Public contacts page |
| `/website/car/:id` | Public car detail |
| `/app/dashboard` | KPIs, charts, recent activity |
| `/app/showroom` | Car catalogue + detail drawer |
| `/app/purchase` | Purchases (3-step flow + invoice print) |
| `/app/pos` | Caisse / POS (3-step sale flow + invoice print) |
| `/app/sales` | Sales list (pay debt, edit, delete, print) |
| `/app/payments` | Client car payments + receipts |
| `/app/suppliers` | Suppliers + purchase history |
| `/app/clients` | Clients + full history |
| `/app/workers` | Workers, roles, permissions, advances, absences, payroll |
| `/app/expenses` | Car & showroom expenses |
| `/app/reports` | 9-section printable report by date range |
| `/app/website-settings` | Offers / special offers / contacts / appearance |
| `/app/website-reservations` | Incoming website reservations |
| `/app/settings` | Showroom info / account / backup |

---

## Features

- Full CRUD with real SQLite persistence on every entity
- 3-step Purchase and Sale wizards with image upload & inspection checklists
- Invoice / receipt printing (`window.print()` with print-only templates)
- Debt tracking and payment ledgers on purchases, sales, and cars
- Dashboard analytics (line / bar / doughnut charts)
- Worker payroll with advances, absences, and role-based permission matrix
- Public website with offers, special offers (countdown), reservations
- Bilingual FR/AR with RTL layout switching
- JSON database backup export

---

## Project structure

```
showroom/
├── backend/    Express API, Prisma schema, seed, routes, middleware
└── frontend/   React app (pages, components, store, hooks, i18n, utils)
```
