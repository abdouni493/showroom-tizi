import { NavLink, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { useStore } from "../store/useStore.js";
import { can } from "../lib/permissions.js";
import AnimatedLogo from "./AnimatedLogo.jsx";
import { initials } from "../utils/format.js";
import {
  Gauge, CarFront, ShoppingBag, Calculator, Tag, Banknote, Vault,
  MonitorSmartphone, CalendarClock, Truck, Contact, Briefcase, CircleDollarSign,
  PieChart, SlidersHorizontal, Car, LogOut, Languages, X,
} from "lucide-react";

const NAV = [
  { to: "/app/dashboard", key: "dashboard", icon: Gauge },
  { to: "/app/showroom", key: "showroom", icon: CarFront },
  { to: "/app/purchase", key: "purchase", icon: ShoppingBag },
  { to: "/app/pos", key: "pos", icon: Calculator },
  { to: "/app/sales", key: "sales", icon: Tag },
  { to: "/app/payments", key: "payments", icon: Banknote },
  { to: "/app/website-settings", key: "websiteSettings", icon: MonitorSmartphone },
  { to: "/app/website-reservations", key: "websiteReservations", icon: CalendarClock },
  { to: "/app/suppliers", key: "suppliers", icon: Truck },
  { to: "/app/clients", key: "clients", icon: Contact },
  { to: "/app/workers", key: "workers", icon: Briefcase },
  { to: "/app/expenses", key: "expenses", icon: CircleDollarSign },
  { to: "/app/caisse", key: "caisse", icon: Vault },
  { to: "/app/reports", key: "reports", icon: PieChart },
  { to: "/app/settings", key: "settings", icon: SlidersHorizontal },
];

const navContainer = { hidden: {}, show: { transition: { staggerChildren: 0.04, delayChildren: 0.1 } } };
const navItem = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };

export default function Sidebar({ onNavigate }) {
  const { t, i18n } = useTranslation();
  const { user, settings, language, setLanguage, logout } = useStore();
  const navigate = useNavigate();

  const toggleLang = () => {
    const next = language === "fr" ? "ar" : "fr";
    setLanguage(next);
    i18n.changeLanguage(next);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <aside className="sidebar w-[260px] h-full bg-black border-r border-red-600/20 flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-red-600/20 flex items-center gap-3">
        <motion.div whileHover={{ scale: 1.1 }} transition={{ type: "spring", stiffness: 400, damping: 20 }}>
          <AnimatedLogo src={settings?.logo} size={44} rounded="rounded-xl" />
        </motion.div>
        <div className="min-w-0 flex-1">
          <p className="heading text-sm text-text-primary truncate">{settings?.name || "Showroom"}</p>
          <p className="text-[0.6rem] text-text-muted uppercase tracking-wider">Management</p>
        </div>
        {onNavigate && (
          <button className="lg:hidden text-text-muted" onClick={onNavigate}>
            <X size={20} />
          </button>
        )}
      </div>

      {/* Nav */}
      <motion.nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5" variants={navContainer} initial="hidden" animate="show">
        {NAV.filter(({ key }) => can(user, key, "view")).map(({ to, key, icon: Icon }) => (
          <motion.div key={to} variants={navItem} whileHover={{ x: 3 }} whileTap={{ scale: 0.97 }}>
            <NavLink to={to} onClick={onNavigate}>
              {({ isActive }) => (
                <div className="relative flex items-center gap-3 px-3 py-2.5 rounded-xl">
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="absolute inset-0"
                      style={{ background: "linear-gradient(90deg,#dc2626,#7f1d1d)", borderLeft: "4px solid #ef4444", borderRadius: "0 1rem 1rem 0" }}
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  )}
                  <motion.div whileHover={{ scale: 1.2 }} className="relative z-10 shrink-0">
                    <Icon size={18} className={isActive ? "text-white" : "text-text-muted"} />
                  </motion.div>
                  <span className={`relative z-10 truncate text-[0.78rem] uppercase tracking-wide ${isActive ? "text-white font-black" : "text-text-muted font-bold"}`}>
                    {t(`nav.${key}`)}
                  </span>
                </div>
              )}
            </NavLink>
          </motion.div>
        ))}
      </motion.nav>

      {/* Footer */}
      <div className="border-t border-red-600/20 p-3 space-y-2">
        <motion.button
          onClick={handleLogout}
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold uppercase tracking-wide text-text-muted hover:bg-red-600/8 hover:text-text-primary transition-colors"
        >
          <LogOut size={18} />
          <span className="text-[0.78rem]">{t("nav.logout")}</span>
        </motion.button>

        <div className="flex items-center gap-3 px-3 py-2 rounded-xl bg-red-600/8">
          <motion.div
            className="w-9 h-9 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center text-white font-black text-xs"
            animate={{ boxShadow: ["0 0 0px rgba(220,38,38,0)", "0 0 20px rgba(220,38,38,0.3)", "0 0 0px rgba(220,38,38,0)"] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          >
            {initials(user?.fullName || "U")}
          </motion.div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-bold text-text-primary truncate">{user?.fullName}</p>
            <p className="text-[0.6rem] text-text-muted uppercase">{user?.role}</p>
          </div>
        </div>

        <motion.button
          onClick={toggleLang}
          whileHover={{ scale: 1.03, borderColor: "#dc2626" }}
          whileTap={{ scale: 0.95 }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-red-600/30 text-text-muted hover:text-text-primary transition-colors text-xs font-bold uppercase tracking-wider overflow-hidden"
        >
          <Languages size={16} />
          <AnimatePresence mode="wait">
            <motion.span
              key={language}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {language === "fr" ? "العربية" : "Français"}
            </motion.span>
          </AnimatePresence>
        </motion.button>
      </div>
    </aside>
  );
}
