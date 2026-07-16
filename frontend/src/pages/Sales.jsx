import { useState } from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Trash2, Printer, Wallet, LayoutGrid, Table as TableIcon } from "lucide-react";
import { salesApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { useStore } from "../store/useStore.js";
import { Card, Badge, Modal, ConfirmModal, Field, EmptyState, SkeletonGrid, Toggle, AnimatedGrid, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ActionMenu from "../components/ActionMenu.jsx";
import { CarImage } from "../components/CarCard.jsx";
import { SaleInvoice } from "../components/PrintTemplates.jsx";
import { usePrintDialog } from "../components/PrintChooser.jsx";
import { DualPrice, DualPriceInline } from "../components/PriceInput.jsx";
import { formatAmount, formatDate, formatRate, initials, isUsd, dzdToUsd } from "../utils/format.js";

// A sale's stored dollar figure is its BASE price; TVA and reductions are applied
// to the dinar total. So any dollar amount shown for a *total* is that total
// converted back at the rate the sale was made at.
const saleUsd = (s, dzd) => (isUsd(s.saleCurrency, s.salePriceUsd) ? dzdToUsd(dzd, s.saleExchangeRate) : 0);

const FILTERS = [
  { key: "", tkey: "reservations.filterAll" },
  { key: "saleType=NORMAL", tkey: "sales.filterNormal" },
  { key: "saleType=DEPOSIT", tkey: "sales.filterDeposit" },
  { key: "paid=PAID", tkey: "sales.filterPaid" },
  { key: "paid=DEBT", tkey: "sales.filterDebt" },
];

export default function Sales() {
  const { t } = useTranslation();
  const can = useCan();
  const { settings } = useStore();
  const toast = useToast();
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [view, setView] = useState("cards");
  const { data: sales, loading, refetch } = useFetch(() => {
    const params = { search };
    if (filter.startsWith("saleType=")) params.saleType = filter.split("=")[1];
    if (filter.startsWith("paid=")) params.paid = filter.split("=")[1];
    return salesApi.list(params);
  }, [filter, search]);
  const [viewItem, setViewItem] = useState(null);
  const [payTarget, setPayTarget] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [editItem, setEditItem] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const openPrint = usePrintDialog();
  // Print buttons open a French / Arabic chooser first.
  const doPrint = (s) => openPrint((lang) => <SaleInvoice sale={s} showroom={settings} lang={lang} />);

  const pay = async () => {
    await salesApi.addPayment(payTarget.id, payTarget.carId, Number(payAmount));
    setPayTarget(null); setPayAmount(""); refetch();
    toast(t("sales.paidToast"));
  };

  const saveEdit = async () => {
    await salesApi.update(editItem.id, {
      saleType: editItem.saleType,
      basePrice: Number(editItem.totalBeforeTax),
      tvaEnabled: editItem.tvaEnabled,
      tvaRate: editItem.tvaRate,
      reductionType: editItem.reductionType,
      reductionValue: editItem.reductionValue,
      amountPaid: Number(editItem.amountPaid),
      clientTakeCar: editItem.clientTakeCar,
    });
    setEditItem(null); refetch();
  };

  const confirmDelete = async () => {
    await salesApi.delete(deleteId);
    setDeleteId(null); refetch();
    toast(t("sales.deletedToast"), "info");
  };

  const menuItems = (s) => [
    { label: t("common.view"), icon: Eye, onClick: () => setViewItem(s) },
    can("sales", "edit") && { label: t("common.edit"), icon: Pencil, onClick: () => setEditItem({ ...s }) },
    can("sales", "edit") && s.amountRest > 0 && { label: t("common.payDebt"), icon: Wallet, onClick: () => { setPayTarget(s); setPayAmount(String(s.amountRest)); } },
    can("sales", "print") && { label: t("common.print"), icon: Printer, onClick: () => doPrint(s) },
    can("sales", "delete") && { label: t("common.delete"), icon: Trash2, danger: true, onClick: () => setDeleteId(s.id) },
  ];

  return (
    <div>
      <PageHeader title={t("nav.sales")} />

      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => <button key={f.key} className={`chip ${filter === f.key ? "chip-active" : ""}`} onClick={() => setFilter(f.key)}>{t(f.tkey)}</button>)}
        </div>
        <input className="input sm:max-w-xs sm:ml-auto rtl:sm:ml-0 rtl:sm:mr-auto" placeholder={t("sales.searchPlaceholder")} value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex gap-1">
          <button className={`chip ${view === "cards" ? "chip-active" : ""}`} onClick={() => setView("cards")}><LayoutGrid size={14} /></button>
          <button className={`chip ${view === "table" ? "chip-active" : ""}`} onClick={() => setView("table")}><TableIcon size={14} /></button>
        </div>
      </div>

      {loading ? <SkeletonGrid /> : sales?.length === 0 ? (
        <EmptyState message={t("sales.noSales")} />
      ) : view === "cards" ? (
        <AnimatedGrid className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {sales.map((s) => (
            <Card key={s.id} className="p-4 flex gap-4">
              <div className="w-24 h-[72px] rounded-lg overflow-hidden shrink-0"><CarImage images={s.car?.images} heightClass="h-[72px]" /></div>
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="heading text-sm text-text-primary">{s.client?.firstName} {s.client?.lastName}</p>
                    <p className="text-xs text-text-muted">{s.reference} · {formatDate(s.date)}</p>
                  </div>
                  <ActionMenu items={menuItems(s)} />
                </div>
                <p className="text-xs text-text-muted my-1">{s.car?.brand} {s.car?.model} · {s.car?.plate}</p>
                <div className="flex gap-1.5 mb-1"><Badge color={s.saleType === "DEPOSIT" ? "warning" : "success"}>{s.saleType === "DEPOSIT" ? t("sales.deposit") : t("sales.normal")}</Badge>{s.amountRest > 0 ? <Badge color="debt">{t("sales.debt")}</Badge> : <Badge color="success">{t("sales.paid")}</Badge>}{isUsd(s.saleCurrency, s.salePriceUsd) && <Badge color="success">$</Badge>}</div>
                <div className="flex justify-between items-end text-sm gap-2">
                  <DualPrice dzd={s.totalAfterReduction} currency={s.saleCurrency} usd={saleUsd(s, s.totalAfterReduction)} rate={s.saleExchangeRate} size="sm" className="text-text-primary" />
                  <span className="shrink-0"><span className="text-emerald-400">{formatAmount(s.amountPaid)}</span>{s.amountRest > 0 && <span className="text-rose-400"> · {formatAmount(s.amountRest)}</span>}</span>
                </div>
              </div>
            </Card>
          ))}
        </AnimatedGrid>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="text-left rtl:text-right bg-red-600/10 border-b border-red-600/30">
                {["N°", t("common.client"), t("common.vehicle"), t("common.total"), t("common.paid"), t("common.rest"), t("common.status"), t("common.type"), t("common.date"), ""].map((h, i) => (
                  <th key={i} className="p-3.5 label-caps !text-red-300/80">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sales.map((s, i) => (
                <motion.tr
                  key={s.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`border-b border-red-600/10 transition-colors hover:bg-red-600/8 ${i % 2 ? "bg-white/[0.015]" : ""}`}
                >
                  <td className="p-3 text-text-muted font-mono text-xs">{s.reference}</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-red-600 to-red-900 text-white flex items-center justify-center text-[0.6rem] font-black shrink-0">{initials(`${s.client?.firstName} ${s.client?.lastName}`)}</div>
                      <span className="text-text-primary">{s.client?.firstName} {s.client?.lastName}</span>
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-10 h-7 rounded overflow-hidden shrink-0"><CarImage images={s.car?.images} heightClass="h-7" /></div>
                      <span className="text-text-muted">{s.car?.brand} {s.car?.model}</span>
                    </div>
                  </td>
                  <td className="p-3 text-text-primary font-bold"><DualPriceInline dzd={s.totalAfterReduction} currency={s.saleCurrency} usd={saleUsd(s, s.totalAfterReduction)} /></td>
                  <td className="p-3 text-emerald-400">{formatAmount(s.amountPaid)}</td>
                  <td className="p-3">{s.amountRest > 0 ? <span className="text-rose-400 font-bold">{formatAmount(s.amountRest)}</span> : <span className="text-text-muted">—</span>}</td>
                  <td className="p-3">{s.amountRest > 0 ? <Badge color="debt">{t("sales.debt")}</Badge> : <Badge color="success">{t("sales.paid")}</Badge>}</td>
                  <td className="p-3"><Badge color={s.saleType === "DEPOSIT" ? "warning" : "success"}>{s.saleType === "DEPOSIT" ? t("sales.deposit") : t("sales.normal")}</Badge></td>
                  <td className="p-3 text-text-muted whitespace-nowrap">{formatDate(s.date)}</td>
                  <td className="p-3"><ActionMenu items={menuItems(s)} /></td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* View */}
      <Modal open={!!viewItem} onClose={() => setViewItem(null)} title={t("sales.detail")} size="lg">
        {viewItem && (
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden"><CarImage images={viewItem.car?.images} heightClass="h-44" /></div>
            <div className="grid grid-cols-2 gap-x-6">
              {Object.entries({
                [t("purchase.reference")]: viewItem.reference, [t("common.date")]: formatDate(viewItem.date),
                [t("common.client")]: `${viewItem.client?.firstName} ${viewItem.client?.lastName}`, [t("common.phone")]: viewItem.client?.phonePrimary,
                [t("common.vehicle")]: `${viewItem.car?.brand} ${viewItem.car?.model}`, [t("car.plate")]: viewItem.car?.plate,
                // base price keeps the exact dollar amount the client agreed to
                [t("pos.basePrice")]: (
                  <DualPrice dzd={viewItem.totalBeforeTax} currency={viewItem.saleCurrency} usd={viewItem.salePriceUsd} rate={viewItem.saleExchangeRate} size="sm" />
                ),
                ...(isUsd(viewItem.saleCurrency, viewItem.salePriceUsd)
                  ? { [t("currency.rate")]: formatRate(viewItem.saleExchangeRate) }
                  : {}),
                [t("pos.tva")]: viewItem.tvaEnabled ? `${viewItem.tvaRate}%` : t("common.no"),
                [t("pos.finalTotal")]: (
                  <DualPrice dzd={viewItem.totalAfterReduction} currency={viewItem.saleCurrency} usd={saleUsd(viewItem, viewItem.totalAfterReduction)} rate={viewItem.saleExchangeRate} size="sm" showRate={false} />
                ),
                [t("common.paid")]: formatAmount(viewItem.amountPaid),
                [t("common.rest")]: formatAmount(viewItem.amountRest), [t("common.type")]: viewItem.saleType === "DEPOSIT" ? t("sales.deposit") : t("sales.normal"),
              }).map(([k, v]) => <div key={k} className="flex justify-between text-sm border-b border-red-600/10 py-1.5"><span className="text-text-muted">{k}</span><span className="text-text-primary text-right">{v || "—"}</span></div>)}
            </div>
            {viewItem.payments?.length > 0 && (
              <div><h4 className="heading text-xs text-text-primary mb-2">{t("sales.paymentsHistory")}</h4>
                {viewItem.payments.map((p) => <div key={p.id} className="flex justify-between text-sm border-b border-red-600/10 py-1"><span className="text-text-muted">{formatDate(p.date)} — {p.description}</span><span className="text-emerald-400">{formatAmount(p.amount)}</span></div>)}
              </div>
            )}
            <button className="btn-ghost w-full" onClick={() => doPrint(viewItem)}><Printer size={14} /> {t("sales.printInvoice")}</button>
          </div>
        )}
      </Modal>

      {/* Pay debt */}
      <Modal open={!!payTarget} onClose={() => setPayTarget(null)} title={t("common.payDebt")} size="sm"
        footer={<><button className="btn-ghost" onClick={() => setPayTarget(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={pay}>{t("common.validate")}</button></>}>
        {payTarget && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("common.total")}</span><span className="text-text-primary">{formatAmount(payTarget.totalAfterReduction)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("common.paid")}</span><span className="text-emerald-400">{formatAmount(payTarget.amountPaid)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("common.rest")}</span><span className="text-rose-400">{formatAmount(payTarget.amountRest)}</span></div>
            <Field label={t("sales.paymentToPay")}><input className="input" type="number" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></Field>
          </div>
        )}
      </Modal>

      {/* Edit */}
      <Modal open={!!editItem} onClose={() => setEditItem(null)} title={t("sales.edit")} size="md"
        footer={<><button className="btn-ghost" onClick={() => setEditItem(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={saveEdit}>{t("common.save")}</button></>}>
        {editItem && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <button className={`chip flex-1 ${editItem.saleType === "NORMAL" ? "chip-active" : ""}`} onClick={() => setEditItem({ ...editItem, saleType: "NORMAL" })}>{t("sales.normal")}</button>
              <button className={`chip flex-1 ${editItem.saleType === "DEPOSIT" ? "chip-active" : ""}`} onClick={() => setEditItem({ ...editItem, saleType: "DEPOSIT" })}>{t("sales.deposit")}</button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("pos.basePrice")}><input className="input" type="number" value={editItem.totalBeforeTax} onChange={(e) => setEditItem({ ...editItem, totalBeforeTax: e.target.value })} /></Field>
              <Field label={t("common.paid")}><input className="input" type="number" value={editItem.amountPaid} onChange={(e) => setEditItem({ ...editItem, amountPaid: e.target.value })} /></Field>
            </div>
            <div className="flex items-center justify-between"><span className="label-caps !mb-0">{t("pos.tva")}</span><Toggle checked={editItem.tvaEnabled} onChange={(v) => setEditItem({ ...editItem, tvaEnabled: v })} /></div>
            {editItem.tvaEnabled && <Field label={t("pos.tvaRate")}><input className="input" type="number" value={editItem.tvaRate || ""} onChange={(e) => setEditItem({ ...editItem, tvaRate: e.target.value })} /></Field>}
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} message={t("sales.deleteMsg")} />
    </div>
  );
}
