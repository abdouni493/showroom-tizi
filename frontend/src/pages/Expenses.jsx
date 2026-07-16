import { useState } from "react";
import { Pencil, Trash2, Car, Building2 } from "lucide-react";
import { expensesApi, carsApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Modal, ConfirmModal, Field, EmptyState, SkeletonGrid, AnimatedGrid } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import SearchSelect from "../components/SearchSelect.jsx";
import { CarImage } from "../components/CarCard.jsx";
import { formatAmount, formatDate, toDateInput } from "../utils/format.js";

export default function Expenses() {
  const can = useCan();
  const [tab, setTab] = useState("CAR");
  const { data: expenses, loading, refetch } = useFetch(() => expensesApi.list(tab), [tab]);
  const [form, setForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [selectedCar, setSelectedCar] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const total = (expenses || []).reduce((a, e) => a + e.amount, 0);

  const openNew = () => { setForm({ name: "", description: "", amount: "", date: toDateInput(new Date()) }); setEditId(null); setSelectedCar(null); };
  const openEdit = (e) => { setForm({ ...e, date: toDateInput(e.date) }); setEditId(e.id); setSelectedCar(e.car || null); };

  const save = async () => {
    if (!form.name || !form.amount) { alert("Nom et montant requis"); return; }
    if (tab === "CAR" && !selectedCar && !editId) { alert("Sélectionnez un véhicule"); return; }
    const payload = { ...form, type: tab, amount: Number(form.amount), carId: tab === "CAR" ? (selectedCar?.id || form.carId) : null };
    if (editId) await expensesApi.update(editId, payload);
    else await expensesApi.create(payload);
    setForm(null); refetch();
  };

  const confirmDelete = async () => { await expensesApi.delete(deleteId); setDeleteId(null); refetch(); };

  return (
    <div>
      <PageHeader title="Dépenses" action={can("expenses", "create") ? openNew : undefined} actionLabel={tab === "CAR" ? "Nouvelle Dépense Véhicule" : "Nouvelle Dépense"} />

      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex gap-2">
          <button className={`chip ${tab === "CAR" ? "chip-active" : ""}`} onClick={() => setTab("CAR")}><Car size={13} /> Véhicules</button>
          <button className={`chip ${tab === "SHOWROOM" ? "chip-active" : ""}`} onClick={() => setTab("SHOWROOM")}><Building2 size={13} /> Showroom</button>
        </div>
        <Card className="px-4 py-2"><span className="label-caps !mb-0">Total : </span><span className="text-amber-400 font-black">{formatAmount(total)}</span></Card>
      </div>

      {loading ? <SkeletonGrid /> : expenses?.length === 0 ? (
        <EmptyState icon={tab === "CAR" ? Car : Building2} message="Aucune dépense" cta={can("expenses", "create") ? "Ajouter" : undefined} onCta={openNew} />
      ) : (
        <AnimatedGrid className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {expenses.map((e) => (
            <Card key={e.id} className="p-4 flex gap-3">
              {tab === "CAR" && <div className="w-16 h-12 rounded-lg overflow-hidden shrink-0"><CarImage images={e.car?.images} heightClass="h-12" /></div>}
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <p className="heading text-sm text-text-primary truncate">{e.name}</p>
                    {tab === "CAR" && e.car && <p className="text-xs text-text-muted">{e.car.brand} {e.car.model} · {e.car.plate}</p>}
                    {e.description && <p className="text-xs text-text-muted truncate">{e.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {can("expenses", "edit") && <button className="text-text-muted hover:text-text-primary" onClick={() => openEdit(e)}><Pencil size={15} /></button>}
                    {can("expenses", "delete") && <button className="text-text-muted hover:text-rose-400" onClick={() => setDeleteId(e.id)}><Trash2 size={15} /></button>}
                  </div>
                </div>
                <div className="flex justify-between items-end mt-2">
                  <span className="text-lg font-black text-amber-400">{formatAmount(e.amount)}</span>
                  <span className="text-xs text-text-muted">{formatDate(e.date)}</span>
                </div>
              </div>
            </Card>
          ))}
        </AnimatedGrid>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={editId ? "Modifier la dépense" : "Nouvelle dépense"} size="sm"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>Annuler</button><button className="btn-primary" onClick={save}>Enregistrer</button></>}>
        {form && (
          <div className="space-y-4">
            {tab === "CAR" && !editId && (
              selectedCar ? (
                <Card className="p-2 flex items-center gap-2">
                  <div className="w-12 h-9 rounded overflow-hidden shrink-0"><CarImage images={selectedCar.images} heightClass="h-9" /></div>
                  <div className="flex-1"><p className="text-sm text-text-primary">{selectedCar.brand} {selectedCar.model}</p><p className="text-xs text-text-muted">{selectedCar.plate}</p></div>
                  <button className="btn-ghost text-xs py-1" onClick={() => setSelectedCar(null)}>Changer</button>
                </Card>
              ) : (
                <div><p className="label-caps">Véhicule</p>
                  <SearchSelect fetcher={(q) => carsApi.list({ search: q })} placeholder="Rechercher un véhicule..." onSelect={setSelectedCar}
                    renderItem={(c) => <div><p className="text-sm text-text-primary">{c.brand} {c.model}</p><p className="text-xs text-text-muted">{c.plate}</p></div>} />
                </div>
              )
            )}
            <Field label="Nom de la dépense" required><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Description"><input className="input" value={form.description || ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Montant" required><input className="input" type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></Field>
              <Field label="Date"><input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></Field>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmModal open={!!deleteId} onClose={() => setDeleteId(null)} onConfirm={confirmDelete} />
    </div>
  );
}
