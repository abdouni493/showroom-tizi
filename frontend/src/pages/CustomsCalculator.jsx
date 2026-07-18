import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Calculator, Copy, RotateCcw } from "lucide-react";
import { Card, Field, Toggle, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount } from "../utils/format.js";

// Indicative Algerian import-duty estimator. Rates are editable and clearly
// marked as indicative — customs fixes the definitive amounts.
const ENERGIES = ["ESSENCE", "DIESEL", "ELECTRIC"];

// TIC bracket (Taxe Intérieure de Consommation) by energy + displacement (cm³).
function ticRate(energy, cc) {
  if (energy === "ELECTRIC") return 0;
  if (energy === "DIESEL") {
    if (cc <= 1500) return 60;
    return 100;
  }
  // essence
  if (cc <= 1500) return 30;
  if (cc <= 2000) return 60;
  return 100;
}

// TVN (Taxe Véhicule Neuf) — flat, new vehicles only. Indicative brackets.
function tvnForfait(cc) {
  if (cc <= 1500) return 50000;
  if (cc <= 2000) return 100000;
  return 150000;
}

const PORT_DEFAULT = 212500; // dégroupage, visite, expertise, transitaire, redevance…

export default function CustomsCalculator() {
  const { t } = useTranslation();
  const toast = useToast();

  const [f, setF] = useState({
    currency: "EUR",
    price: 18000,
    rate: 279,
    customsRate: 153,
    serviceFees: 2000,
    cc: 1800,
    energy: "ESSENCE",
    age: 0,
    condition: "USED",
    ccr: false,
    portFees: PORT_DEFAULT,
  });
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const r = useMemo(() => {
    const price = Number(f.price) || 0;
    const V = Math.round(price * (Number(f.customsRate) || 0)); // valeur en douane (DZD)
    const solidarity = Math.round(V * 0.03);
    const duty = f.ccr ? 0 : Math.round(V * 0.3);
    const ticPct = ticRate(f.energy, Number(f.cc) || 0);
    const tic = Math.round((V + solidarity + duty) * (ticPct / 100));
    const tva = Math.round((V + solidarity + duty + tic) * 0.19);
    const tvn = f.condition === "NEW" ? tvnForfait(Number(f.cc) || 0) : 0;
    const customsTotal = solidarity + duty + tic + tva + tvn;
    const port = Number(f.portFees) || 0;
    const rate = Number(f.rate) || 0;
    const serviceFees = Number(f.serviceFees) || 0;
    const customsTotalCur = rate ? customsTotal / rate : 0;
    const payOrderCur = price + serviceFees;
    const grandCur = payOrderCur + customsTotalCur + (rate ? port / rate : 0);
    return { V, solidarity, duty, ticPct, tic, tva, tvn, customsTotal, port, customsTotalCur, payOrderCur, grandCur };
  }, [f]);

  const reset = () =>
    setF({ currency: "EUR", price: 0, rate: 279, customsRate: 153, serviceFees: 0, cc: 1800, energy: "ESSENCE", age: 0, condition: "USED", ccr: false, portFees: PORT_DEFAULT });

  const copy = () => {
    const cur = f.currency;
    const lines = [
      `${t("customs.customsValue")}: ${formatAmount(r.V)}`,
      `${t("customs.solidarity")}: ${formatAmount(r.solidarity)}`,
      `${t("customs.duty")}: ${formatAmount(r.duty)}`,
      `TIC (${r.ticPct}%): ${formatAmount(r.tic)}`,
      `TVA (19%): ${formatAmount(r.tva)}`,
      `TVN: ${formatAmount(r.tvn)}`,
      `${t("customs.portFees")}: ${formatAmount(r.port)}`,
      `${t("customs.customsTotal")}: ${formatAmount(r.customsTotal)}`,
      `${t("customs.grandTotal")}: ${Math.round(r.grandCur)} ${cur}`,
    ];
    navigator.clipboard?.writeText(lines.join("\n"));
    toast(t("customs.copied"));
  };

  const Row = ({ label, hint, value, strong }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-silver-500/12">
      <div>
        <p className={`text-sm ${strong ? "heading text-text-primary" : "text-text-muted"}`}>{label}</p>
        {hint && <p className="text-[0.62rem] text-text-muted">{hint}</p>}
      </div>
      <p className={`text-sm ${strong ? "font-black text-crimson-300" : "text-text-primary"}`}>{formatAmount(value)}</p>
    </div>
  );

  return (
    <div>
      <PageHeader title={t("customs.title")} subtitle={t("customs.subtitle")} />

      <Card className="p-4 mb-5 border-l-4" style={{ borderLeftColor: "#C89143" }}>
        <p className="text-xs text-text-muted">{t("customs.disclaimer")}</p>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Inputs */}
        <Card className="p-5">
          <h3 className="heading text-sm text-text-primary mb-4">{t("customs.params")}</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label={t("customs.currency")}>
              <select className="input" value={f.currency} onChange={(e) => set("currency", e.target.value)}>
                <option value="EUR">EUR (€)</option>
                <option value="USD">USD ($)</option>
              </select>
            </Field>
            <Field label={`${t("customs.price")} (${f.currency})`}>
              <input type="number" className="input" value={f.price} onChange={(e) => set("price", e.target.value)} />
            </Field>
            <Field label={t("customs.rate")}>
              <input type="number" className="input" value={f.rate} onChange={(e) => set("rate", e.target.value)} />
            </Field>
            <Field label={t("customs.customsRate")}>
              <input type="number" className="input" value={f.customsRate} onChange={(e) => set("customsRate", e.target.value)} />
            </Field>
            <Field label={`${t("customs.serviceFees")} (${f.currency})`}>
              <input type="number" className="input" value={f.serviceFees} onChange={(e) => set("serviceFees", e.target.value)} />
            </Field>
            <Field label={t("customs.displacement")}>
              <input type="number" className="input" value={f.cc} onChange={(e) => set("cc", e.target.value)} />
            </Field>
            <Field label={t("customs.energy")}>
              <select className="input" value={f.energy} onChange={(e) => set("energy", e.target.value)}>
                {ENERGIES.map((e) => (
                  <option key={e} value={e}>{t(`energy.${e}`)}</option>
                ))}
              </select>
            </Field>
            <Field label={t("customs.condition")}>
              <select className="input" value={f.condition} onChange={(e) => set("condition", e.target.value)}>
                <option value="NEW">{t("customs.new")}</option>
                <option value="USED">{t("customs.used")}</option>
              </select>
            </Field>
            <Field label={t("customs.portFees")}>
              <input type="number" className="input" value={f.portFees} onChange={(e) => set("portFees", e.target.value)} />
            </Field>
            <div className="flex items-end pb-2">
              <Toggle checked={f.ccr} onChange={(v) => set("ccr", v)} label={t("customs.ccr")} />
            </div>
          </div>
        </Card>

        {/* Results */}
        <Card className="p-5">
          <h3 className="heading text-sm text-text-primary mb-4">{t("customs.result")}</h3>
          <Row label={t("customs.customsValue")} hint={`${t("customs.price")} × ${f.customsRate}`} value={r.V} />
          <Row label={t("customs.solidarity")} hint="3% × V" value={r.solidarity} />
          <Row label={t("customs.duty")} hint={f.ccr ? "CCR — 0" : "30% × V"} value={r.duty} />
          <Row label={`TIC (${r.ticPct}%)`} hint="× (V + Contrib + DD)" value={r.tic} />
          <Row label="TVA (19%)" hint="× (V + Contrib + DD + TIC)" value={r.tva} />
          <Row label="TVN" hint={f.condition === "NEW" ? t("customs.new") : "—"} value={r.tvn} />
          <Row label={t("customs.portFees")} value={r.port} />
          <Row label={t("customs.customsTotal")} value={r.customsTotal} strong />

          <div className="mt-4 glass-card p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{t("customs.payOrder")}</span>
              <span className="text-text-primary font-bold">{Math.round(r.payOrderCur)} {f.currency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">{t("customs.payCustoms")}</span>
              <span className="text-text-primary font-bold">≈ {Math.round(r.customsTotalCur)} {f.currency}</span>
            </div>
            <div className="flex justify-between text-base pt-2 border-t border-silver-500/16">
              <span className="heading text-text-primary">{t("customs.grandTotal")}</span>
              <span className="font-black text-crimson-300">≈ {Math.round(r.grandCur)} {f.currency}</span>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button className="btn-silver flex-1" onClick={copy}><Copy size={16} /> {t("customs.copy")}</button>
            <button className="btn-ghost" onClick={reset}><RotateCcw size={16} /> {t("customs.reset")}</button>
          </div>
        </Card>
      </div>
    </div>
  );
}
