import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Loader2, CheckCircle, FileText, Server, ImageIcon, Upload, Image as ImageIconDefault } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { notifyError, notifySuccess } from '../utils/notify';
import { getLogoUrl } from '../utils/url';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

export default function SettingsView() {
  const { t } = useTranslation();
  const { user, updateTenantContext } = useAuth();
  
  // Initialize from context to prevent emptying data on reload
  const tnt = user?.tenant || {};
  const [formData, setFormData] = useState({ 
    company_name: tnt.company_name || tnt.store_name || '', 
    phone: tnt.phone || '', 
    address: tnt.address || '', 
    tax_number: tnt.tax_number || '', 
    default_invoice_footer: tnt.default_footer_text || tnt.print_notes || '' 
  });
  
  const [logoUrl, setLogoUrl] = useState(tnt.logo_url || '');
  const [logoFile, setLogoFile] = useState(null);
  
  // Only show loading if we don't have initial data
  const [loading, setLoading] = useState(!user?.tenant);
  const [saving, setSaving] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const [error, setError] = useState(null);

  const fetchTenant = () => {
    if (!user?.tenant) setLoading(true);
    setError(null);
    api.getMyTenant()
      .then((t) => { 
        setFormData({
          company_name: t.company_name || t.store_name || '',
          phone: t.phone || '',
          address: t.address || '',
          tax_number: t.tax_number || '',
          default_invoice_footer: t.default_footer_text || t.print_notes || ''
        });
        setLogoUrl(t.logo_url || ''); 
      })
      .catch((err) => {
        console.error(err);
        if (!user?.tenant) {
          setError(err.message || t('settings.fetchError') || 'Failed to load settings');
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let isMounted = true;
    
    // Fetch latest in background
    api.getMyTenant()
      .then((t) => { 
        if (!isMounted) return;
        setFormData({
          company_name: t.company_name || t.store_name || '',
          phone: t.phone || '',
          address: t.address || '',
          tax_number: t.tax_number || '',
          default_invoice_footer: t.default_footer_text || t.print_notes || ''
        });
        setLogoUrl(t.logo_url || ''); 
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to refresh tenant data:", err);
        if (!user?.tenant) {
          setError(err.message || t('settings.fetchError') || 'Failed to load settings');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user?.tenant]);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const payload = {
        company_name: formData.company_name,
        phone: formData.phone,
        address: formData.address,
        tax_number: formData.tax_number,
        default_footer_text: formData.default_invoice_footer
      };
      
      const updated = await api.updateSettings(payload);
      
      setFormData({
        company_name: updated.company_name || updated.store_name || '',
        phone: updated.phone || '',
        address: updated.address || '',
        tax_number: updated.tax_number || '',
        default_invoice_footer: updated.default_footer_text || updated.print_notes || ''
      });
      updateTenantContext({
        company_name: updated.company_name || updated.store_name || '',
        phone: updated.phone || '',
        address: updated.address || '',
        tax_number: updated.tax_number || '',
        default_footer_text: updated.default_footer_text || updated.print_notes || null,
      });
      setShowSaved(true);
      notifySuccess(t('settings.saveSuccess'));
      setTimeout(() => setShowSaved(false), 2500);
    } catch (err) { notifyError(err); }
    finally { setSaving(false); }
  }

  async function handleUploadLogo() {
    if (!logoFile) return;
    setSavingLogo(true);
    try {
      const formData = new FormData();
      formData.append('file', logoFile);
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/tenants/upload-logo`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || t('settings.uploadFailed'));
      }
      const updatedTenant = await res.json();
      setLogoUrl(updatedTenant.logo_url || '');
      setLogoFile(null);
      updateTenantContext({ logo_url: updatedTenant.logo_url });
      
      setShowSaved(true);
      notifySuccess(t('settings.uploadSuccess'));
      setTimeout(() => setShowSaved(false), 2500);
    } catch (err) { notifyError(err); }
    finally { setSavingLogo(false); }
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-body-base text-charcoal-ink placeholder:text-muted-steel/60 focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200";

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl bg-surface-container-lowest border border-outline-variant/40 animate-shimmer" />)}
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-8 p-6 bg-error-container border border-error/20 rounded-2xl text-center animate-fade-in-up shadow-whisper">
        <h3 className="text-error font-semibold mb-2 text-h3">{t('common.error') || 'Error'}</h3>
        <p className="text-error/80 text-body-base mb-6">{error}</p>
        <button 
          onClick={fetchTenant}
          className="px-5 py-2.5 bg-error text-white hover:bg-error/90 rounded-xl transition-colors text-label-md cursor-pointer shadow-sm"
        >
          {t('common.retry') || 'Retry'}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
        <div>
          <h1 className="text-h1 text-charcoal-ink tracking-tight">{t('settings.title')}</h1>
          <p className="text-body-base text-muted-steel mt-1.5">{t('settings.description')}</p>
        </div>
        <button onClick={handleSaveSettings} disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
          {saving ? <Loader2 size={18} strokeWidth={1.8} className="animate-spin" /> : showSaved ? <CheckCircle size={18} strokeWidth={1.8} /> : <Save size={18} strokeWidth={1.8} />}
          {showSaved ? t('settings.saved') : t('settings.save')}
        </button>
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up stagger-1">
        <div className="p-6 border-b border-outline-variant/30 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-surface text-accent"><SettingsIcon size={20} strokeWidth={1.8} /></div>
          <h3 className="text-h3 text-charcoal-ink">{t('settings.storeInfo')}</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-label-sm text-charcoal-ink mb-2 font-medium">{t('settings.storeName')}</label>
            <input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder={t('settings.storeNamePlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="block text-label-sm text-charcoal-ink mb-2 font-medium">{t('settings.phone')}</label>
            <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder={t('settings.phonePlaceholder')} className={`${inputClass} font-mono-tabular`} dir="ltr" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-label-sm text-charcoal-ink mb-2 font-medium">{t('settings.address')}</label>
            <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t('settings.addressPlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="block text-label-sm text-charcoal-ink mb-2 font-medium">{t('settings.taxNumber')}</label>
            <input value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} placeholder={t('settings.taxNumberPlaceholder')} className={`${inputClass} font-mono-tabular`} dir="ltr" />
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up stagger-2">
        <div className="p-6 border-b border-outline-variant/30 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-surface text-accent"><ImageIcon size={20} strokeWidth={1.8} /></div>
          <div>
            <h3 className="text-h3 text-charcoal-ink">{t('settings.brandIdentity')}</h3>
            <p className="text-body-sm text-muted-steel mt-0.5">{t('settings.uploadLogoDesc')}</p>
          </div>
        </div>
        <div className="p-6 flex flex-col md:flex-row items-start md:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl border border-outline-variant/60 bg-surface-container-low flex items-center justify-center overflow-hidden shadow-sm shrink-0">
            {logoUrl ? (
              <img src={getLogoUrl(logoUrl)} alt="Logo Preview" className="w-full h-full object-contain p-2" />
            ) : (
              <div className="flex flex-col items-center text-muted-steel/60">
                <ImageIconDefault size={24} strokeWidth={1.5} className="mb-1" />
                <span className="text-[10px] uppercase tracking-wider">{t('settings.noLogo')}</span>
              </div>
            )}
          </div>
          <div className="flex-1 w-full space-y-4">
            <div>
              <label className="block text-label-sm text-charcoal-ink mb-2 font-medium">{t('settings.uploadLogo')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className="block w-full text-sm text-muted-steel file:me-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-surface-container-high file:text-charcoal-ink hover:file:bg-outline-variant/30 transition-colors file:cursor-pointer"
              />
              <p className="text-body-sm text-muted-steel mt-2">{t('settings.logoHint')}</p>
            </div>
            <button
              onClick={handleUploadLogo}
              disabled={savingLogo || !logoFile}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md border border-outline-variant/60 bg-surface-container-lowest hover:bg-surface-container-low text-charcoal-ink disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm cursor-pointer btn-tactile w-fit"
            >
              {savingLogo ? <Loader2 size={18} strokeWidth={1.8} className="animate-spin text-accent" /> : <Upload size={18} strokeWidth={1.8} className="text-muted-steel" />}
              {t('settings.uploadLogo')}
            </button>
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up stagger-3">
        <div className="p-6 border-b border-outline-variant/30 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-surface text-accent"><FileText size={20} strokeWidth={1.8} /></div>
          <h3 className="text-h3 text-charcoal-ink">{t('settings.printNotes')}</h3>
        </div>
        <div className="p-6">
          <label className="block text-label-sm text-charcoal-ink mb-2 font-medium">{t('settings.defaultInvoiceFooter')}</label>
          <textarea value={formData.default_invoice_footer} onChange={(e) => setFormData({ ...formData, default_invoice_footer: e.target.value })} placeholder={t('settings.defaultInvoiceFooterPlaceholder')} rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up stagger-4">
        <div className="p-6 border-b border-outline-variant/30 flex items-center gap-3">
          <div className="p-2 rounded-lg bg-accent-surface text-accent"><Server size={20} strokeWidth={1.8} /></div>
          <h3 className="text-h3 text-charcoal-ink">{t('settings.system')}</h3>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { label: t('settings.version'), value: '2.1.0' },
            { label: t('settings.backend'), value: 'FastAPI' },
            { label: t('settings.database'), value: 'SQLite' },
          ].map((info) => (
            <div key={info.label} className="bg-surface-container-low/50 rounded-xl p-4 border border-outline-variant/30">
              <p className="text-body-sm text-muted-steel mb-1.5">{info.label}</p>
              <p className="text-label-md font-mono-tabular text-charcoal-ink">{info.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

