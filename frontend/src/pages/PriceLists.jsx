import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Tags, Trash2, Pencil, Plus, Link2, Copy } from "lucide-react";
import { priceListsApi, carsApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, Toggle, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount } from "../utils/format.js";

export default function PriceLists() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: lists, loading, refetch } = useFetch(() => priceListsApi.list(), []);
  const { data: cars } = useFetch(() => carsApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [manage, setManage] = useState(null);
  const [item, setItem] = useState({ carId: "", label: "", price: 0 });
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm({ active: true }); setEditId(null); };
  const openEdit = (l) => { setForm({ ...l }); setEditId(l.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await priceListsApi.update(editId, form);
      else await priceListsApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const confirmDelete = async () => { await priceListsApi.delete(deleteId); setDeleteId(null); setManage(null); refetch(); };
  const addItem = async () => {
    if (!item.carId && !item.label) return;
    const car = (cars || []).find((c) => c.id === Number(item.carId));
    await priceListsApi.addItem(manage.id, { carId: item.carId ? Number(item.carId) : null, label: item.label || (car ? `${car.brand} ${car.model}` : ""), price: item.price });
    setItem({ carId: "", label: "", price: 0 });
    const fresh = await priceListsApi.list();
    refetch();
    setManage(fresh.find((l) => l.id === manage.id) || manage);
  };
  const removeItem = async (id) => {
    await priceListsApi.removeItem(id);
    const fresh = await priceListsApi.list();
    refetch();
    setManage(fresh.find((l) => l.id === manage.id) || manage);
  };
  const copyLink = (l) => {
    const url = `${window.location.origin}/website?grille=${l.shareToken}`;
    navigator.clipboard?.writeText(url);
    toast(t("priceLists.linkCopied"));
  };

  return (
    <div>
      <PageHeader title={t("priceLists.title")} subtitle={t("priceLists.subtitle")}
        action={can("priceLists", "create") ? openNew : undefined} actionLabel={t("priceLists.new")} />

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : (lists || []).length === 0 ? (
        <EmptyState icon={Tags} message={t("priceLists.empty")} cta={can("priceLists", "create") ? t("priceLists.new") : undefined} onCta={openNew} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {(lists || []).map((l) => (
            <Card key={l.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="heading text-sm text-text-primary">{l.name}</p>
                  {l.description && <p className="text-xs text-text-muted line-clamp-1">{l.description}</p>}
                </div>
                {l.active ? <Badge color="success">{t("services.active")}</Badge> : <Badge color="muted">{t("services.inactive")}</Badge>}
              </div>
              <p className="text-xs text-text-muted mt-3">{(l.items || []).length} {t("priceLists.items")}</p>
              <div className="flex items-center gap-3 mt-3 pt-3 border-t border-silver-500/12">
                <button className="btn-silver !py-1 !px-2 text-xs flex-1" onClick={() => setManage(l)}><Plus size={13} /> {t("priceLists.manage")}</button>
                <button className="text-text-muted hover:text-info" title={t("priceLists.copyLink")} onClick={() => copyLink(l)}><Link2 size={15} /></button>
                {can("priceLists", "edit") && <button className="text-text-muted hover:text-text-primary" onClick={() => openEdit(l)}><Pencil size={15} /></button>}
                {can("priceLists", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(l.id)}><Trash2 size={15} /></button>}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* List form */}
      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("priceLists.new")} size="md"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label={t("common.name")} required><input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Public / Revendeur / VIP" /></Field>
            <Field label={t("priceLists.slug")}><input className="input" value={form.slug || ""} onChange={(e) => setForm({ ...form, slug: e.target.value })} /></Field>
            <Field label={t("common.description")}><textarea className="input" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Toggle checked={form.active !== false} onChange={(v) => setForm({ ...form, active: v })} label={t("services.active")} />
          </div>
        )}
      </Modal>

      {/* Manage items */}
      <Modal open={!!manage} onClose={() => setManage(null)} title={manage?.name} size="md">
        {manage && (
          <div className="space-y-4">
            <div className="space-y-2">
              {(manage.items || []).length === 0 && <p className="text-text-muted text-sm">{t("priceLists.noItems")}</p>}
              {(manage.items || []).map((it) => (
                <div key={it.id} className="flex items-center justify-between glass-card p-2">
                  <span className="text-sm text-text-primary">{it.label || (it.car ? `${it.car.brand} ${it.car.model}` : "—")}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-crimson-300">{formatAmount(it.price)}</span>
                    {can("priceLists", "edit") && <button className="text-text-muted hover:text-crimson-300" onClick={() => removeItem(it.id)}><Trash2 size={14} /></button>}
                  </div>
                </div>
              ))}
            </div>
            {can("priceLists", "edit") && (
              <div className="grid grid-cols-12 gap-2 items-end pt-3 border-t border-silver-500/12">
                <div className="col-span-6">
                  <select className="input" value={item.carId} onChange={(e) => setItem({ ...item, carId: e.target.value })}>
                    <option value="">{t("priceLists.customLabel")}</option>
                    {(cars || []).map((c) => <option key={c.id} value={c.id}>{c.brand} {c.model}</option>)}
                  </select>
                  {!item.carId && <input className="input mt-2" placeholder={t("priceLists.label")} value={item.label} onChange={(e) => setItem({ ...item, label: e.target.value })} />}
                </div>
                <input type="number" className="input col-span-4" placeholder={t("common.price")} value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} />
                <button className="btn-primary col-span-2" onClick={addItem}><Plus size={15} /></button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
