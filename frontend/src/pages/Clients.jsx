import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Eye, Pencil, Trash2, History, Phone, Users, Mail } from "lucide-react";
import { clientsApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Badge, Modal, ConfirmModal, EmptyState, SkeletonGrid, AnimatedGrid } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import ActionMenu from "../components/ActionMenu.jsx";
import ClientForm, { validateClient } from "../components/ClientForm.jsx";
import { CarImage } from "../components/CarCard.jsx";
import { formatAmount, formatDate, initials } from "../utils/format.js";

export default function Clients() {
  const { t } = useTranslation();
  const can = useCan();
  const { data: clients, loading, refetch } = useFetch(() => clientsApi.list(), []);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [errors, setErrors] = useState({});
  const [view, setView] = useState(null);
  const [historyOf, setHistoryOf] = useState(null);
  const [history, setHistory] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [saving, setSaving] = useState(false);

  const openNew = () => { setForm({}); setEditId(null); setErrors({}); };
  const openEdit = (c) => { setForm({ ...c }); setEditId(c.id); setErrors({}); };

  const save = async () => {
    const errs = validateClient(form);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    try {
      if (editId) await clientsApi.update(editId, form);
      else await clientsApi.create(form);
      setForm(null);
      refetch();
    } catch (e) {
      alert(e.message || "Erreur");
    } finally {
      setSaving(false);
    }
  };

  const openHistory = async (c) => {
    setHistoryOf(c);
    setHistory(null);
    const data = await clientsApi.history(c.id);
    setHistory(data);
  };

  const confirmDelete = async () => {
    await clientsApi.delete(deleteId);
    setDeleteId(null);
    refetch();
  };

  return (
    <div>
      <PageHeader title="Clients" action={can("clients", "create") ? openNew : undefined} actionLabel="Nouveau Client" />

      {loading ? (
        <SkeletonGrid />
      ) : clients?.length === 0 ? (
        <EmptyState icon={Users} message="Aucun client" cta={can("clients", "create") ? "Nouveau Client" : undefined} onCta={openNew} />
      ) : (
        <AnimatedGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {clients.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {c.photo ? (
                    <img src={c.photo} className="w-11 h-11 rounded-full object-cover" alt="" />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-black">{initials(`${c.firstName} ${c.lastName}`)}</div>
                  )}
                  <div>
                    <p className="heading text-sm text-text-primary">{c.firstName} {c.lastName}</p>
                    <p className="text-xs text-text-muted flex items-center gap-1"><Phone size={11} /> {c.phonePrimary}</p>
                  </div>
                </div>
                <ActionMenu items={[
                  { label: "Voir", icon: Eye, onClick: () => setView(c) },
                  can("clients", "edit") && { label: "Modifier", icon: Pencil, onClick: () => openEdit(c) },
                  { label: "Historique", icon: History, onClick: () => openHistory(c) },
                  can("clients", "delete") && { label: "Supprimer", icon: Trash2, danger: true, onClick: () => setDeleteId(c.id) },
                ]} />
              </div>
              <div className="flex gap-1.5 mb-3 flex-wrap">
                {c.email && <Badge color="muted"><Mail size={10} /> {c.email}</Badge>}
                {c.docType && <Badge color="info">{c.docType}</Badge>}
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-red-600/15 text-center">
                <div><p className="text-xs text-blue-400 font-black">{c.stats.totalPurchases}</p><p className="label-caps">Achats</p></div>
                <div><p className="text-xs text-emerald-400 font-black">{c.stats.totalSales}</p><p className="label-caps">Ventes</p></div>
                <div><p className="text-xs text-rose-400 font-black">{formatAmount(c.stats.saleRest)}</p><p className="label-caps">Solde dû</p></div>
              </div>
            </Card>
          ))}
        </AnimatedGrid>
      )}

      {/* Form */}
      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? "Modifier le client" : "Nouveau client"} size="lg"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>Annuler</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : "Enregistrer"}</button></>}>
        {form && <ClientForm value={form} onChange={setForm} errors={errors} />}
      </Modal>

      {/* View */}
      <Modal open={!!view} onClose={() => setView(null)} title={view ? `${view.firstName} ${view.lastName}` : ""}>
        {view && (
          <div className="space-y-1.5">
            {view.photo && <img src={view.photo} className="w-24 h-24 rounded-xl object-cover mb-3" alt="" />}
            {Object.entries({
              "Téléphone": view.phonePrimary, "Mobile 2": view.phoneSecondary, Email: view.email, Adresse: view.address,
              Profession: view.profession, "Lieu de naissance": view.birthPlace, "Date de naissance": view.birthDate && formatDate(view.birthDate),
              "Type doc": view.docType, "N° doc": view.docNumber, "Délivrance": view.docDeliveryDate && formatDate(view.docDeliveryDate),
              "Expiration": view.docExpiry && formatDate(view.docExpiry), NIF: view.nif, RC: view.rc,
            }).map(([k, v]) => (
              <div key={k} className="flex justify-between text-sm border-b border-red-600/10 py-1.5"><span className="text-text-muted">{k}</span><span className="text-text-primary text-right">{v || "—"}</span></div>
            ))}
          </div>
        )}
      </Modal>

      {/* History */}
      <Modal open={!!historyOf} onClose={() => setHistoryOf(null)} title={`Historique — ${historyOf?.firstName || ""} ${historyOf?.lastName || ""}`} size="lg">
        {!history ? (
          <p className="text-text-muted text-center py-6">Chargement...</p>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Card className="p-3 text-center"><p className="text-base font-black text-blue-400">{formatAmount(history.stats.totalPurchaseAmount)}</p><p className="label-caps">Achats</p></Card>
              <Card className="p-3 text-center"><p className="text-base font-black text-emerald-400">{formatAmount(history.stats.totalSaleAmount)}</p><p className="label-caps">Ventes</p></Card>
              <Card className="p-3 text-center"><p className="text-base font-black text-emerald-400">{formatAmount(history.stats.totalPaid)}</p><p className="label-caps">Payé</p></Card>
              <Card className="p-3 text-center"><p className="text-base font-black text-rose-400">{formatAmount(history.stats.totalRest)}</p><p className="label-caps">Reste dû</p></Card>
            </div>
            <h4 className="heading text-xs text-text-primary mb-2">Ventes</h4>
            <div className="space-y-2 mb-4">
              {history.sales.length === 0 && <p className="text-text-muted text-sm">Aucune vente</p>}
              {history.sales.map((s) => (
                <div key={s.id} className="flex items-center gap-3 glass-card p-2">
                  <div className="w-14 h-10 rounded overflow-hidden shrink-0"><CarImage images={s.car?.images} heightClass="h-10" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-text-primary truncate">{s.car?.brand} {s.car?.model}</p><p className="text-xs text-text-muted">{formatDate(s.date)}</p></div>
                  <div className="text-right text-sm"><p className="text-text-primary">{formatAmount(s.totalAfterReduction)}</p>{s.amountRest > 0 && <p className="text-xs text-rose-400">Reste {formatAmount(s.amountRest)}</p>}</div>
                </div>
              ))}
            </div>
            <h4 className="heading text-xs text-text-primary mb-2">Achats (véhicules vendus au showroom)</h4>
            <div className="space-y-2">
              {history.purchases.length === 0 && <p className="text-text-muted text-sm">Aucun achat</p>}
              {history.purchases.map((p) => (
                <div key={p.id} className="flex items-center gap-3 glass-card p-2">
                  <div className="w-14 h-10 rounded overflow-hidden shrink-0"><CarImage images={p.car?.images} heightClass="h-10" /></div>
                  <div className="flex-1 min-w-0"><p className="text-sm text-text-primary truncate">{p.car?.brand} {p.car?.model}</p><p className="text-xs text-text-muted">{formatDate(p.date)}</p></div>
                  <p className="text-sm text-text-primary">{formatAmount(p.purchasePrice)}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
