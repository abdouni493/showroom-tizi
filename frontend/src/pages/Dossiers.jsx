import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FolderKanban, Pencil, Trash2 } from "lucide-react";
import { dossiersApi, carsApi, clientsApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount, formatDate } from "../utils/format.js";

const TYPES = ["CUSTOMS", "REGISTRATION", "COC", "TAX_CLEARANCE", "OTHER"];
const STATUSES = ["PENDING", "IN_PROGRESS", "SUBMITTED", "COMPLETED", "BLOCKED"];
const STATUS_COLOR = { PENDING: "muted", IN_PROGRESS: "info", SUBMITTED: "warning", COMPLETED: "success", BLOCKED: "debt" };

export default function Dossiers() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: files, loading, refetch } = useFetch(() => dossiersApi.list(), []);
  const { data: cars } = useFetch(() => carsApi.list(), []);
  const { data: clients } = useFetch(() => clientsApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const openNew = () => { setForm({ type: "CUSTOMS", status: "PENDING", cost: 0 }); setEditId(null); };
  const openEdit = (d) => { setForm({ ...d }); setEditId(d.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await dossiersApi.update(editId, form);
      else await dossiersApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const confirmDelete = async () => { await dossiersApi.delete(deleteId); setDeleteId(null); refetch(); };

  const filtered = (files || []).filter((d) => (!typeFilter || d.type === typeFilter) && (!statusFilter || d.status === statusFilter));

  return (
    <div>
      <PageHeader title={t("dossiers.title")} subtitle={t("dossiers.subtitle")}
        action={can("dossiers", "create") ? openNew : undefined} actionLabel={t("dossiers.new")} />

      <div className="flex flex-wrap gap-3 mb-4">
        <select className="input max-w-[200px]" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">{t("dossiers.allTypes")}</option>
          {TYPES.map((ty) => <option key={ty} value={ty}>{t(`dossiers.type.${ty}`)}</option>)}
        </select>
        <select className="input max-w-[200px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">{t("dossiers.allStatuses")}</option>
          {STATUSES.map((s) => <option key={s} value={s}>{t(`dossiers.status.${s}`)}</option>)}
        </select>
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FolderKanban} message={t("dossiers.empty")} cta={can("dossiers", "create") ? t("dossiers.new") : undefined} onCta={openNew} />
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-silver-500/16">
                <th className="label-caps text-left p-3">{t("common.type")}</th>
                <th className="label-caps text-left p-3">{t("common.vehicle")}</th>
                <th className="label-caps text-left p-3">{t("dossiers.assignee")}</th>
                <th className="label-caps text-left p-3">{t("dossiers.due")}</th>
                <th className="label-caps text-right p-3">{t("common.amount")}</th>
                <th className="label-caps text-left p-3">{t("common.status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id} className="border-b border-silver-500/8 hover:bg-silver-500/5">
                  <td className="p-3"><Badge color="info">{t(`dossiers.type.${d.type}`)}</Badge></td>
                  <td className="p-3 text-text-primary">{d.car ? `${d.car.brand} ${d.car.model}` : "—"}</td>
                  <td className="p-3 text-text-muted">{d.assignee || "—"}</td>
                  <td className="p-3 text-text-muted">{formatDate(d.dueDate)}</td>
                  <td className="p-3 text-right text-text-primary">{formatAmount(d.cost)}</td>
                  <td className="p-3"><Badge color={STATUS_COLOR[d.status]}>{t(`dossiers.status.${d.status}`)}</Badge></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {can("dossiers", "edit") && <button className="text-text-muted hover:text-text-primary mr-3" onClick={() => openEdit(d)}><Pencil size={15} /></button>}
                    {can("dossiers", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(d.id)}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("dossiers.new")} size="md"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("common.type")}>
                <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {TYPES.map((ty) => <option key={ty} value={ty}>{t(`dossiers.type.${ty}`)}</option>)}
                </select>
              </Field>
              <Field label={t("common.status")}>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{t(`dossiers.status.${s}`)}</option>)}
                </select>
              </Field>
            </div>
            <Field label={`${t("common.vehicle")} (${t("common.optional")})`}>
              <select className="input" value={form.carId || ""} onChange={(e) => setForm({ ...form, carId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {(cars || []).map((c) => <option key={c.id} value={c.id}>{c.brand} {c.model} {c.plate ? `· ${c.plate}` : ""}</option>)}
              </select>
            </Field>
            <Field label={`${t("common.client")} (${t("common.optional")})`}>
              <select className="input" value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("dossiers.assignee")}>
                <input className="input" value={form.assignee || ""} onChange={(e) => setForm({ ...form, assignee: e.target.value })} />
              </Field>
              <Field label={t("dossiers.due")}>
                <input type="date" className="input" value={form.dueDate ? String(form.dueDate).slice(0, 10) : ""} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </Field>
            </div>
            <Field label={t("dossiers.cost")}>
              <input type="number" className="input" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
            </Field>
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
