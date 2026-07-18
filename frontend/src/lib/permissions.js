import { useStore } from "../store/useStore.js";

// Permission sections — keys match the sidebar nav keys AND the worker-role
// permission map. Order is the sidebar display order.
export const SECTIONS = [
  "dashboard", "showroom", "purchase", "imports", "clientOrders", "dossiers",
  "pos", "pipeline", "sales", "quotes", "invoices", "payments",
  "caisse", "websiteSettings", "priceLists", "websiteReservations", "suppliers", "clients",
  "workers", "commissions", "salesTeam", "services", "workshop", "expenses",
  "profitability", "reports", "customsCalculator", "settings",
];

export const ACTIONS = ["view", "create", "edit", "delete", "print"];

// Map a route path segment (e.g. "website-settings") to a permission section.
export const ROUTE_SECTION = {
  dashboard: "dashboard",
  showroom: "showroom",
  purchase: "purchase",
  imports: "imports",
  "client-orders": "clientOrders",
  dossiers: "dossiers",
  pos: "pos",
  pipeline: "pipeline",
  sales: "sales",
  quotes: "quotes",
  invoices: "invoices",
  payments: "payments",
  caisse: "caisse",
  "website-settings": "websiteSettings",
  "price-lists": "priceLists",
  "website-reservations": "websiteReservations",
  suppliers: "suppliers",
  clients: "clients",
  workers: "workers",
  commissions: "commissions",
  "sales-team": "salesTeam",
  services: "services",
  workshop: "workshop",
  expenses: "expenses",
  profitability: "profitability",
  reports: "reports",
  "customs-calculator": "customsCalculator",
  settings: "settings",
};

// Core check. Admins can do everything; workers are limited to their role's map.
export function can(user, section, action = "view") {
  if (!user) return false;
  if (user.isAdmin) return true;
  return !!user.permissions?.[section]?.[action];
}

// First sidebar section the user is allowed to view (used for default landing).
export function firstAllowedSection(user) {
  if (!user || user.isAdmin) return "dashboard";
  return SECTIONS.find((s) => can(user, s, "view")) || null;
}

// Hook: returns a `can(section, action)` bound to the current user, reactive to login.
export function useCan() {
  const user = useStore((s) => s.user);
  return (section, action = "view") => can(user, section, action);
}
