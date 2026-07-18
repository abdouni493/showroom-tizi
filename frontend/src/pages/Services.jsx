import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Wrench, Pencil, Trash2, Plus, FolderPlus } from "lucide-react";
import { servicesApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, Toggle, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount } from "../utils/format.js";

export default function Services() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const { data: services, loading, refetch } = useFetch(() => servicesApi.list(), []);
  const { data: categories, refetch: refetchCats } = useFetch(() => servicesApi.listCategories(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [catModal, setCatModal] = useState(false);
  const [catName, setCatName] = useState("");
  const [saving, setSaving] = useState(false);
  const [catFilter, setCatFilter] = useState("");
  const [showInactive, setShowInactive] = useState(false);

  const openNew = () => { setForm({ active: true, price: 0 }); setEditId(null); };
  const openEdit = (s) => { setForm({ ...s, categoryId: s.categoryId }); setEditId(s.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await servicesApi.update(editId, form);
      else await servicesApi.create(form);
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };
  const confirmDelete = async () => { await servicesApi.delete(deleteId); setDeleteId(null); refetch(); };
  const addCat = async () => {
    if (!catName.trim()) return;
    try { await servicesApi.createCategory(catName.trim()); setCatName(""); setCatModal(false); refetchCats(); toast(t("common.saved")); }
    catch (e) { toast(e.message || t("common.error"), "error"); }
  };

  const filtered = (services || []).filter((s) =>
    (!catFilter || String(s.categoryId) === catFilter) && (showInactive || s.active));

  return (
    <div>
      <PageHeader title={t("services.title")} subtitle={t("services.subtitle")}>
        {can("services", "create") && <button className="btn-silver" onClick={() => setCatModal(true)}><FolderPlus size={16} /> {t("services.newCategory")}</button>}
        {can("services", "create") && <button className="btn-primary" onClick={openNew}><Plus size={16} /> {t("services.new")}</button>}
      </PageHeader>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <select className="input max-w-[220px]" value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
          <option value="">{t("services.allCategories")}</option>
          {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <Toggle checked={showInactive} onChange={setShowInactive} label={t("services.includeInactive")} />
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wrench} message={t("services.empty")} cta={can("services", "create") ? t("services.new") : undefined} onCta={openNew} />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="heading text-sm text-text-primary">{s.name}</p>
                  {s.category && <p className="text-xs text-text-muted">{s.category.name}</p>}
                </div>
                <span className="font-black text-crimson-300 text-sm whitespace-nowrap">{formatAmount(s.price)}</span>
              </div>
              {s.description && <p className="text-xs text-text-muted mt-2 line-clamp-2">{s.description}</p>}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-silver-500/12">
                {s.active ? <Badge color="success">{t("services.active")}</Badge> : <Badge color="muted">{t("services.inactive")}</Badge>}
                <div className="flex gap-3">
                  {can("services", "edit") && <button className="text-text-muted hover:text-text-primary" onClick={() => openEdit(s)}><Pencil size={15} /></button>}
                  {can("services", "delete") && <button className="text-text-muted hover:text-crimson-300" onClick={() => setDeleteId(s.id)}><Trash2 size={15} /></button>}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("common.edit") : t("services.new")} size="md"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label={t("common.name")} required>
              <input className="input" value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label={t("services.category")}>
                <select className="input" value={form.categoryId || ""} onChange={(e) => setForm({ ...form, categoryId: e.target.value ? Number(e.target.value) : null })}>
                  <option value="">—</option>
                  {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </Field>
              <Field label={t("common.price")}>
                <input type="number" className="input" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              </Field>
            </div>
            <Field label={t("common.description")}>
              <textarea className="input" rows={2} value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <Toggle checked={form.active !== false} onChange={(v) => setForm({ ...form, active: v })} label={t("services.active")} />
          </div>
        )}
      </Modal>

      <Modal open={catModal} onClose={() => setCatModal(false)} title={t("services.newCategory")} size="sm"
        footer={<><button className="btn-ghost" onClick={() => setCatModal(false)}>{t("common.cancel")}</button><button className="btn-primary" onClick={addCat}>{t("common.save")}</button></>}>
        <Field label={t("common.name")} required>
          <input className="input" value={catName} onChange={(e) => setCatName(e.target.value)} />
        </Field>
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
