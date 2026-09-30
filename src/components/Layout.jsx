import { useState, useMemo, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Truck, FileText, Settings,
  Menu, X, LogOut, Building2, Shield, DollarSign,
  ChevronLeft, ChevronRight, WifiOff
} from 'lucide-react';
import myLogo from '../assets/logo.webp';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { getLogoUrl } from '../utils/url';
import api from '../services/api';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('erp_sidebar_collapsed') === 'true');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Pre-warm the cache when the layout mounts (user logs in)
  useEffect(() => {
    api.prefetchAll();
  }, []);

  const toggleCollapse = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('erp_sidebar_collapsed', String(next));
      return next;
    });
  };

  const navItems = useMemo(() => [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/products', label: t('nav.products'), icon: Package },
    { path: '/customers', label: t('nav.customers'), icon: Users },
    { path: '/suppliers', label: t('nav.suppliers'), icon: Truck },
    { path: '/invoices', label: t('nav.invoices'), icon: FileText },
    { path: '/expenses', label: t('expenses.title'), icon: DollarSign },
  ], [t]);

  const companyName = user?.tenant?.company_name || 'ERP Dashboard';
  const displayName = user?.username || 'User';
  const displayRole = user?.role || 'member';

  const avatarUrl = useMemo(() => {
    const name = encodeURIComponent(displayName);
    return `https://ui-avatars.com/api/?name=${name}&background=eef2ff&color=4f46e5&bold=true&size=64`;
  }, [displayName]);

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('erp_user');
    window.location.href = '/login';
  }

  return (
    <div className="flex h-screen w-full bg-background text-on-background font-sans overflow-hidden print:hidden">
      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal-ink/30 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Floating Mobile Toggle Button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-4 right-4 rtl:left-4 rtl:right-auto z-30 md:hidden p-2.5 bg-surface-container-lowest border border-outline-variant/60 shadow-lg rounded-2xl text-on-surface hover:bg-surface-container-low transition-all btn-tactile"
        title="Open Navigation"
      >
        <Menu size={22} />
      </button>

      {/* ── Sidebar Component ── */}
      <nav
        className={`
          fixed md:static inset-y-0 left-0 rtl:right-0 rtl:left-auto z-50 flex flex-col h-screen
          ${collapsed ? 'md:w-[80px]' : 'md:w-[275px]'} w-[275px]
          border-r rtl:border-l rtl:border-r-0 border-outline-variant/60 bg-surface-container-lowest flex-shrink-0
          transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-whisper relative group
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full md:translate-x-0 rtl:md:translate-x-0'}
        `}
      >
        {/* Desktop Sidebar Collapse Toggle Arrow Button */}
        <button
          onClick={toggleCollapse}
          className="hidden md:flex items-center justify-center w-7 h-7 bg-surface-container-lowest border border-outline-variant/60 shadow-md rounded-full text-muted-steel hover:text-accent hover:border-accent transition-all cursor-pointer absolute -right-3.5 rtl:-left-3.5 rtl:right-auto top-6 z-50 btn-tactile hover:scale-110"
          title={collapsed ? (i18n.language === 'ar' ? 'توسيع القائمة' : 'Expand Sidebar') : (i18n.language === 'ar' ? 'طي القائمة' : 'Collapse Sidebar')}
        >
          {i18n.language === 'ar'
            ? (collapsed ? <ChevronLeft size={16} /> : <ChevronRight size={16} />)
            : (collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />)
          }
        </button>

        {/* Company Header */}
        <div className={`px-5 py-5 border-b border-outline-variant/30 flex items-center ${collapsed ? 'justify-center' : 'justify-between'}`}>
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden border border-outline-variant/30 ${user?.tenant?.logo_url ? 'bg-transparent' : 'bg-accent'}`}>
              {user?.tenant?.logo_url ? (
                <img src={getLogoUrl(user.tenant.logo_url)} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 size={20} className="text-on-primary" strokeWidth={1.8} />
              )}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1 animate-fade-in">
                <h1 className="text-label-md text-on-surface font-bold truncate leading-tight">
                  {companyName}
                </h1>
                <p className="text-[10px] text-muted-steel tracking-wider uppercase font-semibold mt-0.5">
                  ERP SUITE
                </p>
              </div>
            )}
          </div>

          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-muted-steel p-1.5 rounded-xl hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex flex-col gap-1 px-3 flex-grow overflow-y-auto py-4">
          {!collapsed && (
            <span className="text-[10px] font-semibold tracking-wider text-muted-steel/70 uppercase px-3.5 mb-2 animate-fade-in block">
              {t('nav.mainMenu', 'القائمة الرئيسية')}
            </span>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                title={collapsed ? item.label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-label-md font-medium
                   transition-all duration-200 cursor-pointer btn-tactile
                   ${collapsed ? 'justify-center' : ''}
                   ${isActive
                    ? 'bg-accent text-on-primary shadow-sm font-semibold'
                    : 'text-on-surface-variant hover:bg-surface-container-high hover:text-charcoal-ink'
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.8} className="flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </div>

        {/* Sidebar Footer & System Controls */}
        <div className="mt-auto px-3 pb-5 space-y-1 border-t border-outline-variant/40 pt-3 bg-surface-container-lowest">
          {user?.role === 'super_admin' && (
            <NavLink
              to="/admin"
              onClick={() => setMobileOpen(false)}
              title={collapsed ? t('nav.admin') : undefined}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-label-md font-medium
                 transition-all duration-200 cursor-pointer btn-tactile
                 ${collapsed ? 'justify-center' : ''}
                 ${isActive
                  ? 'bg-accent text-on-primary shadow-sm'
                  : 'text-on-surface-variant hover:bg-surface-container-high'
                }`
              }
            >
              <Shield size={18} strokeWidth={1.8} className="flex-shrink-0" />
              {!collapsed && <span>{t('nav.admin')}</span>}
            </NavLink>
          )}
          <NavLink
            to="/settings"
            onClick={() => setMobileOpen(false)}
            title={collapsed ? t('nav.settings') : undefined}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-label-md font-medium
               transition-all duration-200 cursor-pointer btn-tactile
               ${collapsed ? 'justify-center' : ''}
               ${isActive
                ? 'bg-accent text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <Settings size={18} strokeWidth={1.8} className="flex-shrink-0" />
            {!collapsed && <span>{t('nav.settings')}</span>}
          </NavLink>

          <button
            onClick={handleLogout}
            title={collapsed ? t('nav.logout') : undefined}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-label-md font-medium
                       text-error/80 hover:bg-error-container/20 transition-all duration-200 cursor-pointer btn-tactile ${collapsed ? 'justify-center' : ''}`}
          >
            <LogOut size={18} strokeWidth={1.8} className="flex-shrink-0" />
            {!collapsed && <span>{t('nav.logout')}</span>}
          </button>

          {/* Built By Credit */}
          {!collapsed && (
            <div className="pt-2 animate-fade-in">
              <a
                href="https://amir-elrifai.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-muted-steel/60 hover:text-muted-steel hover:bg-surface-container-high transition-all duration-200 group"
              >
                <img src={myLogo} alt="Amir El-Rifai" className="w-4 h-4 object-contain opacity-50 group-hover:opacity-80 transition-opacity" />
                <span className="text-[11px] tracking-wide font-medium">{t('common.builtBy')} Amir El-Rifai</span>
              </a>
            </div>
          )}
        </div>
      </nav>

      {/* ── Main View Area (Full Screen Height, No Top Header Bar) ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        {isOffline && (
          <div className="bg-amber-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-sm animate-fade-in" dir="rtl">
            <WifiOff size={16} />
            <span>أنت حالياً غير متصل بالشبكة — البيانات المعروضة مأخوذة من الكاش المحلي.</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
          <Outlet />
        </main>

        {/* Footer Bar */}
        <footer className="flex-shrink-0 border-t border-outline-variant/30 bg-surface-container-lowest px-6 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-muted-steel/60 font-medium">
            ERB_SYSTEM &copy; {new Date().getFullYear()}
          </p>
          <a
            href="https://amir-elrifai.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 group"
          >
            <span className="text-[11px] text-muted-steel/50 group-hover:text-muted-steel/80 transition-colors">{t('common.builtBy')}</span>
            <img src={myLogo} alt="Amir El-Rifai" className="h-4 w-4 object-contain opacity-40 group-hover:opacity-75 transition-opacity" />
            <span className="text-[11px] font-semibold text-muted-steel/60 group-hover:text-accent transition-colors">Amir El-Rifai</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
