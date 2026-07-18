import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ReceiptText, Trash2, Pencil, Eye, Plus, Banknote } from "lucide-react";
import { invoicesApi, clientsApi, servicesApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, Toggle, StatCard, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount, formatDate, toDateInput } from "../utils/format.js";

const STATUSES = ["DRAFT", "SENT", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"];
const STATUS_COLOR = { DRAFT: "muted", SENT: "info", PARTIAL: "warning", PAID: "success", OVERDUE: "debt", CANCELLED: "muted" };
const lineTotal = (l) => (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0);

export default function Invoices() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: invoices, loading, refetch } = useFetch(() => invoicesApi.list(), []);
  const { data: clients } = useFetch(() => clientsApi.list(), []);
  const { data: services } = useFetch(() => servicesApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [view, setView] = useState(null);
  const [payFor, setPayFor] = useState(null);
  const [payAmount, setPayAmount] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");

  const openNew = () => { setForm({ docType: "INVOICE", status: "DRAFT", currency: "DZD", tvaEnabled: false, tvaRate: 19, lines: [{ label: "", quantity: 1, unitPrice: 0 }] }); setEditId(null); };
  const openEdit = (inv) => { setForm({ ...inv, lines: (inv.lines || []).map((l) => ({ ...l })) }); setEditId(inv.id); };

  const subtotal = form ? (form.lines || []).reduce((a, l) => a + lineTotal(l), 0) : 0;
  const tva = form && form.tvaEnabled ? Math.round(subtotal * (Number(form.tvaRate) || 0) / 100) : 0;
  const setLine = (i, patch) => setForm((f) => ({ ...f, lines: f.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) }));
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { label: "", quantity: 1, unitPrice: 0 }] }));
  const rmLine = (i) => setForm((f) => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await invoicesApi.update(editId, form);
      else await invoicesApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const savePayment = async () => {
    try { await invoicesApi.addPayment(payFor.id, { amount: payAmount }); setPayFor(null); setPayAmount(""); refetch(); toast(t("common.saved")); }
    catch (e) { toast(e.message || t("common.error"), "error"); }
  };
  const confirmDelete = async () => { await invoicesApi.delete(deleteId); setDeleteId(null); refetch(); };

  const filtered = (invoices || []).filter((i) => !statusFilter || i.status === statusFilter);
  const totalInvoiced = (invoices || []).reduce((a, i) => a + (i.total || 0), 0);
  const totalCollected = (invoices || []).reduce((a, i) => a + ((i.total || 0) - (i.amountRest || 0)), 0);
  const amountDue = (invoices || []).reduce((a, i) => a + (i.amountRest > 0 ? i.amountRest : 0), 0);
  const count = (st) => (invoices || []).filter((i) => i.status === st).length;

  return (
    <div>
      <PageHeader title={t("invoices.title")} subtitle={t("invoices.subtitle")}
        action={can("invoices", "create") ? openNew : undefined} actionLabel={t("invoices.new")} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <StatCard label={t("invoices.totalInvoiced")} value={formatAmount(totalInvoiced)} icon={ReceiptText} color="info" index={0} />
        <StatCard label={t("invoices.totalCollected")} value={formatAmount(totalCollected)} icon={Banknote} color="success" index={1} />
        <StatCard label={t("invoices.amountDue")} value={formatAmount(amountDue)} icon={Banknote} color="debt" index={2} />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button className={`chip ${!statusFilter ? "chip-active" : ""}`} onClick={() => setStatusFilter("")}>{t("common.all")} {invoices?.length || 0}</button>
        {STATUSES.map((s) => (
          <button key={s} className={`chip ${statusFilter === s ? "chip-active" : ""}`} onClick={() => setStatusFilter(s)}>{t(`invoices.status.${s}`)} {count(s)}</button>
        ))}
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={ReceiptText} message={t("invoices.empty")} cta={can("invoices", "create") ? t("invoices.new") : undefined} onCta={openNew} />
      ) : (
        <Card className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-silver-500/16">
                <th className="label-caps text-left p-3">{t("invoices.number")}</th>
                <th className="label-caps text-left p-3">{t("common.client")}</th>
                <th className="label-caps text-left p-3">{t("common.type")}</th>
                <th className="label-caps text-right p-3">{t("common.total")}</th>
                <th className="label-caps text-right p-3">{t("common.rest")}</th>
                <th className="label-caps text-left p-3">{t("common.status")}</th>
                <th className="p-3"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr key={inv.id} className="border-b border-silver-500/8 hover:bg-silver-500/5">
                  <td className="p-3 text-text-primary font-mono text-xs">{inv.reference}</td>
                  <td className="p-3 text-text-primary">{inv.client ? `${inv.client.firstName} ${inv.client.lastName}` : "—"}</td>
                  <td className="p-3"><Badge color={inv.docType === "CREDIT_NOTE" ? "warning" : "muted"}>{t(`invoices.docType.${inv.docType}`)}</Badge></td>
                  <td className="p-3 text-right font-bold text-text-primary">{formatAmount(inv.total)}</td>
                  <td className="p-3 text-right text-crimson-300">{formatAmount(inv.amountRest)}</td>
                  <td className="p-3"><Badge color={STATUS_COLOR[inv.status]}>{t(`invoices.status.${inv.status}`)}</Badge></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button className="text-text-muted hover:text-text-primary mr-3" onClick={() => setView(inv)}><Eye size={15} /></button>
                    {can("invoices", "edit") && inv.amountRest > 0 && <button className="text-text-muted hover:text-[#5FBE9A] mr-3" title={t("invoices.recordPayment")} onClick={() => { setPayFor(inv); setPayAmount(inv.amountRest); }}><Banknote size={15} /></button>}
                    {can("invoices", "edit") && <button className="text-text-muted hover:text-text-primary mr-3" onClick={() => openEdit(inv)}><Pencil size={15} /></button>}
                    {can("invoices", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(inv.id)}><Trash2 size={15} /></button>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

      {/* Form */}
      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("invoices.new")} size="lg"
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
              <Field label={t("common.type")}>
                <select className="input" value={form.docType} onChange={(e) => setForm({ ...form, docType: e.target.value })}>
                  <option value="INVOICE">{t("invoices.docType.INVOICE")}</option>
                  <option value="CREDIT_NOTE">{t("invoices.docType.CREDIT_NOTE")}</option>
                </select>
              </Field>
              <Field label={t("invoices.dueDate")}>
                <input type="date" className="input" value={toDateInput(form.dueDate)} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} />
              </Field>
              <Field label={t("common.status")}>
                <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s} value={s}>{t(`invoices.status.${s}`)}</option>)}
                </select>
              </Field>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="label-caps">{t("quotes.lines")}</p>
                <button className="btn-silver !py-1 !px-2 text-xs" onClick={addLine}><Plus size={13} /> {t("common.add")}</button>
              </div>
              <div className="space-y-2">
                {form.lines.map((l, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input className="input col-span-6" placeholder={t("quotes.lineLabel")} value={l.label} onChange={(e) => setLine(i, { label: e.target.value })} list="svc-list-inv" />
                    <input type="number" className="input col-span-2" placeholder="Qté" value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                    <input type="number" className="input col-span-3" placeholder={t("common.price")} value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                    <button className="col-span-1 text-text-muted hover:text-crimson-300 flex justify-center" onClick={() => rmLine(i)}><Trash2 size={15} /></button>
                  </div>
                ))}
                <datalist id="svc-list-inv">
                  {(services || []).map((s) => <option key={s.id} value={s.name} />)}
                </datalist>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Toggle checked={!!form.tvaEnabled} onChange={(v) => setForm({ ...form, tvaEnabled: v })} label={t("quotes.tva")} />
              {form.tvaEnabled && <Field label={t("quotes.tvaRate")} className="w-24"><input type="number" className="input" value={form.tvaRate} onChange={(e) => setForm({ ...form, tvaRate: e.target.value })} /></Field>}
            </div>

            <div className="glass-card p-4 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-text-muted">{t("quotes.subtotal")}</span><span className="text-text-primary">{formatAmount(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-muted">{t("quotes.tva")}</span><span className="text-text-primary">{formatAmount(tva)}</span></div>
              <div className="flex justify-between text-base pt-1 border-t border-silver-500/16"><span className="heading text-text-primary">{t("common.total")}</span><span className="font-black text-crimson-300">{formatAmount(subtotal + tva)}</span></div>
            </div>
          </div>
        )}
      </Modal>

      {/* Payment */}
      <Modal open={!!payFor} onClose={() => setPayFor(null)} title={t("invoices.recordPayment")} size="sm"
        footer={<><button className="btn-ghost" onClick={() => setPayFor(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={savePayment}>{t("common.save")}</button></>}>
        {payFor && (
          <div className="space-y-3">
            <p className="text-sm text-text-muted">{payFor.reference} · {t("common.rest")} <span className="text-crimson-300 font-bold">{formatAmount(payFor.amountRest)}</span></p>
            <Field label={t("common.amount")}><input type="number" className="input" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} /></Field>
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
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("common.total")}</span><span className="text-text-primary">{formatAmount(view.total)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-muted">{t("common.rest")}</span><span className="text-crimson-300 font-bold">{formatAmount(view.amountRest)}</span></div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
