import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import { useStore } from "./store/useStore.js";
import { firstAllowedSection } from "./lib/permissions.js";

import AppShell from "./components/AppShell.jsx";
import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Showroom from "./pages/Showroom.jsx";
import Purchase from "./pages/Purchase.jsx";
import POS from "./pages/POS.jsx";
import Sales from "./pages/Sales.jsx";
import Payments from "./pages/Payments.jsx";
import Caisse from "./pages/Caisse.jsx";
import WebsiteSettings from "./pages/WebsiteSettings.jsx";
import WebsiteReservations from "./pages/WebsiteReservations.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Clients from "./pages/Clients.jsx";
import Workers from "./pages/Workers.jsx";
import Expenses from "./pages/Expenses.jsx";
import Reports from "./pages/Reports.jsx";
import Settings from "./pages/Settings.jsx";

import Imports from "./pages/Imports.jsx";
import ClientOrders from "./pages/ClientOrders.jsx";
import Dossiers from "./pages/Dossiers.jsx";
import Pipeline from "./pages/Pipeline.jsx";
import Quotes from "./pages/Quotes.jsx";
import Invoices from "./pages/Invoices.jsx";
import PriceLists from "./pages/PriceLists.jsx";
import Commissions from "./pages/Commissions.jsx";
import SalesTeam from "./pages/SalesTeam.jsx";
import Services from "./pages/Services.jsx";
import Workshop from "./pages/Workshop.jsx";
import Profitability from "./pages/Profitability.jsx";
import CustomsCalculator from "./pages/CustomsCalculator.jsx";

import Home from "./pages/website/Home.jsx";
import CarDetail from "./pages/website/CarDetail.jsx";
import Contacts from "./pages/website/Contacts.jsx";

function ProtectedRoute({ children }) {
  const { user, authChecked, loadMe } = useStore();
  const location = useLocation();

  useEffect(() => {
    if (!authChecked) loadMe();
  }, [authChecked, loadMe]);

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-transparent">
        <div className="text-text-muted heading">Chargement...</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}

// Landing inside /app: send the user to the first section they're allowed to see.
const SECTION_ROUTE = {
  websiteSettings: "website-settings",
  websiteReservations: "website-reservations",
  clientOrders: "client-orders",
  salesTeam: "sales-team",
  priceLists: "price-lists",
  customsCalculator: "customs-calculator",
};
function DefaultLanding() {
  const user = useStore((s) => s.user);
  const section = firstAllowedSection(user);
  if (!section) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center text-center">
        <div>
          <p className="heading text-lg text-text-primary mb-1">Aucun accès</p>
          <p className="text-text-muted text-sm">Aucune permission ne vous a été attribuée. Contactez un administrateur.</p>
        </div>
      </div>
    );
  }
  return <Navigate to={`/app/${SECTION_ROUTE[section] || section}`} replace />;
}

export default function App() {
  return (
    <MotionConfig reducedMotion="user">
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />

      {/* Public website */}
      <Route path="/website" element={<Home />} />
      <Route path="/website/contacts" element={<Contacts />} />
      <Route path="/website/car/:id" element={<CarDetail />} />

      {/* Protected app */}
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DefaultLanding />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="showroom" element={<Showroom />} />
        <Route path="purchase" element={<Purchase />} />
        <Route path="imports" element={<Imports />} />
        <Route path="client-orders" element={<ClientOrders />} />
        <Route path="dossiers" element={<Dossiers />} />
        <Route path="pos" element={<POS />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="sales" element={<Sales />} />
        <Route path="quotes" element={<Quotes />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="payments" element={<Payments />} />
        <Route path="caisse" element={<Caisse />} />
        <Route path="website-settings" element={<WebsiteSettings />} />
        <Route path="price-lists" element={<PriceLists />} />
        <Route path="website-reservations" element={<WebsiteReservations />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="clients" element={<Clients />} />
        <Route path="workers" element={<Workers />} />
        <Route path="commissions" element={<Commissions />} />
        <Route path="sales-team" element={<SalesTeam />} />
        <Route path="services" element={<Services />} />
        <Route path="workshop" element={<Workshop />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="profitability" element={<Profitability />} />
        <Route path="reports" element={<Reports />} />
        <Route path="customs-calculator" element={<CustomsCalculator />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </MotionConfig>
  );
}
