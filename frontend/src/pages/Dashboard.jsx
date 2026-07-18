import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import {
  BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Car, CheckCircle, Clock, Tag, Users, Factory, Receipt, HardHat,
  CalendarClock, EyeOff, ShoppingCart, Wallet, TrendingUp,
} from "lucide-react";
import { useFetch } from "../hooks/useApi.js";
import { dashboardApi } from "../lib/api.js";
import { StatCard, Card, Badge, SkeletonGrid } from "../components/ui.jsx";
import { CarImage } from "../components/CarCard.jsx";
import { formatDate, STATUS_LABELS } from "../utils/format.js";

const PIE_COLORS = { AVAILABLE: "#3FA07C", SOLD: "#9B302B", RESERVED: "#C89143" };

function ChartCard({ title, children, className = "", index = 0 }) {
  return (
    <motion.div
      className={`glass-card p-5 ${className}`}
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.2 }}
      transition={{ duration: 0.5, ease: "easeOut", delay: index * 0.12 }}
    >
      <h3 className="heading text-sm text-text-primary mb-4">{title}</h3>
      {children}
    </motion.div>
  );
}

// Small money-free metric tile used in the secondary "operations" grid.
function MiniStat({ icon: Icon, label, value, color = "text-text-primary", index = 0 }) {
  return (
    <motion.div
      className="glass-card p-4 flex items-center gap-3"
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.04 }}
    >
      <div className={`p-2.5 rounded-xl bg-silver-500/10 ${color}`}><Icon size={18} /></div>
      <div className="min-w-0">
        <p className={`text-xl font-black leading-none ${color}`}>{value}</p>
        <p className="label-caps mt-1 truncate">{label}</p>
      </div>
    </motion.div>
  );
}

const tooltipStyle = {
  background: "#21252C",
  border: "1px solid rgba(153,161,169,0.28)",
  borderRadius: "12px",
  color: "#E5E6E6",
  fontSize: "12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
};

