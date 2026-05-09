import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, CreditCard, AlertCircle,
  Package, Printer, X, Loader2, Edit, Trash2, Undo2, TrendingUp, Download
} from 'lucide-react';
import api from '../services/api';
import InvoicePrintTemplate from '../components/InvoicePrintTemplate';
import EditInvoiceModal from '../components/EditInvoiceModal';
import ReturnInvoiceModal from '../components/ReturnInvoiceModal';
import { useAuth } from '../context/AuthContext';



export default function PartyDashboard() {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [bulkInvoicesToPrint, setBulkInvoicesToPrint] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [paperSize, setPaperSize] = useState('a4');

  const { user } = useAuth();
  const tenantName = user?.tenant?.company_name || 'ERP Dashboard';
  const defaultFooterText = user?.tenant?.default_footer_text || user?.tenant?.print_notes || null;
  const logoUrl = user?.tenant?.logo_url || null;
  const taxNumber = user?.tenant?.tax_number || null;
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadSummary = () => {
    setLoading(true);
    api.getPartySummary(partyId)
      .then(setSummary)
      .catch(() => navigate('/parties'))
      .finally(() => setLoading(false));
  };


  useEffect(() => {
    loadSummary();
  }, [partyId, navigate]);

  async function handleDeleteInvoice(invoiceId) {
    try {
      await api.deleteInvoice(invoiceId);
      setInvoiceToDelete(null);
      loadSummary();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete invoice');
    }
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleBulkPrint() {
    if (!summary) return;
    const selected = summary.invoices.filter(inv => selectedIds.has(inv.id));
    if (selected.length === 0) return;
    setBulkInvoicesToPrint(selected);
  }

  function handleClosePrint() {
    setInvoiceToPrint(null);
    setBulkInvoicesToPrint([]);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!summary) return null;

  const { party, financials, invoices, products } = summary;

  const totalProfit = Number(financials.total_profit || 0);

  const kpis = [
    { label: 'Total Invoiced', value: `EGP ${Number(financials.total_invoiced).toLocaleString()}`, icon: DollarSign, color: 'text-accent bg-accent-surface' },
    { label: 'Total Paid', value: `EGP ${Number(financials.total_paid).toLocaleString()}`, icon: CreditCard, color: 'text-emerald-600 bg-emerald-50' },
    { label: 'Outstanding', value: `EGP ${Number(financials.balance).toLocaleString()}`, icon: AlertCircle, color: financials.balance > 0 ? 'text-error bg-error-container/30' : 'text-accent bg-accent-surface' },
    { label: 'Total Profit', value: `EGP ${totalProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, icon: TrendingUp, color: totalProfit >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-error bg-error-container/30' },
    { label: 'Total Invoices', value: invoices.length, icon: Package, color: 'text-indigo-600 bg-indigo-50' },
  ];

  return (
    <>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/parties')}
            className="p-2 rounded-xl text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-h1 text-charcoal-ink">{party.name}</h1>
            <p className="text-label-sm text-muted-steel capitalize">{party.party_type}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {kpis.map((kpi, idx) => (
            <div key={idx} className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-5 shadow-whisper animate-fade-in-up" style={{ animationDelay: `${idx * 60}ms` }}>
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${kpi.color}`}>
                  <kpi.icon size={18} />
                </div>
                <span className="text-label-sm text-muted-steel">{kpi.label}</span>
              </div>
              <p className="text-h2 text-charcoal-ink font-mono-tabular">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up">
          <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
            <h3 className="text-h3 text-charcoal-ink">Invoices</h3>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkPrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 transition-all shadow-sm cursor-pointer btn-tactile">
                <Printer size={16} /> Print Selected ({selectedIds.size})
              </button>
            )}
          </div>
          {invoices.length === 0 ? (
            <p className="p-6 text-muted-steel text-sm">No invoices found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-3 px-4 text-left w-10"></th>
                    <th className="py-3 px-4 text-left">ID</th>
                    <th className="py-3 px-4 text-left">Type</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-right">Profit</th>
                    <th className="py-3 px-4 text-right">Paid</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-4">
                        <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                          className="w-4 h-4 rounded border-outline-variant/60 text-accent focus:ring-accent/20 cursor-pointer" />
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-charcoal-ink">#{String(inv.id).padStart(5, '0')}</td>
                      <td className="py-3 px-4 capitalize text-muted-steel">{inv.invoice_type}</td>
                      <td className="py-3 px-4 text-right font-mono-tabular">EGP {Number(inv.total_amount).toLocaleString()}</td>
                      <td className="py-3 px-4 text-right font-mono-tabular">
                        {inv.invoice_profit != null && inv.invoice_profit !== 0 ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${Number(inv.invoice_profit) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                            {Number(inv.invoice_profit) > 0 ? '+' : ''}{Number(inv.invoice_profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        ) : (
                          <span className="text-muted-steel text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right font-mono-tabular text-emerald-600">EGP {Number(inv.paid_amount).toLocaleString()}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg ${inv.status === 'paid' ? 'bg-accent-surface text-accent' : inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-error-container/30 text-error'}`}>{inv.status}</span>
                      </td>
                      <td className="py-3 px-4 font-mono-tabular text-muted-steel text-xs">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {['sale', 'purchase'].includes(inv.invoice_type) && (
                            <button onClick={() => setReturnInvoice(inv)}
                              className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile"
                              title="Return">
                              <Undo2 size={16} />
                            </button>
                          )}
                          <button onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile">
                            <Edit size={16} />
                          </button>
                          <button onClick={() => setInvoiceToPrint(inv)}
                            className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile">
                            <Printer size={16} />
                          </button>
                          <button onClick={() => setInvoiceToDelete(inv)}
                            className="p-1.5 rounded-xl text-muted-steel hover:bg-error-container/30 hover:text-error transition-all cursor-pointer btn-tactile">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {products.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up">
            <div className="p-6 border-b border-outline-variant/30">
              <h3 className="text-h3 text-charcoal-ink">Product Inventory</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-3 px-6 text-left">Product</th>
                    <th className="py-3 px-6 text-right">Stock</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => (
                    <tr key={prod.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-6 text-charcoal-ink font-medium">{prod.name}</td>
                      <td className="py-3 px-6 text-right font-mono-tabular">
                        <span className={prod.remaining_stock <= 0 ? 'text-error' : 'text-charcoal-ink'}>{prod.remaining_stock}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {invoiceToPrint && (
        <>
          <div className="print:hidden fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-lowest border-b border-outline-variant/60 flex-shrink-0">
              <h3 className="text-label-md text-charcoal-ink font-semibold">Print Preview — #{String(invoiceToPrint.id).padStart(5, '0')}</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleClosePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"><X size={16} /> Cancel</button>
                <button
                  onClick={async () => {
                    setDownloadingPdf(true);
                    try {
                      const el = document.getElementById('invoice-print-area');
                      if (!el) return;
                      if (!window.html2pdf) {
                        await new Promise((resolve, reject) => {
                          const s = document.createElement('script');
                          s.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.2/html2pdf.bundle.min.js';
                          s.onload = resolve; s.onerror = reject;
                          document.head.appendChild(s);
                        });
                      }
                      await window.html2pdf().set({
                        margin: 0,
                        filename: `invoice-${String(invoiceToPrint.id).padStart(5, '0')}.pdf`,
                        image: { type: 'jpeg', quality: 0.98 },
                        html2canvas: { scale: 2, useCORS: true },
                        jsPDF: { unit: 'mm', format: paperSize === 'a5' ? 'a5' : 'a4', orientation: 'portrait' },
                      }).from(el).save();
                    } catch (err) {
                      console.error('PDF error:', err);
                      alert('Error downloading PDF. Use Print → Save as PDF instead.');
                    } finally { setDownloadingPdf(false); }
                  }}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Save PDF
                </button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile"><Printer size={16} /> Print</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-8 flex justify-center">
              <div className="shadow-2xl rounded-xl overflow-hidden border border-outline-variant/30 self-start">
                <InvoicePrintTemplate invoice={invoiceToPrint} tenantName={tenantName} partyName={party.name} partyPhone={party.phone} partyAddress={party.address} logoUrl={logoUrl} defaultFooterText={defaultFooterText} taxNumber={taxNumber} paperSize={paperSize} />
              </div>
            </div>
          </div>
          <div className="hidden print:block fixed inset-0 z-[200] bg-white">
            <InvoicePrintTemplate invoice={invoiceToPrint} tenantName={tenantName} partyName={party.name} partyPhone={party.phone} partyAddress={party.address} logoUrl={logoUrl} defaultFooterText={defaultFooterText} taxNumber={taxNumber} paperSize={paperSize} />
          </div>
        </>
      )}

      {bulkInvoicesToPrint.length > 0 && (
        <>
          <div className="print:hidden fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-lowest border-b border-outline-variant/60 flex-shrink-0">
              <h3 className="text-label-md text-charcoal-ink font-semibold">Bulk Print — {bulkInvoicesToPrint.length} invoices</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleClosePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"><X size={16} /> Cancel</button>
                <button onClick={() => window.print()} className="flex items-center gap-2 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile"><Printer size={16} /> Print All</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-8 flex flex-col items-center gap-8">
              {bulkInvoicesToPrint.map((inv) => (
                <div key={inv.id} className="shadow-2xl rounded-xl overflow-hidden border border-outline-variant/30">
                  <InvoicePrintTemplate invoice={inv} tenantName={tenantName} partyName={party.name} partyPhone={party.phone} partyAddress={party.address} logoUrl={logoUrl} defaultFooterText={defaultFooterText} taxNumber={taxNumber} paperSize={paperSize} />
                </div>
              ))}
            </div>
          </div>
          <div className="hidden print:block fixed inset-0 z-[200] bg-white">
            {bulkInvoicesToPrint.map((inv) => (
              <InvoicePrintTemplate key={inv.id} invoice={inv} tenantName={tenantName} partyName={party.name} partyPhone={party.phone} partyAddress={party.address} logoUrl={logoUrl} defaultFooterText={defaultFooterText} taxNumber={taxNumber} paperSize={paperSize} />
            ))}
          </div>
        </>
      )}

      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          paperSize={paperSize}
          onPaperSizeChange={setPaperSize}
          onPrint={setInvoiceToPrint}
          onClose={() => setEditingInvoice(null)}
          onSaved={() => {
            setEditingInvoice(null);
            loadSummary();
          }}
        />
      )}

      {returnInvoice && (
        <ReturnInvoiceModal
          invoice={returnInvoice}
          onClose={() => setReturnInvoice(null)}
          onSaved={() => {
            setReturnInvoice(null);
            loadSummary();
          }}
        />
      )}

      {invoiceToDelete && (
        <div className="fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-error-container/30 text-error flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-h3 text-charcoal-ink mb-2">Delete Invoice</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6">
                Are you sure you want to delete Invoice #{String(invoiceToDelete.id).padStart(5, '0')}? This action cannot be undone. Associated stock will be adjusted accordingly.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setInvoiceToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteInvoice(invoiceToDelete.id)}
                  className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile"
                >
                  Confirm Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
