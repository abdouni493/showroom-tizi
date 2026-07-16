// French-style number formatting: 1 234 567 DA
export function formatAmount(value, currency = "DA") {
  const n = Number(value) || 0;
  const formatted = Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${formatted}${currency ? " " + currency : ""}`;
}

// ── Dual currency (USD / DZD) ────────────────────────────────────────────────
// A price may be entered in dollars. When it is, the DZD column stays the
// canonical value (usd × rate, computed at entry time) so every existing total,
// debt and report keeps working — and the USD amount + the rate used are kept
// alongside it purely so the original deal can be shown back to the user.

// 1 234.56 $  — keeps cents, unlike the DZD formatter which rounds.
export function formatUsd(value) {
  const n = Number(value) || 0;
  const [int, dec] = n.toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${grouped}${dec === "00" ? "" : "." + dec} $`;
}

// The rate itself: 1 $ = 262 DA
export function formatRate(rate) {
  const n = Number(rate) || 0;
  if (!n) return "—";
  const s = n.toFixed(2).replace(/\.00$/, "");
  return `1 $ = ${s.replace(/\B(?=(\d{3})+(?!\d))/g, " ")} DA`;
}

// True when this price was actually entered in dollars.
export function isUsd(currency, usdAmount) {
  return currency === "USD" && Number(usdAmount) > 0;
}

// usd × rate → DZD (rounded to the dinar, matching how totals are stored).
export function usdToDzd(usd, rate) {
  return Math.round((Number(usd) || 0) * (Number(rate) || 0));
}

// DZD ÷ rate → USD. Needed for sale totals: the dollar amount stored on a sale
// is the BASE price, while TVA and reductions are applied to the dinar value —
// so the final total's dollar equivalent has to be converted back at the same
// rate rather than read off the stored figure.
export function dzdToUsd(dzd, rate) {
  const r = Number(rate) || 0;
  return r ? (Number(dzd) || 0) / r : 0;
}

// The one-line label used everywhere a dual price is shown:
//   entered in DA  → "1 500 000 DA"
//   entered in USD → "5 725.19 $ (1 500 000 DA)"
export function formatDual(dzd, currency, usdAmount) {
  if (!isUsd(currency, usdAmount)) return formatAmount(dzd);
  return `${formatUsd(usdAmount)} (${formatAmount(dzd)})`;
}

// jj/mm/aaaa
export function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return "—";
  return d.toLocaleString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

// for datetime-local input value
export function toDateTimeLocal(value) {
  const d = value ? new Date(value) : new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function toDateInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function initials(name = "") {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
}

// countdown remaining time to a date
export function countdown(endDate) {
  if (!endDate) return null;
  const diff = new Date(endDate) - new Date();
  if (diff <= 0) return { expired: true, days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  return { expired: false, days, hours, minutes };
}

import i18n from "../i18n/index.js";

// i18n-aware label maps: ENERGY_LABELS[key] resolves to the current language.
function tProxy(ns) {
  return new Proxy(
    {},
    {
      get: (_, key) => {
        if (typeof key !== "string") return undefined;
        return i18n.t(`${ns}.${key}`);
      },
    }
  );
}

export const ENERGY_LABELS = tProxy("energy");
export const GEARBOX_LABELS = tProxy("gearbox");
export const STATUS_LABELS = tProxy("status");

export const STATUS_COLORS = {
  AVAILABLE: "success",
  SOLD: "accent",
  RESERVED: "warning",
};
