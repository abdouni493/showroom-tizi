import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FileText, Trash2, Pencil, Eye, Plus } from "lucide-react";
import { quotesApi, clientsApi, servicesApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, Toggle, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount, formatDate, toDateInput } from "../utils/format.js";

const STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REFUSED", "EXPIRED"];
const STATUS_COLOR = { DRAFT: "muted", SENT: "info", ACCEPTED: "success", REFUSED: "debt", EXPIRED: "warning" };

function lineTotal(l) { return (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0); }

export default function Quotes() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: quotes, loading, refetch } = useFetch(() => quotesApi.list(), []);
  const { data: clients } = useFetch(() => clientsApi.list(), []);
  const { data: services } = useFetch(() => servicesApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [view, setView] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const openNew = () => { setForm({ status: "DRAFT", currency: "DZD", tvaEnabled: false, tvaRate: 19, lines: [{ label: "", quantity: 1, unitPrice: 0 }] }); setEditId(null); };
  const openEdit = (q) => { setForm({ ...q, lines: (q.lines || []).map((l) => ({ ...l })) }); setEditId(q.id); };

  const subtotal = form ? (form.lines || []).reduce((a, l) => a + lineTotal(l), 0) : 0;
  const tva = form && form.tvaEnabled ? Math.round(subtotal * (Number(form.tvaRate) || 0) / 100) : 0;

  const setLine = (i, patch) => setForm((f) => ({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { label: "", quantity: 1, unitPrice: 0 }] }));
  const rmLine = (i) => setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await quotesApi.update(editId, form);
      else await quotesApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const confirmDelete = async () => { await quotesApi.delete(deleteId); setDeleteId(null); refetch(); };

  const filtered = (quotes || []).filter((q) => !statusFilter || q.status === statusFilter);
  const count = (st) => (quotes || []).filter((q) => q.status === st).length;

  return (
    <div>
      <PageHeader title={t("quotes.title")} subtitle={t("quotes.subtitle")}
        action={can("quotes", "create") ? openNew : undefined} actionLabel={t("quotes.new")} />

      <div className="flex flex-wrap gap-2 mb-4">
        <button className={`chip ${!statusFilter ? "chip-active" : ""}`} onClick={() => setStatusFilter("")}>{t("common.all")} {quotes?.length || 0}</button>
        {STATUSES.map((s) => (
          <button key={s} className={`chip ${statusFilter === s ? "chip-active" : ""}`} onClick={() => setStatusFilter(s)}>{t(`quotes.status.${s}`)} {count(s)}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} message={t("quotes.empty")} cta={can("quotes", "create") ? t("quotes.new") : undefined} onCta={openNew} />
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-silver-500/16">
                <th className="label-caps text-left p-3">{t("quotes.number")}</th>
                <th className="label-caps text-left p-3">{t("common.client")}</th>
                <th className="label-caps text-left p-3">{t("common.date")}</th>
                <th className="label-caps text-left p-3">{t("quotes.validUntil")}</th>
                <th className="label-caps text-right p-3">{t("common.total")}</th>
                <th className="label-caps text-left p-3">{t("common.status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q) => (
                <tr key={q.id} className="border-b border-silver-500/8 hover:bg-silver-500/5">
                  <td className="p-3 text-text-primary font-mono text-xs">{q.reference}</td>
                  <td className="p-3 text-text-primary">{q.client ? `${q.client.firstName} ${q.client.lastName}` : "—"}</td>
                  <td className="p-3 text-text-muted">{formatDate(q.date)}</td>
                  <td className="p-3 text-text-muted">{formatDate(q.validUntil)}</td>
                  <td className="p-3 text-right font-bold text-text-primary">{formatAmount(q.total)}</td>
                  <td className="p-3"><Badge color={STATUS_COLOR[q.status]}>{t(`quotes.status.${q.status}`)}</Badge></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className="text-text-muted hover:text-text-primary mr-3" onClick={() => setView(q)}><Eye size={15} /></button>
                    {can("quotes", "edit") && <button className="text-text-muted hover:text-text-primary mr-3" onClick={() => openEdit(q)}><Pencil size={15} /></button>}
                    {can("quotes", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(q.id)}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Form */}
      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("quotes.new")} size="lg"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("common.client")} required>
                <select className="input" value={form.clientId || ""} onChange={(e) => setForm({ ...form, clientId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
                </select>
              </Field>
              <Field label={t("quotes.validUntil")}>
                <input type="date" className="input" value={toDateInput(form.validUntil)} onChange={(e) => setForm({ ...form, validUntil: e.target.value })} />
              </Field>
              <Field label={t("common.status")}>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{t(`quotes.status.${s}`)}</option>)}
                </select>
              </Field>
              <Field label={t("quotes.paymentMethod")}>
                <input className="input" value={form.paymentMethod || ""} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} />
              </Field>
            </div>

            {/* Lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="label-caps">{t("quotes.lines")}</p>
                <button className="btn-silver !py-1 !px-2 text-xs" onClick={addLine}><Plus size={13} /> {t("common.add")}</button>
              </div>
              <div className="space-y-2">
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input className="input col-span-6" placeholder={t("quotes.lineLabel")} value={l.label} onChange={(e) => setLine(i, { label: e.target.value })}
                      list="svc-list" />
                    <input type="number" className="input col-span-2" placeholder="Qté" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                    <input type="number" className="input col-span-3" placeholder={t("common.price")} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                    <button className="col-span-1 text-text-muted hover:text-crimson-300 flex justify-center" onClick={() => rmLine(i)}><Trash2 size={15} /></button>
                  </div>
                ))}
                <datalist id="svc-list">
                  {(services || []).map((s) => <option key={s.id} value={s.name} />)}
                </datalist>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Toggle checked={!!form.tvaEnabled} onChange={(v) => setForm({ ...form, tvaEnabled: v })} label={t("quotes.tva")} />
              {form.tvaEnabled && (
                <Field label={t("quotes.tvaRate")} className="w-24"><input type="number" className="input" value={form.tvaRate} onChange={(e) => setForm({ ...form, tvaRate: e.target.value })} /></Field>
              )}
            </div>

            <div className="glass-card p-4 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-text-muted">{t("quotes.subtotal")}</span><span className="text-text-primary">{formatAmount(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted">{t("quotes.tva")}</span><span className="text-text-primary">{formatAmount(tva)}</span></div>
              <div className="flex justify-between text-base pt-1 border-t border-silver-500/16"><span className="heading text-text-primary">{t("common.total")}</span><span className="font-black text-crimson-300">{formatAmount(subtotal + tva)}</span></div>
            </div>

            <Field label={t("common.description")}>
              <textarea className="input" rows={2} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>

      {/* View */}
      <Modal open={!!view} onClose={() => setView(null)} title={view?.reference} size="md">
        {view && (
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("common.client")}</span><span className="text-text-primary">{view.client ? `${view.client.firstName} ${view.client.lastName}` : "—"}</span></div>
            <div className="space-y-1">
              {(view.lines || []).map((l) => (
                <div key={l.id} className="flex justify-between text-sm border-b border-silver-500/12 py-1.5">
                  <span className="text-text-primary">{l.label} <span className="text-text-muted">× {l.quantity}</span></span>
                  <span className="text-text-primary">{formatAmount(l.lineTotal)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-base pt-2"><span className="heading text-text-primary">{t("common.total")}</span><span className="font-black text-crimson-300">{formatAmount(view.total)}</span></div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
