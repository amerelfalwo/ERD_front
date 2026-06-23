import { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Loader2, CheckCircle, FileText, Server, ImageIcon, Upload } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { notifyError, notifySuccess } from '../utils/notify';
import { getLogoUrl } from '../utils/url';

const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

export default function SettingsView() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ company_name: '', phone: '', address: '', tax_number: '', default_invoice_footer: '' });
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingLogo, setSavingLogo] = useState(false);
  const [showSaved, setShowSaved] = useState(false);
  const { updateTenantContext } = useAuth();

  useEffect(() => {
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
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  async function handleSaveSettings() {
    setSaving(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API_BASE_URL}/tenants/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(formData),
      });
      
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || t('settings.saveFailed'));
      }
      
      const updated = await res.json();
      setFormData({
        company_name: updated.company_name || updated.store_name || '',
        phone: updated.phone || '',
        address: updated.address || '',
        tax_number: updated.tax_number || '',
        default_invoice_footer: updated.default_footer_text || updated.print_notes || ''
      });
      updateTenantContext({
        company_name: updated.company_name || updated.store_name || '',
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

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200";

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        {[1,2,3,4].map(i => <div key={i} className="h-16 rounded-xl animate-shimmer" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-h1 text-charcoal-ink">{t('settings.title')}</h2>
          <p className="text-body-base text-muted-steel mt-1">{t('settings.description')}</p>
        </div>
        <button onClick={handleSaveSettings} disabled={saving}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
          {saving ? <Loader2 size={16} className="animate-spin" /> : showSaved ? <CheckCircle size={16} /> : <Save size={16} />}
          {showSaved ? t('settings.saved') : t('settings.save')}
        </button>
      </div>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up stagger-1">
        <div className="p-6 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-surface text-accent"><SettingsIcon size={18} /></div>
            <h3 className="text-h3 text-charcoal-ink">{t('settings.storeInfo')}</h3>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('settings.storeName')}</label>
            <input value={formData.company_name} onChange={(e) => setFormData({ ...formData, company_name: e.target.value })} placeholder={t('settings.storeNamePlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('settings.phone')}</label>
            <input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder={t('settings.phonePlaceholder')} className={inputClass} />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('settings.address')}</label>
            <input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} placeholder={t('settings.addressPlaceholder')} className={inputClass} />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('settings.taxNumber')}</label>
            <input value={formData.tax_number} onChange={(e) => setFormData({ ...formData, tax_number: e.target.value })} placeholder={t('settings.taxNumberPlaceholder')} className={inputClass} />
          </div>
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up stagger-1">
        <div className="p-6 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-surface text-accent"><ImageIcon size={18} /></div>
            <div>
              <h3 className="text-h3 text-charcoal-ink">{t('settings.brandIdentity')}</h3>
              <p className="text-body-sm text-muted-steel mt-1">{t('settings.uploadLogoDesc')}</p>
            </div>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-2xl border border-outline-variant/40 bg-white flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={getLogoUrl(logoUrl)} alt="Logo Preview" className="w-full h-full object-contain" />
              ) : (
                <span className="text-xs text-muted-steel">{t('settings.noLogo')}</span>
              )}
            </div>
            <div className="flex-1">
              <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('settings.uploadLogo')}</label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                className={inputClass}
              />
              <p className="text-xs text-muted-steel mt-2">{t('settings.logoHint')}</p>
            </div>
          </div>
          <button
            onClick={handleUploadLogo}
            disabled={savingLogo || !logoFile}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 transition-all shadow-sm cursor-pointer btn-tactile"
          >
            {savingLogo ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {t('settings.uploadLogo')}
          </button>
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up stagger-2">
        <div className="p-6 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-surface text-accent"><FileText size={18} /></div>
            <h3 className="text-h3 text-charcoal-ink">{t('settings.printNotes')}</h3>
          </div>
        </div>
        <div className="p-6">
          <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('settings.defaultInvoiceFooter')}</label>
          <textarea value={formData.default_invoice_footer} onChange={(e) => setFormData({ ...formData, default_invoice_footer: e.target.value })} placeholder={t('settings.defaultInvoiceFooterPlaceholder')} rows={4}
            className={`${inputClass} resize-none`}
          />
        </div>
      </section>

      <section className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up stagger-3">
        <div className="p-6 border-b border-outline-variant/30">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-accent-surface text-accent"><Server size={18} /></div>
            <h3 className="text-h3 text-charcoal-ink">{t('settings.system')}</h3>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[
            { label: t('settings.version'), value: '2.1.0' },
            { label: t('settings.backend'), value: 'FastAPI' },
            { label: t('settings.database'), value: 'SQLite' },
          ].map((info) => (
            <div key={info.label} className="bg-surface-container-low/50 rounded-xl p-4">
              <p className="text-label-sm text-muted-steel uppercase tracking-wider mb-1">{info.label}</p>
              <p className="text-label-md font-mono-tabular text-charcoal-ink">{info.value}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
