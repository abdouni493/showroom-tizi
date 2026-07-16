import { useStore } from "../store/useStore.js";

// Permission sections — keys match the sidebar nav keys AND the worker-role
// permission map. Order is the sidebar display order.
export const SECTIONS = [
  "dashboard", "showroom", "purchase", "pos", "sales", "payments",
  "caisse", "websiteSettings", "websiteReservations", "suppliers", "clients",
  "workers", "expenses", "reports", "settings",
];

export const ACTIONS = ["view", "create", "edit", "delete", "print"];

// Map a route path segment (e.g. "website-settings") to a permission section.
export const ROUTE_SECTION = {
  dashboard: "dashboard",
  showroom: "showroom",
  purchase: "purchase",
  pos: "pos",
  sales: "sales",
  payments: "payments",
  caisse: "caisse",
  "website-settings": "websiteSettings",
  "website-reservations": "websiteReservations",
  suppliers: "suppliers",
  clients: "clients",
  workers: "workers",
  expenses: "expenses",
  reports: "reports",
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
