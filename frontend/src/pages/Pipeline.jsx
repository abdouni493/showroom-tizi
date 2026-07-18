import { useState } from "react";
import { useTranslation } from "react-i18next";
import { KanbanSquare, Trash2, Pencil, GripVertical } from "lucide-react";
import { leadsApi, clientsApi, carsApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount } from "../utils/format.js";

const STAGES = ["NEW", "CONTACTED", "TEST_DRIVE", "NEGOTIATION", "WON", "LOST"];
const STAGE_COLOR = { NEW: "info", CONTACTED: "supplier", TEST_DRIVE: "warning", NEGOTIATION: "warning", WON: "success", LOST: "debt" };
const SOURCES = ["WALK_IN", "PHONE", "WHATSAPP", "MARKETPLACE", "REFERRAL", "FACEBOOK", "OTHER"];

export default function Pipeline() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: leads, loading, refetch } = useFetch(() => leadsApi.list(), []);
  const { data: clients } = useFetch(() => clientsApi.list(), []);
  const { data: cars } = useFetch(() => carsApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm({ stage: "NEW", source: "WALK_IN", value: 0 }); setEditId(null); };
  const openEdit = (l) => { setForm({ ...l, clientId: l.clientId, carId: l.carId }); setEditId(l.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await leadsApi.update(editId, form);
      else await leadsApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };

  const move = async (lead, stage) => { await leadsApi.setStage(lead.id, stage); refetch(); };
  const confirmDelete = async () => { await leadsApi.delete(deleteId); setDeleteId(null); refetch(); toast(t("common.saved")); };

  const byStage = (st) => (leads || []).filter((l) => l.stage === st);
  const stageSum = (st) => byStage(st).reduce((a, l) => a + (l.value || 0), 0);

  return (
    <div>
      <PageHeader title={t("pipeline.title")} subtitle={t("pipeline.subtitle")}
        action={can("pipeline", "create") ? openNew : undefined} actionLabel={t("pipeline.new")} />

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : (leads?.length === 0) ? (
        <EmptyState icon={KanbanSquare} message={t("pipeline.empty")} cta={can("pipeline", "create") ? t("pipeline.new") : undefined} onCta={openNew} />
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((st) => (
            <div key={st} className="min-w-[260px] w-[260px] shrink-0">
              <div className="flex items-center justify-between mb-2 px-1">
                <Badge color={STAGE_COLOR[st]}>{t(`pipeline.stage.${st}`)}</Badge>
                <span className="text-[0.62rem] text-text-muted font-bold">{byStage(st).length} · {formatAmount(stageSum(st))}</span>
              </div>
              <div className="space-y-2">
                {byStage(st).map((l) => (
                  <Card key={l.id} className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm text-text-primary heading truncate">
                          {l.client ? `${l.client.firstName} ${l.client.lastName}` : l.contactName || "—"}
                        </p>
                        {l.car && <p className="text-xs text-text-muted truncate">{l.car.brand} {l.car.model}</p>}
                      </div>
                      <span className="text-xs font-black text-crimson-300 whitespace-nowrap">{formatAmount(l.value)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                      <Badge color="muted">{t(`pipeline.source.${l.source}`)}</Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-2 pt-2 border-t border-silver-500/12">
                      <select
                        className="input !py-1 !text-xs flex-1"
                        value={l.stage}
                        onChange={(e) => move(l, e.target.value)}
                        disabled={!can("pipeline", "edit")}
                      >
                        {STAGES.map((s) => <option key={s} value={s}>{t(`pipeline.stage.${s}`)}</option>)}
                      </select>
                      {can("pipeline", "edit") && <button className="text-text-muted hover:text-text-primary" onClick={() => openEdit(l)}><Pencil size={15} /></button>}
                      {can("pipeline", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(l.id)}><Trash2 size={15} /></button>}
                    </div>
                  </Card>
                ))}
                {byStage(st).length === 0 && <p className="text-[0.62rem] text-text-muted text-center py-4">—</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("pipeline.new")} size="md"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label={t("common.client")}>
              <select className="input" value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </Field>
            <Field label={`${t("common.vehicle")} (${t("common.optional")})`}>
              <select className="input" value={form.carId || ""} onChange={(e) => setForm({ ...form, carId: e.target.value ? Number(e.target.value) : null })}>
                <option value="">—</option>
                {(cars || []).map((c) => <option key={c.id} value={c.id}>{c.brand} {c.model} {c.plate ? `· ${c.plate}` : ""}</option>)}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("pipeline.sourceLabel")}>
                <select className="input" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}>
                  {SOURCES.map((s) => <option key={s} value={s}>{t(`pipeline.source.${s}`)}</option>)}
                </select>
              </Field>
              <Field label={t("pipeline.value")}>
                <input type="number" className="input" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
              </Field>
            </div>
            <Field label={t("common.description")}>
              <textarea className="input" rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
