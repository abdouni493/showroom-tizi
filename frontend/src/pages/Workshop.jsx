import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Hammer, Pencil, Trash2, Clock, CheckCircle2, PlayCircle } from "lucide-react";
import { workshopApi, clientsApi, carsApi, servicesApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, StatCard, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount, formatDateTime, toDateTimeLocal } from "../utils/format.js";

const STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "CANCELLED"];
const STATUS_COLOR = { SCHEDULED: "info", IN_PROGRESS: "warning", COMPLETED: "success", CANCELLED: "debt" };

export default function Workshop() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: appts, loading, refetch } = useFetch(() => workshopApi.list(), []);
  const { data: clients } = useFetch(() => clientsApi.list(), []);
  const { data: cars } = useFetch(() => carsApi.list(), []);
  const { data: services } = useFetch(() => servicesApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const openNew = () => { setForm({ status: "SCHEDULED", durationMin: 60, cost: 0, scheduledAt: new Date().toISOString() }); setEditId(null); };
  const openEdit = (a) => { setForm({ ...a }); setEditId(a.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await workshopApi.update(editId, form);
      else await workshopApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const confirmDelete = async () => { await workshopApi.delete(deleteId); setDeleteId(null); refetch(); };

  const count = (st) => (appts || []).filter((a) => a.status === st).length;
  const filtered = (appts || []).filter((a) => !statusFilter || a.status === statusFilter);

  return (
    <div>
      <PageHeader title={t("workshop.title")} subtitle={t("workshop.subtitle")}
        action={can("workshop", "create") ? openNew : undefined} actionLabel={t("workshop.new")} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("workshop.status.SCHEDULED")} value={count("SCHEDULED")} icon={Clock} color="info" index={0} />
        <StatCard label={t("workshop.status.IN_PROGRESS")} value={count("IN_PROGRESS")} icon={PlayCircle} color="warning" index={1} />
        <StatCard label={t("workshop.status.COMPLETED")} value={count("COMPLETED")} icon={CheckCircle2} color="success" index={2} />
        <StatCard label={t("workshop.total")} value={(appts || []).length} icon={Hammer} color="supplier" index={3} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button className={`chip ${!statusFilter ? "chip-active" : ""}`} onClick={() => setStatusFilter("")}>{t("common.all")}</button>
        {STATUSES.map((s) => (
          <button key={s} className={`chip ${statusFilter === s ? "chip-active" : ""}`} onClick={() => setStatusFilter(s)}>{t(`workshop.status.${s}`)}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Hammer} message={t("workshop.empty")} cta={can("workshop", "create") ? t("workshop.new") : undefined} onCta={openNew} />
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <Card key={a.id} className="p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <p className="heading text-sm text-text-primary">{a.title || a.service?.name || t("workshop.title")}</p>
                <p className="text-xs text-text-muted">
                  {a.client ? `${a.client.firstName} ${a.client.lastName}` : "—"}
                  {a.car ? ` · ${a.car.brand} ${a.car.model}` : ""}
                </p>
              </div>
              <div className="text-right hidden sm:block">
                <p className="text-xs text-text-muted">{formatDateTime(a.scheduledAt)}</p>
                <p className="text-xs text-text-muted">{a.durationMin} min</p>
              </div>
              <span className="text-sm font-black text-crimson-300 whitespace-nowrap">{formatAmount(a.cost)}</span>
              <Badge color={STATUS_COLOR[a.status]}>{t(`workshop.status.${a.status}`)}</Badge>
              <div className="flex gap-2">
                {can("workshop", "edit") && <button className="text-text-muted hover:text-text-primary" onClick={() => openEdit(a)}><Pencil size={15} /></button>}
                {can("workshop", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(a.id)}><Trash2 size={15} /></button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("workshop.new")} size="md"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label={t("workshop.titleLabel")}>
              <input className="input" value={form.title || ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("common.client")}>
                <select className="input" value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </Field>
              <Field label={t("common.vehicle")}>
                <select className="input" value={form.carId || ""} onChange={(e) => setForm({ ...form, carId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {(cars || []).map((c) => <option key={c.id} value={c.id}>{c.brand} {c.model}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t("workshop.service")}>
              <select className="input" value={form.serviceId || ""} onChange={(e) => {
                const svc = (services || []).find((s) => s.id === Number(e.target.value));
                setForm({ ...form, serviceId: e.target.value ? Number(e.target.value) : null, cost: svc ? svc.price : form.cost });
              }}>
                <option value="">—</option>
                {(services || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-3 gap-4">
              <Field label={t("workshop.scheduled")}>
                <input type="datetime-local" className="input" value={toDateTimeLocal(form.scheduledAt)} onChange={(e) => setForm({ ...form, scheduledAt: new Date(e.target.value).toISOString() })} />
              </Field>
              <Field label={t("workshop.duration")}>
                <input type="number" className="input" value={form.durationMin} onChange={(e) => setForm({ ...form, durationMin: e.target.value })} />
              </Field>
              <Field label={t("common.status")}>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{t(`workshop.status.${s}`)}</option>)}
                </select>
              </Field>
            </div>
            <Field label={t("workshop.cost")}>
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
