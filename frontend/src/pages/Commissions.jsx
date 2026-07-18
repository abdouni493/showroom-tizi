import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Percent, Trash2, Pencil, Check, Wallet, Clock } from "lucide-react";
import { commissionsApi, workersApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, StatCard, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount, formatDate } from "../utils/format.js";

const currentPeriod = () => new Date().toISOString().slice(0, 7);

export default function Commissions() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const [period, setPeriod] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const { data: rows, loading, refetch } = useFetch(() => commissionsApi.list({ period, status: statusFilter }), [period, statusFilter]);
  const { data: workers } = useFetch(() => workersApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm({ status: "DUE", period: currentPeriod(), baseAmount: 0, rate: 0, amount: "" }); setEditId(null); };
  const openEdit = (c) => { setForm({ ...c }); setEditId(c.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await commissionsApi.update(editId, form);
      else await commissionsApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const togglePaid = async (c) => { await commissionsApi.setPaid(c.id, c.status !== "PAID"); refetch(); };
  const confirmDelete = async () => { await commissionsApi.delete(deleteId); setDeleteId(null); refetch(); };

  const total = (rows || []).reduce((a, c) => a + (c.amount || 0), 0);
  const due = (rows || []).filter((c) => c.status === "DUE").reduce((a, c) => a + (c.amount || 0), 0);
  const paid = (rows || []).filter((c) => c.status === "PAID").reduce((a, c) => a + (c.amount || 0), 0);

  return (
    <div>
      <PageHeader title={t("commissions.title")} subtitle={t("commissions.subtitle")}
        action={can("commissions", "create") ? openNew : undefined} actionLabel={t("commissions.new")} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={t("commissions.totalPeriod")} value={formatAmount(total)} icon={Percent} color="info" index={0} />
        <StatCard label={t("commissions.due")} value={formatAmount(due)} icon={Clock} color="warning" index={1} />
        <StatCard label={t("commissions.paid")} value={formatAmount(paid)} icon={Wallet} color="success" index={2} />
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <input type="month" className="input max-w-[180px]" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder={t("commissions.allPeriods")} />
        <select className="input max-w-[160px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t("common.all")}</option>
          <option value="DUE">{t("commissions.status.DUE")}</option>
          <option value="PAID">{t("commissions.status.PAID")}</option>
        </select>
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : (rows || []).length === 0 ? (
        <EmptyState icon={Percent} message={t("commissions.empty")} cta={can("commissions", "create") ? t("commissions.new") : undefined} onCta={openNew} />
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-silver-500/16">
                <th className="label-caps text-left p-3">{t("commissions.worker")}</th>
                <th className="label-caps text-left p-3">{t("common.description")}</th>
                <th className="label-caps text-right p-3">{t("commissions.base")}</th>
                <th className="label-caps text-right p-3">%</th>
                <th className="label-caps text-right p-3">{t("common.amount")}</th>
                <th className="label-caps text-left p-3">{t("common.status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {(rows || []).map((c) => (
                <tr key={c.id} className="border-b border-silver-500/8 hover:bg-silver-500/5">
                  <td className="p-3 text-text-primary">{c.worker?.fullName || "—"}</td>
                  <td className="p-3 text-text-muted">{c.label || (c.sale ? c.sale.reference : "—")}</td>
                  <td className="p-3 text-right text-text-primary">{formatAmount(c.baseAmount)}</td>
                  <td className="p-3 text-right text-text-muted">{c.rate}%</td>
                  <td className="p-3 text-right font-bold text-crimson-300">{formatAmount(c.amount)}</td>
                  <td className="p-3"><Badge color={c.status === "PAID" ? "success" : "warning"}>{t(`commissions.status.${c.status}`)}</Badge></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {can("commissions", "edit") && <button className="text-text-muted hover:text-[#5FBE9A] mr-3" title={t("commissions.markPaid")} onClick={() => togglePaid(c)}><Check size={15} /></button>}
                    {can("commissions", "edit") && <button className="text-text-muted hover:text-text-primary mr-3" onClick={() => openEdit(c)}><Pencil size={15} /></button>}
                    {can("commissions", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(c.id)}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("commissions.new")} size="md"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label={t("commissions.worker")} required>
              <select className="input" value={form.workerId || ""} onChange={(e) => setForm({ ...form, workerId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {(workers || []).map((w) => <option key={w.id} value={w.id}>{w.fullName}</option>)}
              </select>
            </Field>
            <Field label={t("common.description")}>
              <input className="input" value={form.label || ""} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label={t("commissions.base")}>
                <input type="number" className="input" value={form.baseAmount} onChange={(e) => setForm({ ...form, baseAmount: e.target.value })} />
              </Field>
              <Field label={t("commissions.rate")}>
                <input type="number" className="input" value={form.rate} onChange={(e) => setForm({ ...form, rate: e.target.value })} />
              </Field>
              <Field label={`${t("common.amount")} (${t("common.optional")})`}>
                <input type="number" className="input" placeholder={formatAmount(Math.round((Number(form.baseAmount) || 0) * (Number(form.rate) || 0) / 100))} value={form.amount ?? ""} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("commissions.period")}>
                <input type="month" className="input" value={form.period || ""} onChange={(e) => setForm({ ...form, period: e.target.value })} />
              </Field>
              <Field label={t("common.status")}>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="DUE">{t("commissions.status.DUE")}</option>
                  <option value="PAID">{t("commissions.status.PAID")}</option>
                </select>
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
