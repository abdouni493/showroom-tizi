import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Trash2, ShoppingCart, Phone, MapPin } from "lucide-react";
import { suppliersApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, Field, EmptyState, SkeletonGrid, AnimatedGrid } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ActionMenu from "../components/ActionMenu.jsx";
import { CarImage } from "../components/CarCard.jsx";
import { formatAmount, formatDate, initials } from "../utils/format.js";

const empty = { fullName: "", phone: "", address: "", nif: "", nis: "", article: "", rs: "" };

function SupplierForm({ value, onChange }) {
  const { t } = useTranslation();
  const set = (f) => (e) => onChange({ ...value, [f]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label={t("suppliers.companyName")} required><input className="input" value={value.fullName} onChange={set("fullName")} /></Field>
        <Field label={t("common.phone")} required><input className="input" value={value.phone} onChange={set("phone")} /></Field>
        <Field label={t("common.address")} className="sm:col-span-2"><input className="input" value={value.address} onChange={set("address")} /></Field>
      </div>
      <div className="flex items-center gap-3 my-2">
        <span className="label-caps !mb-0">{t("suppliers.fiscal")}</span>
        <div className="flex-1 h-px bg-crimson-500/20" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Field label="NIF"><input className="input" value={value.nif} onChange={set("nif")} /></Field>
        <Field label="NIS"><input className="input" value={value.nis} onChange={set("nis")} /></Field>
        <Field label="Article"><input className="input" value={value.article} onChange={set("article")} /></Field>
        <Field label="RS"><input className="input" value={value.rs} onChange={set("rs")} /></Field>
      </div>
    </div>
  );
}

export default function Suppliers() {
  const { t } = useTranslation();
  const can = useCan();
  const { data: suppliers, loading, refetch } = useFetch(() => suppliersApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [viewSupplier, setView] = useState(null);
  const [purchasesOf, setPurchasesOf] = useState(null);
  const [purchaseList, setPurchaseList] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm({ ...empty }); setEditId(null); };
  const openEdit = (s) => { setForm({ ...s }); setEditId(s.id); };

  const save = async () => {
    setSaving(true);
    try {
      if (editId) await suppliersApi.update(editId, form);
      else await suppliersApi.create(form);
      setForm(null);
      refetch();
    } catch (e) {
      alert(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const openPurchases = async (s) => {
    setPurchasesOf(s);
    const data = await suppliersApi.purchases(s.id);
    setPurchaseList(data);
  };

  const confirmDelete = async () => {
    await suppliersApi.delete(deleteId);
    setDeleteId(null);
    refetch();
  };

  return (
    <div>
      <PageHeader title={t("nav.suppliers")} action={can("suppliers", "create") ? openNew : undefined} actionLabel={t("suppliers.new")} />

      {loading ? (
        <SkeletonGrid />
      ) : suppliers?.length === 0 ? (
        <EmptyState icon={ShoppingCart} message={t("suppliers.none")} cta={can("suppliers", "create") ? t("suppliers.new") : undefined} onCta={openNew} />
      ) : (
        <AnimatedGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {suppliers.map((s) => (
            <Card key={s.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-[#8A7BA8]/20 text-[#AFA0C9] flex items-center justify-center font-black">{initials(s.fullName)}</div>
                  <div>
                    <p className="heading text-sm text-text-primary">{s.fullName}</p>
                    <p className="text-xs text-text-muted flex items-center gap-1"><Phone size={11} /> {s.phone}</p>
                  </div>
                </div>
                <ActionMenu items={[
                  { label: t("common.view"), icon: Eye, onClick: () => setView(s) },
                  can("suppliers", "edit") && { label: t("common.edit"), icon: Pencil, onClick: () => openEdit(s) },
                  { label: t("suppliers.purchases"), icon: ShoppingCart, onClick: () => openPurchases(s) },
                  can("suppliers", "delete") && { label: t("common.delete"), icon: Trash2, danger: true, onClick: () => setDeleteId(s.id) },
                ]} />
              </div>
              {s.address && <p className="text-xs text-text-muted flex items-center gap-1 mb-3"><MapPin size={11} /> {s.address}</p>}
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {s.nif && <Badge color="muted">NIF {s.nif}</Badge>}
                {s.nis && <Badge color="muted">NIS {s.nis}</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-silver-500/14 text-center">
                <div><p className="text-xs text-[#AFA0C9] font-black">{s.stats.totalPurchases}</p><p className="label-caps">{t("suppliers.purchases")}</p></div>
                <div><p className="text-xs text-[#5FBE9A] font-black">{formatAmount(s.stats.totalPaid)}</p><p className="label-caps">{t("common.paid")}</p></div>
                <div><p className="text-xs text-crimson-300 font-black">{formatAmount(s.stats.totalRest)}</p><p className="label-caps">{t("common.rest")}</p></div>
              </div>
            </Card>
          ))}
        </AnimatedGrid>
      )}

      {/* Form modal */}
      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? t("suppliers.editTitle") : t("suppliers.newTitle")}
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && <SupplierForm value={form} onChange={setForm} />}
      </Modal>

      {/* View modal */}
      <Modal open={!!viewSupplier} onClose={() => setView(null)} title={viewSupplier?.fullName || ""}>
        {viewSupplier && (
          <div className="space-y-2">
            {Object.entries({ [t("common.phone")]: viewSupplier.phone, [t("common.address")]: viewSupplier.address, NIF: viewSupplier.nif, NIS: viewSupplier.nis, Article: viewSupplier.article, RS: viewSupplier.rs }).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-silver-500/12 py-1.5"><span className="text-text-muted">{k}</span><span className="text-text-primary">{v || "—"}</span></div>
            ))}
          </div>
        )}
      </Modal>

      {/* Purchases modal */}
      <Modal open={!!purchasesOf} onClose={() => setPurchasesOf(null)} title={`${t("suppliers.purchases")} — ${purchasesOf?.fullName || ""}`} size="lg">
        {purchasesOf && (
          <>
            <div className="grid grid-cols-3 gap-3 mb-4">
              <Card className="p-3 text-center"><p className="text-lg font-black text-[#AFA0C9]">{formatAmount(purchasesOf.stats.totalAmount)}</p><p className="label-caps">{t("suppliers.totalPurchases")}</p></Card>
              <Card className="p-3 text-center"><p className="text-lg font-black text-[#5FBE9A]">{formatAmount(purchasesOf.stats.totalPaid)}</p><p className="label-caps">{t("suppliers.totalPaid")}</p></Card>
              <Card className="p-3 text-center"><p className="text-lg font-black text-crimson-300">{formatAmount(purchasesOf.stats.totalRest)}</p><p className="label-caps">{t("suppliers.totalRest")}</p></Card>
            </div>
            <div className="space-y-2">
              {purchaseList.map((p) => (
                <div key={p.id} className="flex items-center gap-3 glass-card p-2">
                  <div className="w-14 h-10 rounded overflow-hidden shrink-0"><CarImage images={p.car?.images} heightClass="h-10" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-text-primary truncate">{p.car?.brand} {p.car?.model}</p><p className="text-xs text-text-muted">{formatDate(p.date)}</p></div>
                  <div className="text-right text-sm"><p className="text-text-primary">{formatAmount(p.purchasePrice)}</p>{p.amountRest > 0 && <p className="text-xs text-crimson-300">{t("common.rest")} {formatAmount(p.amountRest)}</p>}</div>
                </div>
              ))}
              {purchaseList.length === 0 && <p className="text-text-muted text-sm text-center py-4">{t("suppliers.noPurchase")}</p>}
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
