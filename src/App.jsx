import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import LoginView from './views/LoginView';
import RegisterView from './views/RegisterView';

import { AuthProvider } from './context/AuthContext';

const DashboardView = lazy(() => import('./views/DashboardView'));
const ProductsView = lazy(() => import('./views/ProductsView'));
const CustomersView = lazy(() => import('./views/CustomersView'));
const CustomerProfileView = lazy(() => import('./views/CustomerProfileView'));
const SuppliersView = lazy(() => import('./views/SuppliersView'));
const SupplierProfileView = lazy(() => import('./views/SupplierProfileView'));
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

function PublicRoute({ children }) {
  const token = localStorage.getItem('access_token');
  if (token) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
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
            <Route path="/customers/:id" element={<Suspense fallback={<RouteSpinner />}><CustomerProfileView /></Suspense>} />
            <Route path="/suppliers" element={<Suspense fallback={<RouteSpinner />}><SuppliersView /></Suspense>} />
            <Route path="/suppliers/:id" element={<Suspense fallback={<RouteSpinner />}><SupplierProfileView /></Suspense>} />
            <Route path="/invoices" element={<Suspense fallback={<RouteSpinner />}><InvoicesView /></Suspense>} />
            <Route path="/settings" element={<Suspense fallback={<RouteSpinner />}><SettingsView /></Suspense>} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
