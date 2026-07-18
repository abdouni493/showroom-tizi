import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Field } from "./ui.jsx";
import { formatAmount, formatUsd, formatRate, usdToDzd, isUsd } from "../utils/format.js";

// ── Dual-currency price entry ────────────────────────────────────────────────
// A price can be typed in dinars (the default) or in dollars. When dollars are
// chosen the user also gives the rate they bought/sold the dollar at, and the
// dinar value is derived from it — that derived value is what the rest of the
// app (totals, debts, reports) keeps using, so nothing downstream changes.

// The editing state behind one price input.
export function emptyPrice(defaultRate = "") {
  return { currency: "DZD", dzd: "", usd: "", rate: defaultRate ? String(defaultRate) : "" };
}

// Rebuild the editing state from a stored record (edit mode).
export function priceFromRecord(dzd, currency, usd, rate, defaultRate = "") {
  const usingUsd = isUsd(currency, usd);
  return {
    currency: usingUsd ? "USD" : "DZD",
    dzd: dzd == null || dzd === "" ? "" : String(dzd),
    usd: usingUsd ? String(usd) : "",
    rate: usingUsd ? String(rate ?? "") : defaultRate ? String(defaultRate) : "",
  };
}

// The dinar value a price resolves to — the single number the app stores.
export function priceToDzd(price) {
  if (!price) return 0;
  return price.currency === "USD"
    ? usdToDzd(price.usd, price.rate)
    : Math.round(Number(price.dzd) || 0);
}

// Flatten the editing state into the columns the API writes.
export function priceToPayload(price) {
  const usingUsd = price?.currency === "USD" && Number(price.usd) > 0 && Number(price.rate) > 0;
  return {
    dzd: priceToDzd(price),
    currency: usingUsd ? "USD" : "DZD",
    usd: usingUsd ? Number(price.usd) : null,
    rate: usingUsd ? Number(price.rate) : null,
  };
}

// A price is incomplete if dollars were chosen but the rate is missing.
export function priceIsValid(price, { required = false } = {}) {
  if (price?.currency === "USD") return Number(price.usd) > 0 && Number(price.rate) > 0;
  return required ? Number(price.dzd) > 0 : true;
}

export default function PriceInput({ label, value, onChange, required = false, className = "" }) {
  const { t } = useTranslation();
  const price = value || emptyPrice();
  const usd = price.currency === "USD";
  const set = (patch) => onChange({ ...price, ...patch });
  const converted = usdToDzd(price.usd, price.rate);

  return (
    <Field label={label} required={required} className={className}>
      {/* currency switch */}
      <div className="flex gap-1 mb-1.5">
        {[
          ["DZD", t("currency.dzdShort")],
          ["USD", t("currency.usdShort")],
        ].map(([code, lbl]) => (
          <button
            key={code}
            type="button"
            onClick={() => set({ currency: code })}
            className={`px-2.5 py-1 rounded-lg border text-[0.65rem] font-bold uppercase tracking-wider transition ${
              price.currency === code
                ? code === "USD"
                  ? "border-[#3FA07C] bg-[#3FA07C]/16 text-[#5FBE9A]"
                  : "border-crimson-500 bg-crimson-500/16 text-crimson-200"
                : "border-white/10 text-text-muted hover:border-white/25"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      {usd ? (
        <div className="space-y-1.5">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <span className="absolute left-3 rtl:left-auto rtl:right-3 top-1/2 -translate-y-1/2 text-[#5FBE9A] text-sm font-bold">$</span>
              <input
                className="input pl-7 rtl:pl-3 rtl:pr-7"
                type="number"
                step="0.01"
                min="0"
                placeholder={t("currency.amountUsd")}
                value={price.usd}
                onChange={(e) => set({ usd: e.target.value })}
              />
            </div>
            <input
              className="input"
              type="number"
              step="0.01"
              min="0"
              placeholder={t("currency.ratePlaceholder")}
              value={price.rate}
              onChange={(e) => set({ rate: e.target.value })}
            />
          </div>
          <p className="text-[0.65rem] text-text-muted uppercase tracking-wider">{t("currency.rateHint")}</p>
          <AnimatePresence mode="wait">
            <motion.p
              key={converted}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="text-sm"
            >
              <span className="text-text-muted">{t("currency.equivalent")} : </span>
              <span className="font-black text-[#5FBE9A]">{formatAmount(converted)}</span>
            </motion.p>
          </AnimatePresence>
        </div>
      ) : (
        <input
          className="input"
          type="number"
          min="0"
          value={price.dzd}
          onChange={(e) => set({ dzd: e.target.value })}
        />
      )}
    </Field>
  );
}

// ── Display ─────────────────────────────────────────────────────────────────
// Shows the dinar amount, and — when the deal was made in dollars — the dollar
// amount above it plus the rate it was converted at.
export function DualPrice({ dzd, currency, usd, rate, className = "", size = "md", showRate = true }) {
  const usingUsd = isUsd(currency, usd);
  const sizes = {
    sm: { main: "text-sm font-bold", sub: "text-[0.65rem]" },
    md: { main: "text-base font-black", sub: "text-xs" },
    lg: { main: "text-xl font-black", sub: "text-xs" },
    xl: { main: "text-2xl font-black", sub: "text-xs" },
  };
  const s = sizes[size] || sizes.md;

  if (!usingUsd) {
    return <span className={`${s.main} ${className}`}>{formatAmount(dzd)}</span>;
  }
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span className={`${s.main} text-[#5FBE9A]`}>{formatUsd(usd)}</span>
      <span className={`${s.sub} text-text-muted`}>
        {formatAmount(dzd)}
        {showRate && rate ? ` · ${formatRate(rate)}` : ""}
      </span>
    </span>
  );
}

// One-line variant for dense tables: "5 725 $ · 1 500 000 DA"
export function DualPriceInline({ dzd, currency, usd, className = "" }) {
  const usingUsd = isUsd(currency, usd);
  if (!usingUsd) return <span className={className}>{formatAmount(dzd)}</span>;
  return (
    <span className={className}>
      <span className="text-[#5FBE9A] font-bold">{formatUsd(usd)}</span>
      <span className="text-text-muted"> · {formatAmount(dzd)}</span>
    </span>
  );
}
