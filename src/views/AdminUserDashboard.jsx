import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, ArrowRight, User, Shield, Building2,
  CheckCircle2, XCircle, Mail, Phone, Calendar,
  AlertTriangle, Key, Clock, FileText, Users
} from 'lucide-react';
import api from '../services/api';
import AdminTenantInvoices from '../components/AdminTenantInvoices';
import AdminTenantParties from '../components/AdminTenantParties';

export default function AdminUserDashboard() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  const { userId } = useParams();
  
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchUserDetails();
  }, [userId]);

  const fetchUserDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAdminUserDetails(userId);
      setUser(data);
    } catch (err) {
      setError(err.message || 'Error loading user details');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center p-6">
        <div className="text-center max-w-md w-full p-8 bg-surface-container rounded-3xl">
          <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-h3 text-on-surface mb-2">{t('common.error')}</h2>
          <p className="text-body-md text-muted-steel mb-6">{error || 'User not found'}</p>
          <Link to="/admin" className="btn btn-primary w-full justify-center">
            {t('common.back')}
          </Link>
        </div>
      </div>
    );
  }

  const roleColors = {
    super_admin: 'bg-violet-50 text-violet-600 border-violet-100',
    owner: 'bg-amber-50 text-amber-600 border-amber-100',
    admin: 'bg-indigo-50 text-indigo-600 border-indigo-100',
    user: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  };

  return (
    <div className="min-h-screen bg-surface-container-lowest text-on-surface selection:bg-accent/20">
      {/* ── Header ── */}
      <header className="sticky top-0 z-40 bg-surface-container-lowest/80 backdrop-blur-xl border-b border-outline-variant/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              to="/admin"
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-surface-container hover:bg-surface-container-high text-muted-steel hover:text-on-surface transition-colors"
            >
              {isRTL ? <ArrowRight size={20} /> : <ArrowLeft size={20} />}
            </Link>
            <div>
              <h1 className="text-h3 font-bold text-on-surface">{user.full_name || user.username}</h1>
              <p className="text-label-sm text-muted-steel">ID: {user.id}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${roleColors[user.role] || roleColors.user} flex items-center gap-1.5`}>
              {user.role === 'super_admin' ? <Key size={14} /> : <Shield size={14} />}
              {user.role.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>
      </header>

      {/* ── Content ── */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-outline-variant/30 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-label-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-accent text-on-primary' : 'text-muted-steel hover:bg-surface-container'
            }`}
          >
            <span className="flex items-center gap-1.5"><Building2 size={16} /> Overview</span>
          </button>
          <button
            onClick={() => setActiveTab('invoices')}
            className={`px-4 py-2 rounded-xl text-label-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'invoices' ? 'bg-accent text-on-primary' : 'text-muted-steel hover:bg-surface-container'
            }`}
          >
            <span className="flex items-center gap-1.5"><FileText size={16} /> {t('nav.invoices')}</span>
          </button>
          <button
            onClick={() => setActiveTab('parties')}
            className={`px-4 py-2 rounded-xl text-label-sm font-medium transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'parties' ? 'bg-accent text-on-primary' : 'text-muted-steel hover:bg-surface-container'
            }`}
          >
            <span className="flex items-center gap-1.5"><Users size={16} /> {t('nav.parties', 'Parties')}</span>
          </button>
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* User Profile Card */}
            <div className="lg:col-span-1">
              <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/30 shadow-whisper h-full">
                <div className="w-24 h-24 rounded-full bg-accent/10 text-accent flex items-center justify-center mx-auto mb-4 border-4 border-surface-container-lowest">
                  <User size={40} />
                </div>
                <h2 className="text-h3 font-bold text-center mb-1">{user.full_name || 'N/A'}</h2>
                <p className="text-body-sm text-muted-steel text-center mb-6">@{user.username}</p>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/40">
                    <div className="mt-0.5 text-muted-steel"><User size={18} /></div>
                    <div>
                      <p className="text-label-sm text-muted-steel">{t('admin.users.username')}</p>
                      <p className="text-body-md font-medium">{user.username}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3 p-3 rounded-2xl bg-surface-container-lowest border border-outline-variant/40">
                    <div className="mt-0.5 text-muted-steel"><Shield size={18} /></div>
                    <div>
                      <p className="text-label-sm text-muted-steel">{t('admin.users.role')}</p>
                      <p className="text-body-md font-medium capitalize">{user.role.replace('_', ' ')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tenant Info Card */}
            <div className="lg:col-span-2">
              <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/30 shadow-whisper h-full">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-h4 font-bold">{t('admin.tenants.companyName')}</h3>
                    <p className="text-body-sm text-muted-steel">Tenant Details</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/40">
                    <p className="text-label-sm text-muted-steel mb-1">{t('admin.tenants.companyName')}</p>
                    <p className="text-h4 font-semibold">{user.company_name}</p>
                  </div>
                  
                  <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/40">
                    <p className="text-label-sm text-muted-steel mb-1">Tenant ID</p>
                    <p className="text-h4 font-semibold">{user.tenant_id}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-between">
                    <div>
                      <p className="text-label-sm text-muted-steel mb-1">{t('admin.status')}</p>
                      <div className="flex items-center gap-2">
                        {user.tenant_is_active ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <CheckCircle2 size={14} /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-600 border border-rose-100">
                            <XCircle size={14} /> Inactive
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 flex items-center justify-between">
                    <div>
                      <p className="text-label-sm text-muted-steel mb-1">Approval</p>
                      <div className="flex items-center gap-2">
                        {user.tenant_is_approved ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-100">
                            <CheckCircle2 size={14} /> Approved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-600 border border-amber-100">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

              </div>
            </div>
            
          </div>
        )}

        {activeTab === 'invoices' && (
          <AdminTenantInvoices tenantId={user.tenant_id} />
        )}

        {activeTab === 'parties' && (
          <AdminTenantParties tenantId={user.tenant_id} />
        )}
      </main>
    </div>
  );
}
