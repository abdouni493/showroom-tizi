import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, Car, Coins, Percent } from "lucide-react";
import { carsApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { Card, Badge, StatCard, EmptyState } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount } from "../utils/format.js";

const IMPORT_COST_KEYS = ["transportCost", "insuranceCost", "customsDuty", "ticCost", "registrationFees", "otherImportCosts"];

export default function Profitability() {
  const { t } = useTranslation();
  const { data: cars, loading } = useFetch(() => carsApi.list(), []);
  const [filter, setFilter] = useState("SOLD");

  const rows = useMemo(() => {
    return (cars || []).map((c) => {
      const purchasePrice = c.purchase?.purchasePrice || 0;
      const importCosts = IMPORT_COST_KEYS.reduce((a, k) => a + (Number(c[k]) || 0), 0);
      const carExpenses = (c.expenses || []).filter((e) => e.type === "CAR").reduce((a, e) => a + (e.amount || 0), 0);
      const totalCost = purchasePrice + importCosts + carExpenses;
      const salePrice = (c.sales || []).reduce((a, s) => a + (s.totalAfterReduction || 0), 0);
      const sold = c.status === "SOLD" || (c.sales || []).length > 0;
      const netMargin = salePrice - totalCost;
      const netMarginPct = salePrice ? (netMargin / salePrice) * 100 : 0;
      return { car: c, purchasePrice, importCosts, carExpenses, totalCost, salePrice, sold, netMargin, netMarginPct };
    });
  }, [cars]);

  const filtered = rows.filter((r) => (filter === "ALL" ? true : filter === "SOLD" ? r.sold : !r.sold));
  const soldRows = rows.filter((r) => r.sold);
  const caTotal = soldRows.reduce((a, r) => a + r.salePrice, 0);
  const costTotal = soldRows.reduce((a, r) => a + r.totalCost, 0);
  const netTotal = caTotal - costTotal;
  const netPct = caTotal ? (netTotal / caTotal) * 100 : 0;
  const avgMargin = soldRows.length ? Math.round(netTotal / soldRows.length) : 0;

  return (
    <div>
      <PageHeader title={t("profitability.title")} subtitle={t("profitability.subtitle")} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("profitability.sold")} value={soldRows.length} icon={Car} color="info" index={0} />
        <StatCard label={t("profitability.revenue")} value={formatAmount(caTotal)} icon={Coins} color="success" index={1} />
        <StatCard label={t("profitability.cost")} value={formatAmount(costTotal)} icon={Coins} color="warning" index={2} />
        <StatCard label={`${t("profitability.netMargin")} (${netPct.toFixed(1)}%)`} value={formatAmount(netTotal)} icon={TrendingUp} color={netTotal >= 0 ? "success" : "debt"} index={3} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {["SOLD", "STOCK", "ALL"].map((f) => (
          <button key={f} className={`chip ${filter === f ? "chip-active" : ""}`} onClick={() => setFilter(f)}>{t(`profitability.filter.${f}`)}</button>
        ))}
        <span className="chip !cursor-default">{t("profitability.avgMargin")}: {formatAmount(avgMargin)}</span>
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={TrendingUp} message={t("profitability.empty")} />
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-silver-500/16">
                <th className="label-caps text-left p-3">{t("common.vehicle")}</th>
                <th className="label-caps text-right p-3">{t("profitability.purchase")}</th>
                <th className="label-caps text-right p-3">{t("profitability.importCosts")}</th>
                <th className="label-caps text-right p-3">{t("profitability.totalCost")}</th>
                <th className="label-caps text-right p-3">{t("profitability.salePrice")}</th>
                <th className="label-caps text-right p-3">{t("profitability.netMargin")}</th>
                <th className="label-caps text-right p-3">%</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.car.id} className="border-b border-silver-500/8 hover:bg-silver-500/5">
                  <td className="p-3 text-text-primary">{r.car.brand} {r.car.model} {r.car.plate ? <span className="text-text-muted text-xs">· {r.car.plate}</span> : null}</td>
                  <td className="p-3 text-right text-text-muted">{formatAmount(r.purchasePrice)}</td>
                  <td className="p-3 text-right text-text-muted">{formatAmount(r.importCosts)}</td>
                  <td className="p-3 text-right text-text-primary">{formatAmount(r.totalCost)}</td>
                  <td className="p-3 text-right text-text-primary">{r.sold ? formatAmount(r.salePrice) : "—"}</td>
                  <td className={`p-3 text-right font-bold ${r.sold ? (r.netMargin >= 0 ? "text-[#5FBE9A]" : "text-crimson-300") : "text-text-muted"}`}>{r.sold ? formatAmount(r.netMargin) : "—"}</td>
                  <td className="p-3 text-right">{r.sold ? <Badge color={r.netMargin >= 0 ? "success" : "debt"}>{r.netMarginPct.toFixed(1)}%</Badge> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
