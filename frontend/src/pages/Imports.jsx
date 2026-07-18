import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Ship, Trash2, Pencil, Anchor, AlertTriangle, Container, ExternalLink } from "lucide-react";
import { importsApi, suppliersApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, StatCard, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount, formatDate, formatUsd, toDateInput } from "../utils/format.js";

const STATUSES = ["ORDERED", "IN_TRANSIT", "AT_PORT", "CUSTOMS", "DELIVERED", "CANCELLED"];
const STATUS_COLOR = { ORDERED: "muted", IN_TRANSIT: "info", AT_PORT: "warning", CUSTOMS: "warning", DELIVERED: "success", CANCELLED: "debt" };
const IN_TRANSIT_SET = new Set(["ORDERED", "IN_TRANSIT", "AT_PORT", "CUSTOMS"]);

export default function Imports() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: orders, loading, refetch } = useFetch(() => importsApi.list(), []);
  const { data: suppliers } = useFetch(() => suppliersApi.list(), []);
  const [tab, setTab] = useState("orders");
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm({ status: "ORDERED", currency: "USD", port: "Port d'Alger", orderDate: new Date().toISOString(), vehiclesTotal: 0, transportCost: 0, otherCosts: 0 }); setEditId(null); };
  const openEdit = (o) => { setForm({ ...o }); setEditId(o.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await importsApi.update(editId, form);
      else await importsApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const setStatus = async (o, status) => { await importsApi.setStatus(o.id, status); refetch(); };
  const confirmDelete = async () => { await importsApi.delete(deleteId); setDeleteId(null); refetch(); };

  const list = orders || [];
  const inTransit = list.filter((o) => IN_TRANSIT_SET.has(o.status));
  const atPort = list.filter((o) => o.status === "AT_PORT" || o.status === "CUSTOMS").length;
  const late = list.filter((o) => IN_TRANSIT_SET.has(o.status) && o.eta && new Date(o.eta) < new Date()).length;
  const valueInTransit = inTransit.reduce((a, o) => a + (o.vehiclesTotal || 0) + (o.transportCost || 0) + (o.otherCosts || 0), 0);
  const shown = tab === "fleet" ? inTransit : list;

  const total = (o) => (o.vehiclesTotal || 0) + (o.transportCost || 0) + (o.otherCosts || 0);

  return (
    <div>
      <PageHeader title={t("imports.title")} subtitle={t("imports.subtitle")}
        action={can("imports", "create") ? openNew : undefined} actionLabel={t("imports.new")} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("imports.inTransit")} value={inTransit.length} icon={Ship} color="info" index={0} />
        <StatCard label={t("imports.atPort")} value={atPort} icon={Anchor} color="warning" index={1} />
        <StatCard label={t("imports.late")} value={late} icon={AlertTriangle} color="debt" index={2} />
        <StatCard label={t("imports.valueInTransit")} value={formatAmount(valueInTransit)} icon={Container} color="success" index={3} />
      </div>

      <div className="flex gap-2 mb-4">
        <button className={`chip ${tab === "orders" ? "chip-active" : ""}`} onClick={() => setTab("orders")}>{t("imports.tabOrders")}</button>
        <button className={`chip ${tab === "fleet" ? "chip-active" : ""}`} onClick={() => setTab("fleet")}>{t("imports.tabFleet")}</button>
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : shown.length === 0 ? (
        <EmptyState icon={Ship} message={tab === "fleet" ? t("imports.emptyFleet") : t("imports.empty")} cta={can("imports", "create") && tab === "orders" ? t("imports.new") : undefined} onCta={openNew} />
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-silver-500/16">
                <th className="label-caps text-left p-3">{t("imports.ref")}</th>
                <th className="label-caps text-left p-3">{t("common.supplier")}</th>
                <th className="label-caps text-left p-3">{t("imports.container")}</th>
                <th className="label-caps text-left p-3">{t("imports.port")}</th>
                <th className="label-caps text-left p-3">ETA</th>
                <th className="label-caps text-right p-3">{t("common.total")}</th>
                <th className="label-caps text-left p-3">{t("common.status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((o) => (
                <tr key={o.id} className="border-b border-silver-500/8 hover:bg-silver-500/5">
                  <td className="p-3 text-text-primary font-mono text-xs">{o.reference}</td>
                  <td className="p-3 text-text-primary">{o.supplier?.fullName || "—"}</td>
                  <td className="p-3 text-text-muted">
                    {o.containerNumber || o.blNumber || "—"}
                    {o.carrierLink && <a href={o.carrierLink} target="_blank" rel="noreferrer" className="inline-flex ml-1 text-info"><ExternalLink size={12} /></a>}
                  </td>
                  <td className="p-3 text-text-muted">{o.port || "—"}</td>
                  <td className="p-3 text-text-muted">{formatDate(o.eta)}</td>
                  <td className="p-3 text-right text-text-primary">{formatAmount(total(o))}</td>
                  <td className="p-3">
                    {can("imports", "edit") ? (
                      <select className="input !py-1 !text-xs" value={o.status} onChange={(e) => setStatus(o, e.target.value)}>
                        {STATUSES.map((s) => <option key={s} value={s}>{t(`imports.status.${s}`)}</option>)}
                      </select>
                    ) : <Badge color={STATUS_COLOR[o.status]}>{t(`imports.status.${o.status}`)}</Badge>}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {can("imports", "edit") && <button className="text-text-muted hover:text-text-primary mr-3" onClick={() => openEdit(o)}><Pencil size={15} /></button>}
                    {can("imports", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(o.id)}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("imports.new")} size="lg"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("common.supplier")} required>
                <select className="input" value={form.supplierId || ""} onChange={(e) => setForm({ ...form, supplierId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {(suppliers || []).map((s) => <option key={s.id} value={s.id}>{s.fullName}</option>)}
                </select>
              </Field>
              <Field label={t("imports.containerType")}>
                <input className="input" placeholder="Conteneur 40 pieds" value={form.containerType || ""} onChange={(e) => setForm({ ...form, containerType: e.target.value })} />
              </Field>
              <Field label={t("imports.blNumber")}>
                <input className="input" value={form.blNumber || ""} onChange={(e) => setForm({ ...form, blNumber: e.target.value })} />
              </Field>
              <Field label={t("imports.containerNumber")}>
                <input className="input" value={form.containerNumber || ""} onChange={(e) => setForm({ ...form, containerNumber: e.target.value })} />
              </Field>
              <Field label={t("imports.port")}>
                <input className="input" value={form.port || ""} onChange={(e) => setForm({ ...form, port: e.target.value })} />
              </Field>
              <Field label={t("imports.carrierLink")}>
                <input className="input" placeholder="MSC / CMA-CGM / Maersk…" value={form.carrierLink || ""} onChange={(e) => setForm({ ...form, carrierLink: e.target.value })} />
              </Field>
              <Field label="ETD">
                <input type="date" className="input" value={toDateInput(form.etd)} onChange={(e) => setForm({ ...form, etd: e.target.value })} />
              </Field>
              <Field label="ETA">
                <input type="date" className="input" value={toDateInput(form.eta)} onChange={(e) => setForm({ ...form, eta: e.target.value })} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label={t("imports.currency")}>
                <select className="input" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}>
                  <option value="USD">USD</option>
                  <option value="DZD">DZD</option>
                </select>
              </Field>
              {form.currency === "USD" && (
                <Field label={t("imports.exchangeRate")} required>
                  <input type="number" className="input" value={form.exchangeRate || ""} onChange={(e) => setForm({ ...form, exchangeRate: e.target.value })} />
                </Field>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <Field label={t("imports.vehiclesTotal")}>
                <input type="number" className="input" value={form.vehiclesTotal} onChange={(e) => setForm({ ...form, vehiclesTotal: e.target.value })} />
              </Field>
              <Field label={t("imports.transportCost")}>
                <input type="number" className="input" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} />
              </Field>
              <Field label={t("imports.otherCosts")}>
                <input type="number" className="input" value={form.otherCosts} onChange={(e) => setForm({ ...form, otherCosts: e.target.value })} />
              </Field>
            </div>

            <div className="glass-card p-3 flex justify-between text-sm">
              <span className="text-text-muted">{t("common.total")}</span>
              <span className="font-black text-crimson-300">{formatAmount((Number(form.vehiclesTotal) || 0) + (Number(form.transportCost) || 0) + (Number(form.otherCosts) || 0))}</span>
            </div>

            <Field label={t("common.description")}>
              <textarea className="input" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
