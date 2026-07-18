import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ClipboardList, Trash2, Pencil, Banknote, Ship, PackageCheck, Clock } from "lucide-react";
import { clientOrdersApi, clientsApi, importsApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, StatCard, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount, formatDate, toDateInput } from "../utils/format.js";

const STATUSES = ["ACTIVE", "IN_TRANSIT", "AT_CUSTOMS", "DELIVERED", "CANCELLED"];
const STATUS_COLOR = { ACTIVE: "info", IN_TRANSIT: "warning", AT_CUSTOMS: "warning", DELIVERED: "success", CANCELLED: "debt" };
const DEPOSIT_QUICK = [10, 30, 50, 100];

export default function ClientOrders() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: orders, loading, refetch } = useFetch(() => clientOrdersApi.list(), []);
  const { data: clients } = useFetch(() => clientsApi.list(), []);
  const { data: imports } = useFetch(() => importsApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm({ status: "ACTIVE", currency: "DZD", agreedTotal: 0, depositAmount: 0, orderDate: new Date().toISOString() }); setEditId(null); };
  const openEdit = (o) => { setForm({ ...o }); setEditId(o.id); };

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, amountPaid: editId ? form.amountPaid : form.depositAmount };
      if (editId) await clientOrdersApi.update(editId, payload);
      else await clientOrdersApi.create(payload);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const savePayment = async () => {
    try { await clientOrdersApi.addPayment(payFor.id, { amount: payAmount }); setPayFor(null); setPayAmount(""); refetch(); toast(t("common.saved")); }
    catch (e) { toast(e.message || t("common.error"), "error"); }
  };
  const setStatus = async (o, status) => { await clientOrdersApi.setStatus(o.id, status); refetch(); };
  const confirmDelete = async () => { await clientOrdersApi.delete(deleteId); setDeleteId(null); refetch(); };

  const list = orders || [];
  const active = list.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length;
  const inTransit = list.filter((o) => o.status === "IN_TRANSIT").length;
  const deposits = list.reduce((a, o) => a + (o.amountPaid || 0), 0);
  const overdue = list.filter((o) => o.estimatedDelivery && new Date(o.estimatedDelivery) < new Date() && o.status !== "DELIVERED" && o.status !== "CANCELLED").length;

  return (
    <div>
      <PageHeader title={t("clientOrders.title")} subtitle={t("clientOrders.subtitle")}
        action={can("clientOrders", "create") ? openNew : undefined} actionLabel={t("clientOrders.new")} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("clientOrders.active")} value={active} icon={ClipboardList} color="info" index={0} />
        <StatCard label={t("clientOrders.inTransit")} value={inTransit} icon={Ship} color="warning" index={1} />
        <StatCard label={t("clientOrders.deposits")} value={formatAmount(deposits)} icon={Banknote} color="success" index={2} />
        <StatCard label={t("clientOrders.overdue")} value={overdue} icon={Clock} color="debt" index={3} />
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : list.length === 0 ? (
        <EmptyState icon={ClipboardList} message={t("clientOrders.empty")} cta={can("clientOrders", "create") ? t("clientOrders.new") : undefined} onCta={openNew} />
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-silver-500/16">
                <th className="label-caps text-left p-3">{t("clientOrders.ref")}</th>
                <th className="label-caps text-left p-3">{t("common.client")}</th>
                <th className="label-caps text-left p-3">{t("common.vehicle")}</th>
                <th className="label-caps text-right p-3">{t("clientOrders.agreed")}</th>
                <th className="label-caps text-right p-3">{t("common.rest")}</th>
                <th className="label-caps text-left p-3">{t("common.status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {list.map((o) => (
                <tr key={o.id} className="border-b border-silver-500/8 hover:bg-silver-500/5">
                  <td className="p-3 text-text-primary font-mono text-xs">{o.reference}</td>
                  <td className="p-3 text-text-primary">{o.client ? `${o.client.firstName} ${o.client.lastName}` : "—"}</td>
                  <td className="p-3 text-text-muted">{[o.brand, o.model, o.version].filter(Boolean).join(" ") || "—"}</td>
                  <td className="p-3 text-right text-text-primary">{formatAmount(o.agreedTotal)}</td>
                  <td className="p-3 text-right text-crimson-300">{formatAmount(o.amountRest)}</td>
                  <td className="p-3">
                    {can("clientOrders", "edit") ? (
                      <select className="input !py-1 !text-xs" value={o.status} onChange={(e) => setStatus(o, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`clientOrders.status.${s}`)}</option>)}
                      </select>
                    ) : <Badge color={STATUS_COLOR[o.status]}>{t(`clientOrders.status.${o.status}`)}</Badge>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {can("clientOrders", "edit") && o.amountRest > 0 && <button className="text-text-muted hover:text-[#5FBE9A] mr-3" title={t("clientOrders.addPayment")} onClick={() => { setPayFor(o); setPayAmount(o.amountRest); }}><Banknote size={15} /></button>}
                    {can("clientOrders", "edit") && <button className="text-text-muted hover:text-text-primary mr-3" onClick={() => openEdit(o)}><Pencil size={15} /></button>}
                    {can("clientOrders", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(o.id)}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Form */}
      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("clientOrders.new")} size="lg"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <p className="label-caps">{t("clientOrders.section.client")}</p>
            <Field label={t("common.client")} required>
              <select className="input" value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </Field>

            <p className="label-caps">{t("clientOrders.section.vehicle")}</p>
            <div className="grid grid-cols-3 gap-4">
              <Field label={t("car.brand")} required><input className="input" value={form.brand || ""} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
              <Field label={t("car.model")} required><input className="input" value={form.model || ""} onChange={(e) => setForm({ ...form, model: e.target.value })} /></Field>
              <Field label={t("clientOrders.version")}><input className="input" value={form.version || ""} onChange={(e) => setForm({ ...form, version: e.target.value })} /></Field>
              <Field label={t("car.year")}><input type="number" className="input" value={form.year || ""} onChange={(e) => setForm({ ...form, year: e.target.value })} /></Field>
              <Field label={t("car.color")}><input className="input" value={form.color || ""} onChange={(e) => setForm({ ...form, color: e.target.value })} /></Field>
              <Field label="VIN"><input className="input" value={form.vin || ""} onChange={(e) => setForm({ ...form, vin: e.target.value })} /></Field>
            </div>

            <p className="label-caps">{t("clientOrders.section.financial")}</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("clientOrders.agreed")} required>
                <input type="number" className="input" value={form.agreedTotal} onChange={(e) => setForm({ ...form, agreedTotal: e.target.value })} />
              </Field>
              <Field label={t("clientOrders.deposit")}>
                <input type="number" className="input" value={form.depositAmount} onChange={(e) => setForm({ ...form, depositAmount: e.target.value })} />
              </Field>
            </div>
            <div className="flex gap-2">
              {DEPOSIT_QUICK.map((p) => (
                <button key={p} className="chip" onClick={() => setForm({ ...form, depositAmount: Math.round((Number(form.agreedTotal) || 0) * p / 100) })}>{p}%</button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("clientOrders.paymentMethod")}><input className="input" value={form.paymentMethod || ""} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} /></Field>
              <Field label={t("clientOrders.estimatedDelivery")}><input type="date" className="input" value={toDateInput(form.estimatedDelivery)} onChange={(e) => setForm({ ...form, estimatedDelivery: e.target.value })} /></Field>
            </div>

            <p className="label-caps">{t("clientOrders.section.delivery")}</p>
            <Field label={`${t("clientOrders.linkedImport")} (${t("common.optional")})`}>
              <select className="input" value={form.importOrderId || ""} onChange={(e) => setForm({ ...form, importOrderId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {(imports || []).map((im) => <option key={im.id} value={im.id}>{im.reference} · {im.supplier?.fullName || ""}</option>)}
              </select>
            </Field>
            <Field label={t("clientOrders.cancellationPolicy")}>
              <textarea className="input" rows={2} value={form.cancellationPolicy || ""} onChange={(e) => setForm({ ...form, cancellationPolicy: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>

      {/* Payment */}
      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={t("clientOrders.addPayment")} size="sm"
        footer={<><button className="btn-ghost" onClick={() => setPayFor(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={savePayment}>{t("common.save")}</button></>}>
        {payFor && (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">{payFor.reference} · {t("common.rest")} <span className="text-crimson-300 font-bold">{formatAmount(payFor.amountRest)}</span></p>
            <Field label={t("common.amount")}><input type="number" className="input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></Field>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
