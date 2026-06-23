import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, CreditCard, AlertCircle, CheckCircle2,
  Package, Printer, X, Loader2, Edit, Trash2, Undo2, TrendingUp, Download, Plus,
  ChevronDown, ChevronRight, RotateCcw
} from 'lucide-react';
import api from '../services/api';
import { notifications } from '@mantine/notifications';
import InvoicePrintTemplate from '../components/InvoicePrintTemplate';
import InlineInvoiceEditor from '../components/InlineInvoiceEditor';
import ReturnInvoiceModal from '../components/ReturnInvoiceModal';
import SupplierReturnProductModal from '../components/SupplierReturnProductModal';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';



export default function PartyDashboard() {
  const { partyId } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isCustomer = pathname.includes('/customers');
  const backPath = isCustomer ? '/customers' : '/suppliers';
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [bulkInvoicesToPrint, setBulkInvoicesToPrint] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [paperSize, setPaperSize] = useState('a4');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [isTotalExpanded, setIsTotalExpanded] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [paymentActionLoading, setPaymentActionLoading] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [productToReturn, setProductToReturn] = useState(null);

  const toggleRow = useCallback((id) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const { user } = useAuth();
  const tenantName = user?.tenant?.company_name || 'ERP Dashboard';
  const defaultFooterText = user?.tenant?.default_footer_text || user?.tenant?.print_notes || null;
  const logoUrl = user?.tenant?.logo_url || null;
  const taxNumber = user?.tenant?.tax_number || null;
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const invoicePrintRef = useRef(null);

  const loadSummary = useCallback(() => {
    setLoading(true);
    const fetchFn = isCustomer ? api.getCustomerSummary : api.getSupplierSummary;
    fetchFn(partyId)
      .then(data => {
        // Normalize: backend returns { customer: {...} } or { supplier: {...} }
        const party = data.party || data.customer || data.supplier;
        setSummary({ ...data, party });
      })
      .catch((err) => {
        console.error("Dashboard Load Error:", err);
        notifications.show({ title: 'Error', message: err?.message || 'Failed to load dashboard data.', color: 'red' });
        // navigate(backPath);
      })
      .finally(() => setLoading(false));
  }, [partyId, isCustomer]);


  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  const handleRecordPayment = useCallback(async () => {
    setPaymentError('');
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Enter a valid amount.');
      return;
    }
    const balance = Number(summary?.financials?.balance || 0);
    if (amt > Math.abs(balance)) {
      setPaymentError('Amount cannot exceed outstanding balance.');
      return;
    }
    setPaymentSubmitting(true);
    try {
      const payFn = isCustomer ? api.createCustomerPayment : api.createSupplierPayment;
      const amount_paid = balance < 0 ? -amt : amt;
      await payFn(partyId, { amount_paid });
      setToastMessage(t('partyDashboard.paymentRecorded'));
      setTimeout(() => setToastMessage(''), 3000);
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      loadSummary();
    } catch (err) {
      setPaymentError(err.response?.data?.detail || 'Failed to record payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  }, [paymentAmount, summary?.financials?.balance, isCustomer, partyId, t, loadSummary]);

  const handleUpdatePayment = useCallback(async (paymentId) => {
    const amt = Number(editPaymentAmount);
    if (!amt || amt <= 0) return;
    setPaymentActionLoading(paymentId);
    try {
      const updateFn = isCustomer ? api.updateCustomerPayment : api.updateSupplierPayment;
      await updateFn(partyId, paymentId, { amount: amt });
      setEditingPaymentId(null);
      setEditPaymentAmount('');
      setToastMessage(t('partyDashboard.paymentUpdated'));
      setTimeout(() => setToastMessage(''), 3000);
      loadSummary();
    } catch (err) {
      notifications.show({ title: 'Error', message: err?.message || 'Failed to update payment.', color: 'red' });
    } finally {
      setPaymentActionLoading(null);
    }
  }, [editPaymentAmount, isCustomer, partyId, t, loadSummary]);

  const handleDeletePayment = useCallback(async (paymentId) => {
    setPaymentActionLoading(paymentId);
    try {
      const deleteFn = isCustomer ? api.deleteCustomerPayment : api.deleteSupplierPayment;
      await deleteFn(partyId, paymentId);
      setPaymentToDelete(null);
      setToastMessage(t('partyDashboard.paymentDeleted'));
      setTimeout(() => setToastMessage(''), 3000);
      loadSummary();
    } catch (err) {
      notifications.show({ title: 'Error', message: err?.message || 'Failed to delete payment.', color: 'red' });
    } finally {
      setPaymentActionLoading(null);
    }
  }, [isCustomer, partyId, t, loadSummary]);



  const handleDeleteInvoice = useCallback(async (invoiceId) => {
    try {
      await api.deleteInvoice(invoiceId);
      setInvoiceToDelete(null);
      loadSummary();
    } catch (err) {
      notifications.show({ title: 'Error', message: err?.message || 'Failed to delete invoice', color: 'red' });
    }
  }, [loadSummary]);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkPrint = useCallback(() => {
    if (!summary) return;
    const selected = summary.invoices.filter(inv => selectedIds.has(inv.id));
    if (selected.length === 0) return;
    setBulkInvoicesToPrint(selected);
  }, [summary, selectedIds]);

  const handleClosePrint = useCallback(() => {
    setInvoiceToPrint(null);
    setBulkInvoicesToPrint([]);
  }, []);

  const handleConfirmPrint = useCallback(() => {
    document.body.classList.add('printing');
    setTimeout(() => {
      window.print();
      document.body.classList.remove('printing');
    }, 100);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={28} className="animate-spin text-accent" />
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <p className="text-muted-steel">{t('partyDashboard.couldNotLoad', 'Could not load data.')}</p>
        <button 
          onClick={() => navigate(backPath)}
          className="text-accent font-medium hover:underline flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          {t('common.goBack', 'Go Back')}
        </button>
      </div>
    );
  }

  const { party, financials, invoices, products } = summary;

  const fmt = useCallback((n) => `EGP ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`, []);
  const balance = useMemo(() => Number(financials.balance || 0), [financials.balance]);
  const totalBeforePayments = useMemo(() => Number(financials.initial_balance || 0) + Number(financials.total_purchases || 0) - Number(financials.total_returns || 0), [financials.initial_balance, financials.total_purchases, financials.total_returns]);

  return (
    <>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(backPath)}
              className="p-2 rounded-xl text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-h1 text-charcoal-ink">{party.name}</h1>
              <p className="text-label-sm text-muted-steel capitalize">{party.party_type}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">

            {balance > 0 && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile"
              >
                <Plus size={18} />
                {t('partyDashboard.recordPayment')}
              </button>
            )}
          </div>
        </div>

        {/* ── 3-Card Financial Summary ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
          
          {/* Card 1: Total Before Payments */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper p-6 flex flex-col justify-start">
            <div 
              className="flex items-center justify-between cursor-pointer group"
              onClick={() => setIsTotalExpanded(!isTotalExpanded)}
            >
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package size={20} className="text-muted-steel" />
                  <span className="text-sm font-medium text-charcoal-ink/70">{t('partyDashboard.totalAmount')}</span>
                </div>
                <p className="text-3xl font-bold font-mono-tabular tracking-tight text-charcoal-ink">
                  {fmt(totalBeforePayments)}
                </p>
              </div>
              <div className="p-2 rounded-full bg-surface-container-low group-hover:bg-surface-container transition-colors">
                {isTotalExpanded ? <ChevronDown size={20} className="text-charcoal-ink" /> : <ChevronRight size={20} className="text-charcoal-ink" />}
              </div>
            </div>
            
            {isTotalExpanded && (
              <div className="mt-6 pt-6 border-t border-outline-variant/30 space-y-4 animate-fade-in-up">
                {Number(financials.initial_balance || 0) > 0 && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-steel">{t('partyDashboard.initialBalance')}</span>
                    <span className="font-mono-tabular font-medium text-amber-600">{fmt(financials.initial_balance)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-steel">{t('partyDashboard.totalPurchases')} <span className="text-charcoal-ink/30 ml-1">(+)</span></span>
                  <span className="font-mono-tabular font-medium text-charcoal-ink">{fmt(financials.total_purchases)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-steel">{t('partyDashboard.totalReturns')} <span className="text-indigo-400 ml-1">(−)</span></span>
                  <span className="font-mono-tabular font-medium text-indigo-500">{fmt(financials.total_returns)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-outline-variant/20 text-sm font-bold">
                  <span className="text-charcoal-ink">{t('partyDashboard.finalTotal')} <span className="text-charcoal-ink/30 ml-1">(=)</span></span>
                  <span className="font-mono-tabular text-charcoal-ink">{fmt(totalBeforePayments)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Total Paid */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper p-6 flex flex-col justify-start">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={20} className="text-emerald-500" />
              <span className="text-sm font-medium text-charcoal-ink/70">{t('partyDashboard.totalPaid')}</span>
            </div>
            <p className="text-3xl font-bold font-mono-tabular tracking-tight text-emerald-600">
              {fmt(financials.total_paid)}
            </p>
          </div>

          {/* Card 3: Outstanding Balance */}
          <div className={`p-6 rounded-2xl flex flex-col justify-start ${
            balance > 0
              ? 'bg-gradient-to-br from-error-container/40 to-error-container/10 border border-error/10 shadow-sm'
              : 'bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/10 shadow-sm'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={20} className={balance > 0 ? 'text-error' : 'text-accent'} />
              <span className="text-sm font-medium text-charcoal-ink/70">{t('partyDashboard.outstandingBalance')}</span>
            </div>
            <p className={`text-3xl font-bold font-mono-tabular tracking-tight ${
              balance > 0 ? 'text-error' : 'text-accent'
            }`}>
              {fmt(balance)}
            </p>
            {balance === 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent/10 text-accent text-xs font-semibold w-fit">
                <span>✓</span> {t('partyDashboard.fullySettled')}
              </div>
            )}
          </div>
          
        </div>

        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up">
          <div className="flex items-center justify-between p-6 border-b border-outline-variant/30">
            <h3 className="text-h3 text-charcoal-ink">{t('partyDashboard.invoices')}</h3>
            {selectedIds.size > 0 && (
              <button onClick={handleBulkPrint}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 transition-all shadow-sm cursor-pointer btn-tactile">
                <Printer size={16} /> {t('partyDashboard.printSelected')} ({selectedIds.size})
              </button>
            )}
          </div>
          {invoices.length === 0 ? (
            <p className="p-6 text-muted-steel text-sm">{t('partyDashboard.noInvoicesFound')}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-3 px-4 text-left w-10"></th>
                    <th className="py-3 px-4 text-left">{t('partyDashboard.id')}</th>
                    <th className="py-3 px-4 text-left">{t('partyDashboard.type')}</th>
                    <th className="py-3 px-4 text-right">{t('partyDashboard.total')}</th>
                    <th className="py-3 px-4 text-right">{t('partyDashboard.profit')}</th>
                    <th className="py-3 px-4 text-left">{t('partyDashboard.date')}</th>
                    <th className="py-3 px-4 text-right">{t('partyDashboard.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
                    if (editingInvoice && editingInvoice.id === inv.id) {
                      return (
                        <tr key={`edit-${inv.id}`} className="border-b border-outline-variant/20">
                          <InlineInvoiceEditor
                            invoice={editingInvoice}
                            onCancel={() => setEditingInvoice(null)}
                            onSaved={() => {
                              setEditingInvoice(null);
                              loadSummary();
                            }}
                            onPrint={(inv) => setInvoiceToPrint(inv)}
                          />
                        </tr>
                      );
                    }

                    const isExpanded = expandedRows.has(inv.id);
                    const hasItems = Array.isArray(inv.items) && inv.items.length > 0;
                    const typeLabel = (inv.invoice_type || '').replace('_', ' ');
                    const isReturn = typeLabel.includes('return');
                    return (
                      <>
                        <tr key={inv.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors">
                          <td className="py-3 px-4">
                            <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                              className="w-4 h-4 rounded border-outline-variant/60 text-accent focus:ring-accent/20 cursor-pointer" />
                          </td>
                          <td className="py-3 px-4">
                            <button
                              onClick={() => hasItems && toggleRow(inv.id)}
                              className={`flex items-center gap-1.5 font-mono-tabular text-charcoal-ink transition-colors ${hasItems ? 'cursor-pointer hover:text-accent' : 'cursor-default opacity-60'}`}
                              title={hasItems ? (isExpanded ? 'Collapse items' : 'Expand items') : 'No items'}
                            >
                              {hasItems
                                ? (isExpanded ? <ChevronDown size={14} className="text-accent" /> : <ChevronRight size={14} />)
                                : <span className="w-[14px]" />}
                              #{String(inv.id).padStart(5, '0')}
                            </button>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg capitalize ${
                              isReturn
                                ? 'bg-indigo-50 text-indigo-600'
                                : typeLabel === 'purchase'
                                  ? 'bg-amber-50 text-amber-700'
                                  : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {t(`partyDashboard.${typeLabel.replace(' ', '_')}`, typeLabel)}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular font-medium text-charcoal-ink">EGP {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="py-3 px-4 text-right font-mono-tabular font-medium">
                            {inv.invoice_profit != null && inv.invoice_type?.toLowerCase() === 'sale' ? (
                              <span className={Number(inv.invoice_profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                {Number(inv.invoice_profit) > 0 ? '+' : ''}EGP {Number(inv.invoice_profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </span>
                            ) : (
                              <span className="text-muted-steel">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono-tabular text-muted-steel text-xs">{inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {isCustomer && inv.invoice_type?.toLowerCase() === 'sell' && inv.items?.length > 0 && inv.items.some(item => Number(item.quantity) > Number(item.already_returned_qty || 0)) && (
                                <button onClick={() => setReturnInvoice(inv)}
                                  className="p-1.5 rounded-xl text-muted-steel hover:bg-status-error/10 hover:text-status-error transition-all cursor-pointer btn-tactile"
                                  title={t('partyDashboard.returnAction')}>
                                  <RotateCcw size={16} />
                                </button>
                              )}
                              <button onClick={() => setEditingInvoice(inv)}
                                className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile"
                                title={t('partyDashboard.edit')}>
                                <Edit size={16} />
                              </button>
                              <button onClick={() => setInvoiceToPrint(inv)}
                                className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile"
                                title={t('partyDashboard.print')}>
                                <Printer size={16} />
                              </button>
                              <button onClick={() => setInvoiceToDelete(inv)}
                                className="p-1.5 rounded-xl text-error/50 hover:bg-error-container/20 hover:text-error transition-all cursor-pointer btn-tactile"
                                title={t('partyDashboard.delete')}>
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && hasItems && (
                          <tr key={`${inv.id}-items`} className="bg-surface-container-low/60">
                            <td colSpan={7} className="px-10 py-3">
                              <table className="w-full text-xs border border-outline-variant/20 rounded-xl overflow-hidden">
                                <thead>
                                  <tr className="bg-surface-container border-b border-outline-variant/20 text-muted-steel uppercase tracking-wider">
                                    <th className="py-2 px-3 text-left">{t('partyDashboard.product')}</th>
                                    <th className="py-2 px-3 text-right">{t('partyDashboard.qty')}</th>
                                    <th className="py-2 px-3 text-right">{t('partyDashboard.unitPrice')}</th>
                                    <th className="py-2 px-3 text-right">{t('partyDashboard.subtotal')}</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {inv.items.map((item, idx) => (
                                    <tr key={idx} className="border-b border-outline-variant/10 last:border-0 hover:bg-surface-container transition-colors">
                                      <td className="py-2 px-3 text-charcoal-ink font-medium">{item.product_name || item.name || `Product #${item.product_id}`}</td>
                                      <td className="py-2 px-3 text-right font-mono-tabular">{item.quantity}</td>
                                      <td className="py-2 px-3 text-right font-mono-tabular">EGP {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                      <td className="py-2 px-3 text-right font-mono-tabular font-semibold">EGP {Number(item.total_price ?? item.unit_price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </td>
                          </tr>
                        )}
                      </>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {summary.payments && summary.payments.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up mt-6">
            <div className="p-6 border-b border-outline-variant/30">
              <h3 className="text-h3 text-charcoal-ink">{t('partyDashboard.payments')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-3 px-6 text-left">{t('partyDashboard.invoiceId')}</th>
                    <th className="py-3 px-6 text-right">{t('partyDashboard.amount')}</th>
                    <th className="py-3 px-6 text-left">{t('partyDashboard.date')}</th>
                    <th className="py-3 px-6 text-right">{t('partyDashboard.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.payments.map((payment) => (
                    <tr key={payment.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors group">
                      <td className="py-3 px-6 text-muted-steel">{payment.invoice_id ? `#${String(payment.invoice_id).padStart(5, '0')}` : '—'}</td>
                      <td className="py-3 px-6 text-right">
                        {editingPaymentId === payment.id ? (
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={editPaymentAmount}
                              onChange={(e) => setEditPaymentAmount(e.target.value)}
                              className="w-28 bg-surface-container-low border border-accent rounded-lg px-2 py-1.5 text-right text-charcoal-ink font-mono-tabular focus:ring-1 focus:ring-accent outline-none transition-all"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleUpdatePayment(payment.id);
                                if (e.key === 'Escape') { setEditingPaymentId(null); setEditPaymentAmount(''); }
                              }}
                            />
                            <button
                              onClick={() => handleUpdatePayment(payment.id)}
                              disabled={paymentActionLoading === payment.id}
                              className="p-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-all cursor-pointer btn-tactile disabled:opacity-50"
                              title={t('partyDashboard.save')}
                            >
                              {paymentActionLoading === payment.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            </button>
                            <button
                              onClick={() => { setEditingPaymentId(null); setEditPaymentAmount(''); }}
                              className="p-1.5 rounded-lg text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                              title={t('partyDashboard.cancel')}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono-tabular font-medium text-emerald-600">EGP {Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        )}
                      </td>
                      <td className="py-3 px-6 font-mono-tabular text-muted-steel text-xs">{payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : (payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-')}</td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingPaymentId(payment.id); setEditPaymentAmount(String(payment.amount)); }}
                            className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile opacity-0 group-hover:opacity-100"
                            title={t('partyDashboard.edit')}
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setPaymentToDelete(payment)}
                            className="p-1.5 rounded-xl text-error/50 hover:bg-error-container/20 hover:text-error transition-all cursor-pointer btn-tactile opacity-0 group-hover:opacity-100"
                            title={t('partyDashboard.delete')}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}


        {products.length > 0 && (
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up">
            <div className="p-6 border-b border-outline-variant/30">
              <h3 className="text-h3 text-charcoal-ink">{t('partyDashboard.productInventory')}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-3 px-6 text-left">{t('partyDashboard.product')}</th>
                    {!isCustomer && <th className="py-3 px-6 text-right">{t('partyDashboard.unitPrice', 'Price')}</th>}
                    <th className="py-3 px-6 text-right">
                      {!isCustomer ? t('partyDashboard.supplierStock', 'Stock (Supplier / Total)') : t('partyDashboard.stock')}
                    </th>
                    {!isCustomer && <th className="py-3 px-6 text-right">{t('partyDashboard.actions')}</th>}
                  </tr>
                </thead>
                <tbody>
                  {products.map((prod) => (
                    <tr key={prod.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors">
                      <td className="py-3 px-6 text-charcoal-ink font-medium">{prod.name}</td>
                      {!isCustomer && (
                        <td className="py-3 px-6 text-right font-mono-tabular text-muted-steel">
                          EGP {Number(prod.last_purchase_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                      )}
                      <td className="py-3 px-6 text-right font-mono-tabular">
                        {!isCustomer ? (
                          <span className={prod.supplier_stock <= 0 ? 'text-error' : 'text-charcoal-ink'}>
                            {prod.supplier_stock} / <span className="text-muted-steel text-xs">{prod.remaining_stock}</span>
                          </span>
                        ) : (
                          <span className={prod.remaining_stock <= 0 ? 'text-error' : 'text-charcoal-ink'}>{prod.remaining_stock}</span>
                        )}
                      </td>
                      {!isCustomer && (
                        <td className="py-3 px-6 text-right">
                          {prod.supplier_stock > 0 && (
                            <button
                              onClick={() => setProductToReturn(prod)}
                              className="p-1.5 rounded-xl text-muted-steel hover:bg-status-error/10 hover:text-status-error transition-all cursor-pointer btn-tactile inline-flex items-center gap-1.5 text-xs font-semibold"
                              title={t('partyDashboard.returnAction')}
                            >
                              <RotateCcw size={14} />
                              {t('partyDashboard.returnAction', 'Return')}
                            </button>
                          )}
                        </td>
                      )}
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
              <h3 className="text-label-md text-charcoal-ink font-semibold">{t('partyDashboard.printPreview')} — #{String(invoiceToPrint.id).padStart(5, '0')}</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleClosePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"><X size={16} /> Cancel</button>
                <button
                  onClick={async () => {
                    const el = invoicePrintRef.current?.querySelector('.invoice-print-area');
                    if (!el) return;
                    setDownloadingPdf(true);
                    try {
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
                      notifications.show({ title: 'Error', message: 'Error downloading PDF. Use Print → Save as PDF instead.', color: 'red' });
                    } finally {
                      setDownloadingPdf(false);
                    }
                  }}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {t('partyDashboard.savePdf')}
                </button>
                <button onClick={handleConfirmPrint} className="flex items-center gap-2 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile"><Printer size={16} /> {t('partyDashboard.print')}</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-8 flex justify-center">
              <div ref={invoicePrintRef} className="shadow-2xl rounded-xl overflow-hidden border border-outline-variant/30 self-start">
                <InvoicePrintTemplate invoice={invoiceToPrint} tenantName={tenantName} partyName={party.name} partyPhone={party.phone} partyAddress={party.address} logoUrl={logoUrl} defaultFooterText={defaultFooterText} taxNumber={taxNumber} paperSize={paperSize} />
              </div>
            </div>
          </div>
          {createPortal(
            <div id="print-only-container" className="print-portal" style={{ display: 'none' }}>
              <InvoicePrintTemplate invoice={invoiceToPrint} tenantName={tenantName} partyName={party.name} partyPhone={party.phone} partyAddress={party.address} logoUrl={logoUrl} defaultFooterText={defaultFooterText} taxNumber={taxNumber} paperSize={paperSize} />
            </div>,
            document.body
          )}
        </>
      )}

      {bulkInvoicesToPrint.length > 0 && (
        <>
          <div className="print:hidden fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-lowest border-b border-outline-variant/60 flex-shrink-0">
              <h3 className="text-label-md text-charcoal-ink font-semibold">{t('partyDashboard.bulkPrint')} — {bulkInvoicesToPrint.length} {t('partyDashboard.invoices').toLowerCase()}</h3>
              <div className="flex items-center gap-2">
                <button onClick={handleClosePrint} className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"><X size={16} /> {t('partyDashboard.cancel')}</button>
                <button onClick={handleConfirmPrint} className="flex items-center gap-2 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile"><Printer size={16} /> {t('partyDashboard.printAll')}</button>
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
          {createPortal(
            <div id="print-only-container" className="print-portal" style={{ display: 'none' }}>
              {bulkInvoicesToPrint.map((inv) => (
                <InvoicePrintTemplate key={inv.id} invoice={inv} tenantName={tenantName} partyName={party.name} partyPhone={party.phone} partyAddress={party.address} logoUrl={logoUrl} defaultFooterText={defaultFooterText} taxNumber={taxNumber} paperSize={paperSize} />
              ))}
            </div>,
            document.body
          )}
        </>
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

      {productToReturn && (
        <SupplierReturnProductModal
          supplierId={partyId}
          product={productToReturn}
          onClose={() => setProductToReturn(null)}
          onSaved={() => {
            setProductToReturn(null);
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
              <h3 className="text-h3 text-charcoal-ink mb-2">{t('partyDashboard.deleteInvoice')}</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6">
                {t('partyDashboard.deleteInvoiceDesc').replace('{id}', String(invoiceToDelete.id).padStart(5, '0'))}
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setInvoiceToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  {t('partyDashboard.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteInvoice(invoiceToDelete.id)}
                  className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile"
                >
                  {t('partyDashboard.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-h3 text-charcoal-ink">{t('partyDashboard.recordPayment')}</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 text-muted-steel hover:bg-surface-container-low rounded-xl transition-all btn-tactile">
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6 space-y-4">
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex justify-between items-center">
                  <span className="text-label-sm text-muted-steel">
                    {financials.balance < 0 ? t('partyDashboard.weOweThem') : t('partyDashboard.outstandingBalance')}:
                  </span>
                  <span className={`text-label-md font-mono-tabular ${financials.balance < 0 ? 'text-accent' : 'text-error'}`}>
                    {t('common.currency')} {Math.abs(Number(financials.balance)).toLocaleString()}
                  </span>
                </div>
                
                <div>
                  <label className="block text-label-sm text-charcoal-ink mb-1.5">{t('partyDashboard.paymentAmount')} ({t('common.currency')})</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    max={Math.abs(financials.balance)}
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      if (paymentError) setPaymentError('');
                    }}
                    placeholder={t('partyDashboard.enterAmount')}
                    className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant focus:border-accent focus:ring-1 focus:ring-accent rounded-xl outline-none transition-all text-charcoal-ink"
                  />
                  {paymentError && <p className="text-error text-xs mt-1.5">{paymentError}</p>}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsPaymentModalOpen(false)}
                  disabled={paymentSubmitting}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  {t('partyDashboard.cancel')}
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={paymentSubmitting || !paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > Math.abs(financials.balance)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentSubmitting && <Loader2 size={16} className="animate-spin" />}
                  {t('partyDashboard.recordPayment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}



      {paymentToDelete && (
        <div className="fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-error-container/30 text-error flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-h3 text-charcoal-ink mb-2">{t('partyDashboard.deletePayment')}</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6">
                {t('partyDashboard.deletePaymentConfirm').split('{{amount}}')[0]}<strong className="text-charcoal-ink">{t('common.currency')} {Number(paymentToDelete.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>{t('partyDashboard.deletePaymentConfirm').split('{{amount}}')[1]}
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setPaymentToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  {t('partyDashboard.cancel')}
                </button>
                <button
                  onClick={() => handleDeletePayment(paymentToDelete.id)}
                  disabled={paymentActionLoading === paymentToDelete.id}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {paymentActionLoading === paymentToDelete.id && <Loader2 size={16} className="animate-spin" />}
                  {t('partyDashboard.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[200] bg-emerald-600 text-white px-6 py-3 rounded-xl shadow-lg font-medium text-sm flex items-center gap-3 animate-fade-in-up">
          <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
            <CreditCard size={14} />
          </div>
          {toastMessage}
        </div>
      )}
    </>
  );
}