export default function Dashboard() {
  const { t } = useTranslation();
  const { data, loading } = useFetch(() => dashboardApi.stats(), []);

  if (loading || !data) {
    return (
      <div>
        <h1 className="heading text-3xl text-text-primary mb-6">{t("dashboard.title")}</h1>
        <SkeletonGrid count={8} />
      </div>
    );
  }

  const { counts, charts, lists, workers, website } = data;
  const pieData = Object.entries(charts.statusDistribution).map(([k, v]) => ({ name: STATUS_LABELS[k], key: k, value: v }));

  return (
    <div>
      <h1 className="heading text-3xl text-text-primary mb-6">{t("dashboard.title")}</h1>

      {/* Inventory KPIs (counts only — no money) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard index={0} label={t("dashboard.totalCars")} value={counts.totalCars} icon={Car} color="accent" />
        <StatCard index={1} label={t("dashboard.carsInStock")} value={counts.available} icon={CheckCircle} color="success" />
        <StatCard index={2} label={t("dashboard.reserved")} value={counts.reserved} icon={Clock} color="warning" />
        <StatCard index={3} label={t("dashboard.soldTotal")} value={counts.sold} icon={Tag} color="info" />
        <StatCard index={4} label={t("dashboard.clients")} value={counts.totalClients} icon={Users} color="info" />
        <StatCard index={5} label={t("dashboard.suppliers")} value={counts.totalSuppliers} icon={Factory} color="supplier" />
        <StatCard index={6} label={t("dashboard.workers")} value={counts.totalWorkers} icon={HardHat} color="warning" />
        <StatCard index={7} label={t("dashboard.soldThisMonth")} value={counts.soldThisMonth} icon={TrendingUp} color="success" />
      </div>

      {/* Charts (activity counts + status mix — no money) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <ChartCard index={0} title={t("dashboard.activityPerMonth")} className="lg:col-span-2">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={charts.months}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(153,161,169,0.12)" />
              <XAxis dataKey="label" stroke="#99A1A9" fontSize={11} />
              <YAxis stroke="#99A1A9" fontSize={11} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px", color: "#C0C2C4" }} />
              <Bar dataKey="purchases" fill="#8A7BA8" name={t("dashboard.purchases")} radius={[4, 4, 0, 0]} />
              <Bar dataKey="sales" fill="#3FA07C" name={t("dashboard.sales")} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard index={1} title={t("dashboard.carStatus")}>
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3}>
                {pieData.map((entry) => (
                  <Cell key={entry.key} fill={PIE_COLORS[entry.key]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: "11px" }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Operations overview (counts) */}
      <h2 className="heading text-sm text-text-muted uppercase tracking-wider mb-3">{t("dashboard.operations")}</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        <MiniStat index={0} icon={ShoppingCart} label={t("dashboard.totalPurchases")} value={counts.totalPurchases} color="text-[#AFA0C9]" />
        <MiniStat index={1} icon={Receipt} label={t("dashboard.totalSales")} value={counts.totalSales} color="text-[#5FBE9A]" />
        <MiniStat index={2} icon={Wallet} label={t("dashboard.totalExpenses")} value={counts.totalExpenses} color="text-[#DDAE6A]" />
        <MiniStat index={3} icon={Users} label={t("dashboard.clientsInDebt")} value={counts.clientsInDebt} color="text-crimson-200" />
        <MiniStat index={4} icon={Factory} label={t("dashboard.suppliersInDebt")} value={counts.suppliersInDebt} color="text-crimson-200" />
        <MiniStat index={5} icon={CalendarClock} label={t("dashboard.pendingReservations")} value={website.pendingReservations} color="text-[#DDAE6A]" />
      </div>

      {/* Recent activity lists (no amounts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
        <Card className="p-5">
          <h3 className="heading text-sm text-text-primary mb-4">{t("dashboard.lastPurchases")}</h3>
          <div className="space-y-3">
            {lists.lastPurchases.length === 0 && <p className="text-text-muted text-sm">{t("common.noData")}</p>}
            {lists.lastPurchases.map((p, i) => (
              <motion.div key={p.id} className="flex items-center gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0"><CarImage images={p.car?.images} heightClass="h-9" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate font-medium">{p.car?.brand} {p.car?.model}</p>
                  <p className="text-xs text-text-muted truncate">{p.supplier?.fullName || (p.client ? `${p.client.firstName} ${p.client.lastName}` : "—")}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-muted">{formatDate(p.date)}</p>
                  {p.amountRest > 0 && <Badge color="debt">{t("dashboard.debt")}</Badge>}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="heading text-sm text-text-primary mb-4">{t("dashboard.lastSales")}</h3>
          <div className="space-y-3">
            {lists.lastSales.length === 0 && <p className="text-text-muted text-sm">{t("common.noData")}</p>}
            {lists.lastSales.map((s, i) => (
              <motion.div key={s.id} className="flex items-center gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="w-12 h-9 rounded-lg overflow-hidden shrink-0"><CarImage images={s.car?.images} heightClass="h-9" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate font-medium">{s.client?.firstName} {s.client?.lastName}</p>
                  <p className="text-xs text-text-muted truncate">{s.car?.brand} {s.car?.model}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-text-muted">{formatDate(s.date)}</p>
                  {s.amountRest > 0 ? <Badge color="debt">{t("dashboard.debt")}</Badge> : <Badge color="success">{t("purchase.filterPaid")}</Badge>}
                </div>
              </motion.div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="heading text-sm text-text-primary mb-4">{t("dashboard.lastExpenses")}</h3>
          <div className="space-y-3">
            {lists.lastExpenses.length === 0 && <p className="text-text-muted text-sm">{t("common.noData")}</p>}
            {lists.lastExpenses.map((e, i) => (
              <motion.div key={e.id} className="flex items-center gap-3" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                <div className="p-2 rounded-lg bg-silver-500/10 text-[#DDAE6A] shrink-0"><Receipt size={16} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate font-medium">{e.name}</p>
                  <p className="text-xs text-text-muted truncate">{e.type === "CAR" ? (e.car ? `${e.car.brand} ${e.car.model}` : t("common.vehicle")) : "Showroom"}</p>
                </div>
                <p className="text-xs text-text-muted shrink-0">{formatDate(e.date)}</p>
              </motion.div>
            ))}
          </div>
        </Card>
      </div>

      {/* Workforce + website (counts only) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="heading text-sm text-text-primary mb-4">{t("dashboard.workers")}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center"><HardHat className="mx-auto text-[#DDAE6A] mb-1" size={22} /><p className="text-2xl font-black text-text-primary">{workers.count}</p><p className="label-caps">{t("dashboard.workers")}</p></div>
            <div className="text-center"><Users className="mx-auto text-[#8FB4D9] mb-1" size={22} /><p className="text-2xl font-black text-[#8FB4D9]">{counts.totalClients}</p><p className="label-caps">{t("dashboard.clients")}</p></div>
            <div className="text-center"><Factory className="mx-auto text-[#AFA0C9] mb-1" size={22} /><p className="text-2xl font-black text-[#AFA0C9]">{counts.totalSuppliers}</p><p className="label-caps">{t("dashboard.suppliers")}</p></div>
          </div>
        </Card>

        <Card className="p-5">
          <h3 className="heading text-sm text-text-primary mb-4">{t("dashboard.website")}</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center"><CalendarClock className="mx-auto text-[#DDAE6A] mb-1" size={22} /><p className="text-2xl font-black text-[#DDAE6A]">{website.pendingReservations}</p><p className="label-caps">{t("dashboard.pendingReservations")}</p></div>
            <div className="text-center"><EyeOff className="mx-auto text-text-muted mb-1" size={22} /><p className="text-2xl font-black text-text-primary">{website.hiddenOffers}</p><p className="label-caps">{t("dashboard.hiddenOffers")}</p></div>
          </div>
        </Card>
      </div>
    </div>
  );
}
