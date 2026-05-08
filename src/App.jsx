import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';

const DashboardView = lazy(() => import('./views/DashboardView'));
const ProductsView = lazy(() => import('./views/ProductsView'));
const PartiesView = lazy(() => import('./views/PartiesView'));
const PartyDashboard = lazy(() => import('./views/PartyDashboard'));
const InvoicesView = lazy(() => import('./views/InvoicesView'));
const SettingsView = lazy(() => import('./views/SettingsView'));

function RouteSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-surface-container-lowest">
      <div className="w-10 h-10 border-4 border-accent border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function PrivateRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginView />} />
        <Route path="/register" element={<RegisterView />} />
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Suspense fallback={<RouteSpinner />}><DashboardView /></Suspense>} />
          <Route path="/products" element={<Suspense fallback={<RouteSpinner />}><ProductsView /></Suspense>} />
          <Route path="/parties" element={<Suspense fallback={<RouteSpinner />}><PartiesView /></Suspense>} />
          <Route path="/parties/:partyId" element={<Suspense fallback={<RouteSpinner />}><PartyDashboard /></Suspense>} />
          <Route path="/invoices" element={<Suspense fallback={<RouteSpinner />}><InvoicesView /></Suspense>} />
          <Route path="/settings" element={<Suspense fallback={<RouteSpinner />}><SettingsView /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
