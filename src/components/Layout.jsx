import { useState, useMemo } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Package, Users, Truck, FileText, Settings,
  Search, Bell, HelpCircle, Menu, X, LogOut, Building2, ChevronDown, Globe,
} from 'lucide-react';
import myLogo from '../assets/my.png';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'ar' ? 'en' : 'ar';
    i18n.changeLanguage(newLang);
    localStorage.setItem('erp_lang', newLang);
  };

  const navItems = useMemo(() => [
    { path: '/dashboard', label: t('nav.dashboard'), icon: LayoutDashboard },
    { path: '/products', label: t('nav.products'), icon: Package },
    { path: '/customers', label: t('nav.customers'), icon: Users },
    { path: '/suppliers', label: t('nav.suppliers'), icon: Truck },
    { path: '/invoices', label: t('nav.invoices'), icon: FileText },
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
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-charcoal-ink/15 backdrop-blur-sm md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <nav
        className={`
          fixed md:static inset-y-0 left-0 rtl:right-0 rtl:left-auto z-50 flex flex-col h-screen w-[260px]
          border-r rtl:border-l rtl:border-r-0 border-outline-variant/60 bg-surface-container-lowest flex-shrink-0
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full md:translate-x-0 rtl:md:translate-x-0'}
        `}
      >
        <div className="px-5 pt-7 pb-5 flex justify-between items-start">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden ${user?.tenant?.logo_url ? 'bg-transparent' : 'bg-accent'}`}>
              {user?.tenant?.logo_url ? (
                <img src={user.tenant.logo_url} alt="Logo" className="w-full h-full object-contain" />
              ) : (
                <Building2 size={18} className="text-on-primary" strokeWidth={1.8} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-label-md text-on-surface font-semibold truncate leading-tight">
                {companyName}
              </h1>
              <p className="text-[11px] text-muted-steel tracking-wide uppercase mt-0.5">
                ERP Suite
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-on-surface-variant p-1.5 rounded-lg hover:bg-surface-container-high transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex flex-col gap-1 px-3 flex-grow mt-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-2.5 rounded-xl text-label-md
                   transition-all duration-200 cursor-pointer btn-tactile
                   ${isActive
                    ? 'bg-accent text-on-primary shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`
                }
              >
                <Icon size={18} strokeWidth={1.8} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </div>

        <div className="mt-auto px-3 pb-6 space-y-1">
          <div className="border-t border-outline-variant/50 pt-4 mb-1" />
          <NavLink
            to="/settings"
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 rounded-xl text-label-md
               transition-all duration-200 cursor-pointer btn-tactile
               ${isActive
                ? 'bg-accent text-on-primary shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container-high'
              }`
            }
          >
            <Settings size={18} strokeWidth={1.8} />
            <span>{t('nav.settings')}</span>
          </NavLink>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-label-md
                       text-error/80 hover:bg-error-container/30 transition-all duration-200 cursor-pointer btn-tactile"
          >
            <LogOut size={18} strokeWidth={1.8} />
            <span>{t('nav.logout')}</span>
          </button>
          {/* ── Built By Credit ── */}
          <a
            href="https://amir-elrifai.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-muted-steel/60 hover:text-muted-steel hover:bg-surface-container-high transition-all duration-200 group"
          >
            <img src={myLogo} alt="Amir El-Rifai" className="w-5 h-5 object-contain opacity-50 group-hover:opacity-80 transition-opacity" />
            <span className="text-[11px] tracking-wide">{t('common.builtBy')} Amir El-Rifai</span>
          </a>
        </div>
      </nav>

      <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
        <header className="w-full h-16 border-b border-outline-variant/50 bg-surface-container-lowest flex items-center justify-between px-6 flex-shrink-0 z-10">
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setMobileOpen(true)}
              className="text-on-surface p-2 cursor-pointer rounded-lg hover:bg-surface-container-high transition-colors btn-tactile"
            >
              <Menu size={22} />
            </button>
            <span className="text-label-md text-on-surface font-semibold truncate max-w-[140px]">
              {companyName}
            </span>
          </div>

          <div className="hidden md:block flex-1" />

          <div className="flex items-center gap-2">
            <div className="relative hidden sm:flex items-center">
              <Search className="absolute left-3 rtl:right-3 rtl:left-auto text-muted-steel pointer-events-none" size={16} />
              <input
                className="pl-9 pr-4 rtl:pr-9 rtl:pl-4 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl
                           text-sm text-on-surface placeholder:text-outline
                           focus:border-accent focus:ring-2 focus:ring-accent/10 focus:outline-none
                           transition-all duration-200 w-56"
                placeholder={t('common.search')}
                type="text"
              />
            </div>

            <button className="hidden sm:flex items-center justify-center w-9 h-9 text-muted-steel hover:text-accent hover:bg-accent-surface rounded-xl transition-all duration-200 cursor-pointer btn-tactile">
              <Bell size={18} />
            </button>
            <button className="hidden sm:flex items-center justify-center w-9 h-9 text-muted-steel hover:text-accent hover:bg-accent-surface rounded-xl transition-all duration-200 cursor-pointer btn-tactile">
              <HelpCircle size={18} />
            </button>

            {/* Language Switcher */}
            <button
              onClick={toggleLanguage}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-muted-steel hover:text-accent hover:bg-accent-surface rounded-xl transition-all duration-200 cursor-pointer btn-tactile"
              title="Change Language"
            >
              <Globe size={15} />
              <span>{i18n.language === 'ar' ? t('nav.english') : t('nav.arabic')}</span>
            </button>

            <div className="relative ml-1 rtl:mr-1 rtl:ml-0">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 pl-1 pr-2 py-1 rounded-xl hover:bg-surface-container-high transition-all duration-200 cursor-pointer btn-tactile"
              >
                <div className="w-9 h-9 rounded-xl bg-accent-surface overflow-hidden border border-accent-muted/40 flex-shrink-0">
                  <img
                    alt={displayName}
                    className="w-full h-full object-cover"
                    src={avatarUrl}
                  />
                </div>
                <div className="hidden lg:flex flex-col items-start min-w-0">
                  <span className="text-label-sm text-on-surface font-medium truncate max-w-[120px] leading-tight">
                    {displayName}
                  </span>
                  <span className="text-[11px] text-muted-steel capitalize leading-tight">
                    {displayRole}
                  </span>
                </div>
                <ChevronDown size={14} className="hidden lg:block text-muted-steel" />
              </button>

              {userMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserMenuOpen(false)} />
                  <div className="absolute right-0 rtl:left-0 rtl:right-auto top-full mt-1.5 w-56 z-50 animate-scale-in origin-top-right rtl:origin-top-left">
                    <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/60 shadow-whisper-lg py-1.5 overflow-hidden">
                      <div className="px-4 py-3 border-b border-outline-variant/40">
                        <p className="text-label-sm text-on-surface font-medium truncate">{displayName}</p>
                        <p className="text-[11px] text-muted-steel capitalize mt-0.5">{displayRole} • {companyName}</p>
                      </div>
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-label-sm text-error/80
                                   hover:bg-error-container/20 transition-colors cursor-pointer"
                      >
                        <LogOut size={15} strokeWidth={1.8} />
                        {t('common.signOut')}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 relative">
          <Outlet />
        </main>

        {/* ── App Footer Bar ── */}
        <footer className="flex-shrink-0 border-t border-outline-variant/30 bg-surface-container-lowest px-6 py-2.5 flex items-center justify-between">
          <p className="text-[11px] text-muted-steel/50">
            Doctor-M ERP &copy; {new Date().getFullYear()}
          </p>
          <a
            href="https://amir-elrifai.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 group"
          >
            <span className="text-[11px] text-muted-steel/40 group-hover:text-muted-steel/70 transition-colors">{t('common.builtBy')}</span>
            <img src={myLogo} alt="Amir El-Rifai" className="h-4 w-4 object-contain opacity-40 group-hover:opacity-70 transition-opacity" />
            <span className="text-[11px] font-medium text-muted-steel/50 group-hover:text-accent transition-colors">Amir El-Rifai</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
