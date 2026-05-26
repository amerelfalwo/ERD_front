import { useState, useMemo, useEffect } from 'react';
import { Outlet, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard, Package, Users, FileText, Settings,
  Search, Bell, HelpCircle, Menu, X, LogOut, Building2, ChevronDown,
} from 'lucide-react';
import myLogo from '../assets/my.png';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/products', labelKey: 'nav.products', icon: Package },
  { path: '/customers', labelKey: 'nav.customers', icon: Users },
  { path: '/suppliers', labelKey: 'nav.suppliers', icon: Users },
  { path: '/invoices', labelKey: 'nav.invoices', icon: FileText },
];

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user } = useAuth();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();

  useEffect(() => {
    document.documentElement.dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = i18n.language;
  }, [i18n.language]);

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
          fixed md:static inset-y-0 left-0 rtl:left-auto rtl:right-0 z-50 flex flex-col h-screen w-[260px]
          border-r rtl:border-r-0 rtl:border-l border-outline-variant/40 bg-surface-container-lowest flex-shrink-0
          transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] shadow-[4px_0_24px_rgba(0,0,0,0.02)]
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full rtl:translate-x-full md:translate-x-0 md:rtl:translate-x-0'}
        `}
      >
        {/* ── Brand / Logo ── */}
        <div className="px-6 pt-8 pb-6 flex justify-between items-start">
          <div className="flex items-center gap-3.5 min-w-0 flex-1">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm overflow-hidden border border-outline-variant/30 ${user?.tenant?.logo_url ? 'bg-transparent' : 'bg-gradient-to-br from-accent to-accent-hover'}`}>
              {user?.tenant?.logo_url ? (
                <img src={user.tenant.logo_url} alt="Logo" className="w-full h-full object-contain p-1" />
              ) : (
                <Building2 size={20} className="text-white" strokeWidth={1.5} />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-[15px] text-on-surface font-bold truncate leading-tight tracking-tight">
                {companyName}
              </h1>
              <p className="text-[11px] text-muted-steel tracking-widest font-medium uppercase mt-0.5">
                ERP Suite
              </p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden text-muted-steel hover:text-on-surface p-1.5 rounded-lg hover:bg-surface-container-low transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Navigation Menu ── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-none space-y-6">
          
          {/* Main Section */}
          <div>
            <h2 className="px-3 text-[11px] font-semibold text-muted-steel/70 uppercase tracking-wider mb-2">
              {t('nav.main', 'Main Menu')}
            </h2>
            <div className="flex flex-col gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileOpen(false)}
                    className={({ isActive }) =>
                      `group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[14px] font-medium
                       transition-all duration-200 cursor-pointer relative overflow-hidden
                       ${isActive
                        ? 'bg-accent/10 text-accent'
                        : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {isActive && (
                          <div className="absolute left-0 rtl:left-auto rtl:right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full rtl:rounded-l-full rtl:rounded-r-none" />
                        )}
                        <Icon 
                          size={18} 
                          strokeWidth={isActive ? 2.5 : 2} 
                          className={`transition-colors ${isActive ? 'text-accent' : 'text-muted-steel group-hover:text-accent/70'}`}
                        />
                        <span className="tracking-wide">{t(item.labelKey)}</span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>

          {/* System Section */}
          <div>
            <h2 className="px-3 text-[11px] font-semibold text-muted-steel/70 uppercase tracking-wider mb-2">
              {t('nav.system', 'System')}
            </h2>
            <div className="flex flex-col gap-1">
              <NavLink
                to="/settings"
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[14px] font-medium
                   transition-all duration-200 cursor-pointer relative overflow-hidden
                   ${isActive
                    ? 'bg-accent/10 text-accent'
                    : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && (
                      <div className="absolute left-0 rtl:left-auto rtl:right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent rounded-r-full rtl:rounded-l-full rtl:rounded-r-none" />
                    )}
                    <Settings 
                      size={18} 
                      strokeWidth={isActive ? 2.5 : 2} 
                      className={`transition-colors ${isActive ? 'text-accent' : 'text-muted-steel group-hover:text-accent/70'}`}
                    />
                    <span className="tracking-wide">{t('nav.settings')}</span>
                  </>
                )}
              </NavLink>
              
              <button
                onClick={handleLogout}
                className="group flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-[14px] font-medium
                           text-error/80 hover:bg-error/10 hover:text-error transition-all duration-200 cursor-pointer w-full text-left rtl:text-right"
              >
                <LogOut size={18} strokeWidth={2} className="text-error/60 group-hover:text-error transition-colors" />
                <span className="tracking-wide">{t('nav.logout')}</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── Sidebar Footer ── */}
        <div className="p-4 border-t border-outline-variant/30 bg-surface-container-lowest">
          <a
            href="https://amir-elrifai.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-steel/60 hover:text-on-surface hover:bg-surface-container-low transition-all duration-200 group"
          >
            <div className="w-6 h-6 rounded-md bg-surface-container-high flex items-center justify-center border border-outline-variant/30 group-hover:border-outline-variant/60 transition-colors">
              <img src={myLogo} alt="Amir El-Rifai" className="w-3.5 h-3.5 object-contain opacity-50 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-semibold tracking-widest uppercase text-muted-steel/50">{t('common.builtBy', 'Built by')}</span>
              <span className="text-[12px] font-medium tracking-wide">Amir El-Rifai</span>
            </div>
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
              <Search className="absolute left-3 rtl:left-auto rtl:right-3 text-muted-steel pointer-events-none" size={16} />
              <input
                className="pl-9 pr-4 rtl:pl-4 rtl:pr-9 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl
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

            <button
              onClick={() => i18n.changeLanguage(i18n.language === 'ar' ? 'en' : 'ar')}
              className="flex items-center justify-center px-3 h-9 text-label-sm font-semibold text-muted-steel hover:text-accent hover:bg-accent-surface rounded-xl transition-all duration-200 cursor-pointer btn-tactile"
            >
              <span className="font-sans">{i18n.language === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            <div className="relative ml-1">
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
                  <div className="absolute right-0 rtl:right-auto rtl:left-0 top-full mt-1.5 w-56 z-50 animate-scale-in origin-top-right rtl:origin-top-left">
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
            <span className="text-[11px] text-muted-steel/40 group-hover:text-muted-steel/70 transition-colors">Built by</span>
            <img src={myLogo} alt="Amir El-Rifai" className="h-4 w-4 object-contain opacity-40 group-hover:opacity-70 transition-opacity" />
            <span className="text-[11px] font-medium text-muted-steel/50 group-hover:text-accent transition-colors">Amir El-Rifai</span>
          </a>
        </footer>
      </div>
    </div>
  );
}
