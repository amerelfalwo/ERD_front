import { lazy, Suspense, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDirection } from '@mantine/core';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginView from './views/Auth/LoginPage';
import RegisterView from './views/Auth/RegisterPage';

import { AuthProvider } from './context/AuthContext';

const DashboardView = lazy(() => import('./views/Dashboard/DashboardPage'));
const ProductsView = lazy(() => import('./views/Products/ProductsPage'));
const CustomersView = lazy(() => import('./views/Parties/CustomerPage'));
const SuppliersView = lazy(() => import('./views/Suppliers/SuppliersPage'));
const PartyDashboard = lazy(() => import('./views/Parties/PartyDashboardPage'));
const InvoicesView = lazy(() => import('./views/Invoices/InvoicesPage'));
const SettingsView = lazy(() => import('./views/Settings/SettingsPage'));
const ExpensesView = lazy(() => import('./views/Expenses/ExpensesPage'));
const AdminView = lazy(() => import('./views/Admin/AdminPage'));
const AdminUserDashboard = lazy(() => import('./views/Admin/AdminUserDashboardPage'));

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

function PublicRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  const { i18n } = useTranslation();
  const { setDirection } = useDirection();

  useEffect(() => {
    const currentLang = i18n.language || 'ar';
    const dir = currentLang === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.dir = dir;
    document.documentElement.lang = currentLang;
    setDirection(dir);
  }, [i18n.language, setDirection]);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginView /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterView /></PublicRoute>} />
          <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Suspense fallback={<RouteSpinner />}><DashboardView /></Suspense>} />
            <Route path="/products" element={<Suspense fallback={<RouteSpinner />}><ProductsView /></Suspense>} />
            <Route path="/customers" element={<Suspense fallback={<RouteSpinner />}><CustomersView /></Suspense>} />
            <Route path="/customers/:partyId" element={<Suspense fallback={<RouteSpinner />}><PartyDashboard /></Suspense>} />
            <Route path="/suppliers" element={<Suspense fallback={<RouteSpinner />}><SuppliersView /></Suspense>} />
            <Route path="/suppliers/:partyId" element={<Suspense fallback={<RouteSpinner />}><PartyDashboard /></Suspense>} />
            <Route path="/invoices" element={<Suspense fallback={<RouteSpinner />}><InvoicesView /></Suspense>} />
            <Route path="/expenses" element={<Suspense fallback={<RouteSpinner />}><ExpensesView /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<RouteSpinner />}><SettingsView /></Suspense>} />
          </Route>
          
          <Route path="/admin" element={<PrivateRoute><Suspense fallback={<RouteSpinner />}><AdminView /></Suspense></PrivateRoute>} />
          <Route path="/admin/users/:userId" element={<PrivateRoute><Suspense fallback={<RouteSpinner />}><AdminUserDashboard /></Suspense></PrivateRoute>} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
