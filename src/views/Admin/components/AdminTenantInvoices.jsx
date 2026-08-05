import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  FileText, Search, Filter, Edit, Trash2, ArrowUpRight, ArrowDownRight, Eye 
} from 'lucide-react';
// Shared with Invoices feature — imports EditInvoiceModal from views/Invoices/components
import api from '../../../services/api';
import EditInvoiceModal from '../../Invoices/components/EditInvoiceModal';

export default function AdminTenantInvoices({ tenantId }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // For Edit Modal
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    fetchInvoices();
  }, [tenantId]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      // using admin endpoint
      const data = await api.getAdminInvoices(tenantId);
      setInvoices(data);
    } catch (err) {
      setError(err.message || 'Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (invoiceId) => {
    if (!window.confirm(t('common.confirmDelete', 'Are you sure you want to delete this?'))) return;
    try {
      await api.deleteAdminInvoice(tenantId, invoiceId);
      setInvoices(invoices.filter(inv => inv.id !== invoiceId));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleEdit = (invoice) => {
    setSelectedInvoice(invoice);
    setIsEditModalOpen(true);
  };

  const handleSaveInvoice = async (invoiceId, updatedData) => {
    try {
      await api.updateAdminInvoice(tenantId, invoiceId, updatedData);
      setIsEditModalOpen(false);
      fetchInvoices();
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredInvoices = invoices.filter(inv => 
    inv.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inv.party?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/30 shadow-whisper">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 text-accent flex items-center justify-center">
            <FileText size={20} />
          </div>
          <h3 className="text-h4 font-bold">{t('nav.invoices')}</h3>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-muted-steel`} size={18} />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full sm:w-64 bg-surface-container-lowest border border-outline-variant rounded-xl py-2 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-body-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all`}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-body-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/40">
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Invoice #</th>
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Type</th>
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Party</th>
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Total</th>
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Date</th>
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan="6" className="py-8 text-center text-muted-steel text-body-sm">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              filteredInvoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-outline-variant/20 hover:bg-surface-container-highest/50 transition-colors">
                  <td className="py-3 px-4 text-body-sm font-medium">{invoice.invoice_number}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      invoice.invoice_type === 'sell' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                        : 'bg-rose-50 text-rose-600 border border-rose-100'
                    }`}>
                      {invoice.invoice_type === 'sell' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                      {invoice.invoice_type === 'sell' ? t('dashboard.sales') : t('dashboard.purchases')}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-body-sm">{invoice.party?.name || 'N/A'}</td>
                  <td className="py-3 px-4 text-body-sm font-semibold">{(invoice.total_amount || 0).toLocaleString()}</td>
                  <td className="py-3 px-4 text-body-sm text-muted-steel">
                    {new Date(invoice.date).toLocaleDateString()}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEdit(invoice)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(invoice.id)}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isEditModalOpen && selectedInvoice && (
        <EditInvoiceModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          invoice={selectedInvoice}
          onSave={(data) => handleSaveInvoice(selectedInvoice.id, data)}
        />
      )}
    </div>
  );
}
