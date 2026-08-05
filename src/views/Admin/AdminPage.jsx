import { useState, useEffect, useMemo } from 'react';
import {
  Shield, Users, Building2, CheckCircle2, XCircle, Clock,
  Package, FileText, UserCheck, UserX, ToggleLeft, ToggleRight,
  Search, Filter, RefreshCw, TrendingUp, Activity, LayoutDashboard,
  Trash2, User, Key, AlertTriangle, Wrench, AlertCircle, CheckCheck, Loader2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../../services/api';

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, color, delay = 0 }) {
  const colorMap = {
    indigo: 'bg-accent/10 text-accent',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    violet: 'bg-violet-50 text-violet-600',
    teal: 'bg-teal-50 text-teal-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div
      className={`animate-fade-in-up stagger-${delay} bg-surface-container-lowest rounded-2xl border border-outline-variant/40 p-5 shadow-whisper card-lift`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorMap[color] || colorMap.indigo}`}>
          <Icon size={20} strokeWidth={1.8} />
        </div>
        <p className="text-label-sm text-muted-steel">{label}</p>
      </div>
      <p className="text-h2 text-on-surface font-mono-tabular">{value}</p>
    </div>
  );
}

// ── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ isApproved, isActive }) {
  const { t } = useTranslation();
  if (!isActive) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-600 border border-rose-100">
        <XCircle size={12} />
        {t('admin.inactive')}
      </span>
    );
  }
  if (!isApproved) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-600 border border-amber-100">
        <Clock size={12} />
        {t('admin.pending')}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
      <CheckCircle2 size={12} />
      {t('admin.approved')}
    </span>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function AdminView() {
  const { t } = useTranslation();
  const [stats, setStats] = useState(null);
  const [tenants, setTenants] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('tenants'); // 'tenants' | 'users'
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, type: null, id: null, name: '' });
  // Stock/Invoice diagnosis
  const [diagModal, setDiagModal] = useState({ isOpen: false, tenant: null, data: null, loading: false, fixing: false, fixed: false, error: null });

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [statsRes, tenantsRes, usersRes] = await Promise.all([
        api.getAdminStats(),
        api.getAdminTenants(filter === 'all' ? null : filter),
        api.getAdminUsers()
      ]);
      setStats(statsRes);
      setTenants(tenantsRes);
      setUsers(usersRes);
    } catch (err) {
      setError(err.message || t('admin.loadError'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filter]);

  const handleApprove = async (tenantId) => {
    setActionLoading(tenantId);
    try {
      await api.approveTenant(tenantId);
      await fetchData();
    } catch {
      // silently refresh
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (tenantId) => {
    setActionLoading(tenantId);
    try {
      await api.rejectTenant(tenantId);
      await fetchData();
    } catch {
      // silently refresh
    } finally {
      setActionLoading(null);
    }
  };

  const handleToggleActive = async (tenantId) => {
    setActionLoading(tenantId);
    try {
      await api.toggleTenantActive(tenantId);
      await fetchData();
    } catch {
      // silently refresh
    } finally {
      setActionLoading(null);
    }
  };

  const confirmDelete = (type, id, name) => {
    setDeleteConfirm({ isOpen: true, type, id, name });
  };

  const handleDelete = async () => {
    if (!deleteConfirm.type) return;
    setActionLoading(deleteConfirm.id);
    try {
      if (deleteConfirm.type === 'tenant') {
        await api.deleteTenant(deleteConfirm.id);
      } else if (deleteConfirm.type === 'user') {
        await api.deleteAdminUser(deleteConfirm.id);
      }
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(null);
      setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' });
    }
  };

  const handleDiagnose = async (tenant) => {
    setDiagModal({ isOpen: true, tenant, data: null, loading: true, fixing: false, fixed: false, error: null });
    try {
      const res = await api.diagnoseTenant(tenant.id);
      setDiagModal(s => ({ ...s, data: res, loading: false }));
    } catch (err) {
      setDiagModal(s => ({ ...s, loading: false, error: err.message || 'حدث خطأ' }));
    }
  };

  const handleFixStock = async () => {
    setDiagModal(s => ({ ...s, fixing: true, error: null }));
    try {
      const res = await api.fixTenantStock(diagModal.tenant.id);
      setDiagModal(s => ({ ...s, fixing: false, fixed: true, data: { ...s.data, ...res, batch_issues: [], invoice_issues: [], status: 'clean' } }));
    } catch (err) {
      setDiagModal(s => ({ ...s, fixing: false, error: err.message || 'فشل الإصلاح' }));
    }
  };

  const filteredTenants = useMemo(() => {
    if (!search.trim()) return tenants;
    const q = search.toLowerCase();
    return tenants.filter(
      (t) =>
        t.company_name?.toLowerCase().includes(q) ||
        t.owner_username?.toLowerCase().includes(q) ||
        t.owner_full_name?.toLowerCase().includes(q) ||
        t.phone?.toLowerCase().includes(q)
    );
  }, [tenants, search]);

  const filteredUsers = useMemo(() => {
    if (!search.trim()) return users;
    const q = search.toLowerCase();
    return users.filter(
      (u) =>
        u.username?.toLowerCase().includes(q) ||
        u.full_name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.tenant_name?.toLowerCase().includes(q)
    );
  }, [users, search]);

  // ── Error state ──
  if (error && !loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 animate-fade-in-up">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center">
          <XCircle size={32} className="text-rose-500" />
        </div>
        <h2 className="text-h3 text-on-surface">{t('admin.accessDenied')}</h2>
        <p className="text-body-sm text-muted-steel text-center max-w-md">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background font-sans text-on-background flex flex-col">
      {/* ── Admin Top Bar ── */}
      <div className="w-full border-b border-outline-variant/30 bg-surface-container-lowest px-6 py-4 flex items-center justify-between shadow-sm z-10 flex-shrink-0 animate-fade-in-down">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
             <Shield size={16} className="text-accent" />
           </div>
           <span className="text-label-md font-semibold text-on-surface">ERP Suite Admin</span>
        </div>
        <Link 
          to="/dashboard"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-sm font-medium
                     bg-surface-container-high text-on-surface-variant hover:bg-accent hover:text-on-primary
                     transition-all duration-200 btn-tactile"
        >
          <LayoutDashboard size={16} />
          {t('common.backToPlatform', 'العودة للمنصة')}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent flex items-center justify-center shadow-sm">
            <Shield size={22} className="text-on-primary" strokeWidth={1.8} />
          </div>
          <div>
            <h1 className="text-h2 text-on-surface">{t('admin.title')}</h1>
            <p className="text-body-sm text-muted-steel">{t('admin.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-label-md
                     bg-surface-container-high text-on-surface-variant hover:bg-accent hover:text-on-primary
                     transition-all duration-200 cursor-pointer btn-tactile disabled:opacity-50"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {t('admin.refresh')}
        </button>
      </div>

      {/* ── Stats Grid ── */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl animate-shimmer" />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={Building2} label={t('admin.totalTenants')} value={stats.total_tenants} color="indigo" delay={1} />
          <StatCard icon={CheckCircle2} label={t('admin.approvedTenants')} value={stats.approved_tenants} color="emerald" delay={2} />
          <StatCard icon={Clock} label={t('admin.pendingTenants')} value={stats.pending_tenants} color="amber" delay={3} />
          <StatCard icon={Users} label={t('admin.totalUsers')} value={stats.total_users} color="sky" delay={4} />
          <StatCard icon={Package} label={t('admin.totalProducts')} value={stats.total_products} color="violet" delay={5} />
          <StatCard icon={FileText} label={t('admin.totalInvoices')} value={stats.total_invoices} color="teal" delay={1} />
          <StatCard icon={TrendingUp} label={t('admin.totalParties')} value={stats.total_parties} color="orange" delay={2} />
          <StatCard icon={Activity} label={t('admin.activeTenants')} value={stats.active_tenants} color="emerald" delay={3} />
        </div>
      ) : null}

      {/* ── Filters & Search & Tabs ── */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up stagger-3">
        <div className="flex bg-surface-container-high rounded-xl p-1 flex-shrink-0">
          <button
            onClick={() => setActiveTab('tenants')}
            className={`px-4 py-2 rounded-lg text-label-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'tenants' ? 'bg-background text-on-surface shadow-sm' : 'text-muted-steel hover:text-on-surface-variant'
            }`}
          >
            <Building2 size={16} />
            {t('admin.tenants', 'الشركات')}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-lg text-label-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-2 ${
              activeTab === 'users' ? 'bg-background text-on-surface shadow-sm' : 'text-muted-steel hover:text-on-surface-variant'
            }`}
          >
            <Users size={16} />
            {t('admin.users', 'المستخدمين')}
          </button>
        </div>
        <div className="relative flex-1">
          <Search size={16} className="absolute top-1/2 -translate-y-1/2 start-3.5 text-muted-steel pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('admin.searchPlaceholder')}
            className="w-full ps-10 pe-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest
                       text-body-base text-on-surface placeholder:text-muted-steel/60
                       focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent/50 transition-all"
          />
        </div>
        {activeTab === 'tenants' && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter size={16} className="text-muted-steel" />
            {['all', 'pending', 'approved', 'inactive'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-2 rounded-xl text-label-sm font-medium transition-all duration-200 cursor-pointer btn-tactile
                  ${filter === f
                    ? 'bg-accent text-on-primary shadow-sm'
                    : 'bg-surface-container-high text-on-surface-variant hover:bg-surface-container-highest'
                  }`}
              >
                {t(`admin.filter_${f}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── Tenants Table ── */}
      {activeTab === 'tenants' && (
        <div className="animate-fade-in-up stagger-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-whisper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">#</th>
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.company')}</th>
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.owner')}</th>
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.status')}</th>
                  <th className="text-center px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.users')}</th>
                  <th className="text-center px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.products')}</th>
                  <th className="text-center px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.invoices')}</th>
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.createdAt')}</th>
                  <th className="text-center px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-outline-variant/20">
                      {[...Array(9)].map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded animate-shimmer" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredTenants.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-16 text-muted-steel">
                      <div className="flex flex-col items-center gap-3">
                        <Building2 size={40} className="text-muted-steel/30" />
                        <p className="text-body-base">{t('admin.noTenants')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                    >
                      <td className="px-5 py-4 text-label-sm text-muted-steel font-mono-tabular">
                        {tenant.id}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center flex-shrink-0">
                            <Building2 size={16} className="text-accent" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-label-md text-on-surface font-medium truncate">
                              {tenant.company_name}
                            </p>
                            {tenant.phone && (
                              <p className="text-[11px] text-muted-steel truncate">{tenant.phone}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <p className="text-label-sm text-on-surface">{tenant.owner_full_name || tenant.owner_username || '—'}</p>
                        <p className="text-[11px] text-muted-steel">@{tenant.owner_username || '—'}</p>
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge isApproved={tenant.is_approved} isActive={tenant.is_active} />
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-label-sm font-mono-tabular text-on-surface">{tenant.user_count}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-label-sm font-mono-tabular text-on-surface">{tenant.product_count}</span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-label-sm font-mono-tabular text-on-surface">{tenant.invoice_count}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-label-sm text-muted-steel font-mono-tabular">
                          {tenant.created_at
                            ? new Date(tenant.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' })
                            : '—'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {!tenant.is_approved && tenant.is_active && (
                            <button
                              onClick={() => handleApprove(tenant.id)}
                              disabled={actionLoading === tenant.id}
                              title={t('admin.approve')}
                              className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer btn-tactile disabled:opacity-50"
                            >
                              <UserCheck size={16} strokeWidth={2} />
                            </button>
                          )}
                          {!tenant.is_approved && tenant.is_active && (
                            <button
                              onClick={() => handleReject(tenant.id)}
                              disabled={actionLoading === tenant.id}
                              title={t('admin.reject')}
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer btn-tactile disabled:opacity-50"
                            >
                              <UserX size={16} strokeWidth={2} />
                            </button>
                          )}
                          {tenant.is_approved && (
                            <button
                              onClick={() => handleToggleActive(tenant.id)}
                              disabled={actionLoading === tenant.id}
                              title={tenant.is_active ? t('admin.deactivate') : t('admin.activate')}
                              className={`p-2 rounded-lg transition-colors cursor-pointer btn-tactile disabled:opacity-50
                                ${tenant.is_active
                                  ? 'text-amber-500 hover:bg-amber-50'
                                  : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                            >
                              {tenant.is_active ? <ToggleRight size={16} strokeWidth={2} /> : <ToggleLeft size={16} strokeWidth={2} />}
                            </button>
                          )}
                          {!tenant.is_active && !tenant.is_approved && (
                            <button
                              onClick={() => handleApprove(tenant.id)}
                              disabled={actionLoading === tenant.id}
                              title={t('admin.reactivate')}
                              className="p-2 rounded-lg text-accent hover:bg-accent-surface transition-colors cursor-pointer btn-tactile disabled:opacity-50"
                            >
                              <UserCheck size={16} strokeWidth={2} />
                            </button>
                          )}
                          <button
                            onClick={() => handleDiagnose(tenant)}
                            disabled={actionLoading === tenant.id}
                            title="تشخيص وإصلاح المخزون والفواتير"
                            className="p-2 rounded-lg text-violet-600 hover:bg-violet-50 transition-colors cursor-pointer btn-tactile disabled:opacity-50"
                          >
                            <Wrench size={16} strokeWidth={2} />
                          </button>
                          <button
                            onClick={() => confirmDelete('tenant', tenant.id, tenant.company_name)}
                            disabled={actionLoading === tenant.id}
                            title={t('admin.delete', 'حذف')}
                            className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer btn-tactile disabled:opacity-50"
                          >
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Footer */}
          {!loading && filteredTenants.length > 0 && (
            <div className="px-5 py-3 border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
              <p className="text-[11px] text-muted-steel">
                {t('admin.showingCount', { count: filteredTenants.length, total: tenants.length })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Users Table ── */}
      {activeTab === 'users' && (
        <div className="animate-fade-in-up stagger-4 bg-surface-container-lowest rounded-2xl border border-outline-variant/40 shadow-whisper overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-outline-variant/40 bg-surface-container-low">
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">#</th>
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.user', 'المستخدم')}</th>
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.company', 'الشركة')}</th>
                  <th className="text-start px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.role', 'الصلاحية')}</th>
                  <th className="text-center px-5 py-3.5 text-label-sm text-muted-steel font-semibold">{t('admin.actions', 'الإجراءات')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="border-b border-outline-variant/20">
                      {[...Array(5)].map((__, j) => (
                        <td key={j} className="px-5 py-4">
                          <div className="h-4 rounded animate-shimmer" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-16 text-muted-steel">
                      <div className="flex flex-col items-center gap-3">
                        <Users size={40} className="text-muted-steel/30" />
                        <p className="text-body-base">{t('admin.noUsers', 'لا يوجد مستخدمين')}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-outline-variant/20 hover:bg-surface-container-low transition-colors"
                    >
                      <td className="px-5 py-4 text-label-sm text-muted-steel font-mono-tabular">
                        {user.id}
                      </td>
                      <td className="px-5 py-4">
                        <Link to={`/admin/users/${user.id}`} className="flex items-center gap-3 group">
                          <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center flex-shrink-0 group-hover:bg-sky-100 transition-colors">
                            <User size={16} className="text-sky-600" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-label-md text-on-surface font-medium truncate group-hover:text-accent transition-colors">
                              {user.full_name || user.username}
                            </p>
                            <p className="text-[11px] text-muted-steel truncate">@{user.username}</p>
                          </div>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <Building2 size={14} className="text-muted-steel" />
                          <span className="text-label-sm text-on-surface">{user.tenant_name || '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                          user.role === 'super_admin' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' :
                          user.role === 'owner' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                          'bg-surface-container-high text-on-surface border border-outline-variant'
                        }`}>
                          {user.role === 'super_admin' && <Key size={12} />}
                          {user.role}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {user.role !== 'super_admin' && (
                            <button
                              onClick={() => confirmDelete('user', user.id, user.full_name || user.username)}
                              disabled={actionLoading === user.id}
                              title={t('admin.delete', 'حذف')}
                              className="p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer btn-tactile disabled:opacity-50"
                            >
                              <Trash2 size={16} strokeWidth={2} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Footer */}
          {!loading && filteredUsers.length > 0 && (
            <div className="px-5 py-3 border-t border-outline-variant/30 bg-surface-container-low flex items-center justify-between">
              <p className="text-[11px] text-muted-steel">
                {t('admin.showingCount', { count: filteredUsers.length, total: users.length })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Confirmation Modal ── */}
      {deleteConfirm.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 w-full max-w-sm shadow-xl animate-fade-in-up">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-h3 text-on-surface mb-2">
                  {t('admin.confirmDelete', 'تأكيد الحذف')}
                </h3>
                <p className="text-body-sm text-muted-steel">
                  {t('admin.deleteWarning', 'هل أنت متأكد من رغبتك في حذف ')} 
                  <span className="font-semibold text-on-surface mx-1">{deleteConfirm.name}</span>؟
                  <br />
                  <span className="text-rose-500 mt-2 block font-medium">
                    {t('admin.deleteIrreversible', 'هذا الإجراء لا يمكن التراجع عنه وسيحذف جميع البيانات المرتبطة.')}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-3 w-full mt-2">
                <button
                  onClick={() => setDeleteConfirm({ isOpen: false, type: null, id: null, name: '' })}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl text-label-md bg-surface-container-highest text-on-surface hover:bg-outline-variant/30 transition-colors cursor-pointer"
                >
                  {t('common.cancel', 'إلغاء')}
                </button>
                <button
                  onClick={handleDelete}
                  disabled={actionLoading}
                  className="flex-1 py-2.5 rounded-xl text-label-md bg-rose-600 text-white hover:bg-rose-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  {actionLoading ? (
                    <RefreshCw size={16} className="animate-spin" />
                  ) : (
                    <Trash2 size={16} />
                  )}
                  {t('common.confirm', 'تأكيد')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Diagnosis Modal ── */}
      {diagModal.isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-surface rounded-3xl p-6 w-full max-w-2xl shadow-xl flex flex-col max-h-[85vh] animate-fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-50 flex items-center justify-center text-violet-600">
                  <Wrench size={20} />
                </div>
                <div>
                  <h3 className="text-h3 text-on-surface">فحص مخزون وفواتير الشركة</h3>
                  <p className="text-body-sm text-muted-steel">{diagModal.tenant?.company_name}</p>
                </div>
              </div>
              <button
                onClick={() => setDiagModal({ isOpen: false, tenant: null, data: null, loading: false, fixing: false, fixed: false, error: null })}
                className="p-2 rounded-xl text-muted-steel hover:bg-surface-container-high transition-colors"
              >
                <XCircle size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto min-h-0 space-y-4 px-1">
              {diagModal.loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-3 text-muted-steel">
                  <Loader2 size={32} className="animate-spin" />
                  <p>جاري فحص البيانات...</p>
                </div>
              ) : diagModal.error ? (
                <div className="p-4 bg-rose-50 text-rose-600 rounded-xl flex items-start gap-3">
                  <AlertCircle size={20} className="shrink-0 mt-0.5" />
                  <p>{diagModal.error}</p>
                </div>
              ) : diagModal.data ? (
                <>
                  <div className={`p-4 rounded-xl flex items-center gap-3 border ${diagModal.data.status === 'clean' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'}`}>
                    {diagModal.data.status === 'clean' ? <CheckCheck size={24} /> : <AlertTriangle size={24} />}
                    <div>
                      <p className="font-semibold text-label-md">
                        {diagModal.data.status === 'clean' ? 'البيانات سليمة' : 'تم العثور على أخطاء!'}
                      </p>
                      <p className="text-body-sm opacity-90">
                        {diagModal.data.status === 'clean' 
                          ? 'لا يوجد أي مشاكل في أرصدة المخزون أو إجماليات الفواتير لهذه الشركة.'
                          : `يوجد ${diagModal.data.batch_issues_count} خطأ بالمخزون و ${diagModal.data.invoice_issues_count} خطأ بالفواتير.`}
                      </p>
                    </div>
                  </div>

                  {diagModal.fixed && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-start gap-3">
                      <CheckCircle2 size={20} className="shrink-0 mt-0.5" />
                      <p className="text-label-md">تم إصلاح الأخطاء بنجاح وتم تحديث قاعدة البيانات.</p>
                    </div>
                  )}

                  {diagModal.data.batch_issues?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-label-md font-semibold text-on-surface">أخطاء المخزون (Batches)</h4>
                      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden text-sm">
                        <table className="w-full text-start">
                          <thead className="bg-surface-container-low border-b border-outline-variant/30">
                            <tr>
                              <th className="px-3 py-2 text-muted-steel font-medium">الدفعة</th>
                              <th className="px-3 py-2 text-muted-steel font-medium">مخزن حالياً</th>
                              <th className="px-3 py-2 text-emerald-600 font-medium">الرقم الصحيح</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20">
                            {diagModal.data.batch_issues.map((b, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2">Batch {b.batch_id} (Prod {b.product_id})</td>
                                <td className="px-3 py-2 text-rose-500 font-mono">{b.actual_remaining}</td>
                                <td className="px-3 py-2 text-emerald-600 font-mono font-bold">{b.correct_remaining}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {diagModal.data.invoice_issues?.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-label-md font-semibold text-on-surface">أخطاء الفواتير (Invoices)</h4>
                      <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl overflow-hidden text-sm">
                        <table className="w-full text-start">
                          <thead className="bg-surface-container-low border-b border-outline-variant/30">
                            <tr>
                              <th className="px-3 py-2 text-muted-steel font-medium">الفاتورة</th>
                              <th className="px-3 py-2 text-muted-steel font-medium">مخزن حالياً</th>
                              <th className="px-3 py-2 text-emerald-600 font-medium">الإجمالي الصحيح</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/20">
                            {diagModal.data.invoice_issues.map((inv, i) => (
                              <tr key={i}>
                                <td className="px-3 py-2">INV {inv.invoice_id} ({inv.invoice_type})</td>
                                <td className="px-3 py-2 text-rose-500 font-mono">{inv.stored_total}</td>
                                <td className="px-3 py-2 text-emerald-600 font-mono font-bold">{inv.correct_total}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-3 w-full mt-6 pt-4 border-t border-outline-variant/30">
              <button
                onClick={() => setDiagModal({ isOpen: false, tenant: null, data: null, loading: false, fixing: false, fixed: false, error: null })}
                className="flex-1 py-2.5 rounded-xl text-label-md bg-surface-container-highest text-on-surface hover:bg-outline-variant/30 transition-colors"
              >
                إغلاق
              </button>
              {diagModal.data?.status === 'has_issues' && (
                <button
                  onClick={handleFixStock}
                  disabled={diagModal.fixing}
                  className="flex-1 py-2.5 rounded-xl text-label-md bg-violet-600 text-white hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
                >
                  {diagModal.fixing ? <Loader2 size={16} className="animate-spin" /> : <Wrench size={16} />}
                  إصلاح وتصحيح الأرقام
                </button>
              )}
            </div>
          </div>
        </div>
      )}

        </div>
      </div>
    </div>
  );
}
