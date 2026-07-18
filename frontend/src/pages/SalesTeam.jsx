import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Trophy, Target, Pencil, Wallet, TrendingUp } from "lucide-react";
import { salesTeamApi } from "../lib/api.js";
import { useFetch } from "../hooks/useApi.js";
import { useCan } from "../lib/permissions.js";
import { Card, Modal, Field, StatCard, EmptyState, useToast } from "../components/ui.jsx";
import PageHeader from "../components/PageHeader.jsx";
import { formatAmount, initials } from "../utils/format.js";

const currentPeriod = () => new Date().toISOString().slice(0, 7);

export default function SalesTeam() {
  const { t } = useTranslation();
  const can = useCan();
  const toast = useToast();
  const [period, setPeriod] = useState(currentPeriod());
  const { data: team, loading, refetch } = useFetch(() => salesTeamApi.list({ period }), [period]);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const openEdit = (w) => setForm({ id: w.id, fullName: w.fullName, commissionRate: w.commissionRate, monthlyTarget: w.monthlyTarget });
  const save = async () => {
    setSaving(true);
    try {
      await salesTeamApi.updateTargets(form.id, { commissionRate: form.commissionRate, monthlyTarget: form.monthlyTarget });
      setForm(null); refetch(); toast(t("common.saved"));
    } catch (e) { toast(e.message || t("common.error"), "error"); } finally { setSaving(false); }
  };

  const ranked = [...(team || [])].sort((a, b) => (b.commissionTotal || 0) - (a.commissionTotal || 0));
  const teamTotal = ranked.reduce((a, w) => a + (w.commissionTotal || 0), 0);
  const teamDue = ranked.reduce((a, w) => a + (w.commissionDue || 0), 0);
  const activeCount = ranked.filter((w) => (w.salesCount || 0) > 0).length;

  return (
    <div>
      <PageHeader title={t("salesTeam.title")} subtitle={t("salesTeam.subtitle")}>
        <input type="month" className="input max-w-[180px]" value={period} onChange={(e) => setPeriod(e.target.value)} />
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label={t("salesTeam.teamCommission")} value={formatAmount(teamTotal)} icon={TrendingUp} color="info" index={0} />
        <StatCard label={t("salesTeam.commissionsDue")} value={formatAmount(teamDue)} icon={Wallet} color="warning" index={1} />
        <StatCard label={t("salesTeam.activeReps")} value={`${activeCount} / ${ranked.length}`} icon={Trophy} color="success" index={2} />
        <StatCard label={t("salesTeam.period")} value={period} icon={Target} color="supplier" index={3} />
      </div>

      {loading ? (
        <p className="text-text-muted">{t("common.loading")}</p>
      ) : ranked.length === 0 ? (
        <EmptyState icon={Trophy} message={t("salesTeam.empty")} />
      ) : (
        <div className="space-y-2">
          {ranked.map((w, i) => {
            const pct = w.monthlyTarget ? Math.min(100, Math.round((w.commissionTotal / w.monthlyTarget) * 100)) : 0;
            return (
              <Card key={w.id} className="p-4 flex items-center gap-4">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${i === 0 ? "bg-warning/20 text-[#DDAE6A]" : "bg-silver-500/12 text-silver-500"}`}>
                  {i + 1}
                </div>
                <div className="w-10 h-10 rounded-full bg-crimson-500/16 text-crimson-200 flex items-center justify-center font-black shrink-0">{initials(w.fullName)}</div>
                <div className="flex-1 min-w-0">
                  <p className="heading text-sm text-text-primary truncate">{w.fullName}</p>
                  <p className="text-xs text-text-muted">{w.salesCount} · {t("salesTeam.rate")} {w.commissionRate}%</p>
                  {w.monthlyTarget > 0 && (
                    <div className="mt-1.5 h-1.5 w-full max-w-[220px] rounded-full bg-silver-500/16 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "linear-gradient(90deg,#6C2826,#B4413C)" }} />
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-crimson-300">{formatAmount(w.commissionTotal)}</p>
                  <p className="text-[0.62rem] text-text-muted">{t("salesTeam.due")} {formatAmount(w.commissionDue)}</p>
                </div>
                {can("salesTeam", "edit") && <button className="text-text-muted hover:text-text-primary" onClick={() => openEdit(w)}><Pencil size={16} /></button>}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.fullName || t("salesTeam.targets")} size="sm"
        footer={<><button className="btn-ghost" onClick={() => setForm(null)}>{t("common.cancel")}</button><button className="btn-primary" onClick={save} disabled={saving}>{saving ? "..." : t("common.save")}</button></>}>
        {form && (
          <div className="space-y-4">
            <Field label={t("salesTeam.rate")}>
              <input type="number" className="input" value={form.commissionRate} onChange={(e) => setForm({ ...form, commissionRate: e.target.value })} />
            </Field>
            <Field label={t("salesTeam.monthlyTarget")}>
              <input type="number" className="input" value={form.monthlyTarget} onChange={(e) => setForm({ ...form, monthlyTarget: e.target.value })} />
            </Field>
          </div>
        )}
      </Modal>
    </div>
  );
}
