import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, DollarSign, CreditCard, AlertCircle, CheckCircle2,
  Package, Printer, X, Loader2, Edit, Trash2, Undo2, TrendingUp, Download, Plus,
  ChevronDown, ChevronRight, RotateCcw
} from 'lucide-react';
import { notifications } from '@mantine/notifications';
import api from '../services/api';
import InvoicePrintTemplate from '../components/InvoicePrintTemplate';

import { useTranslation } from 'react-i18next';
import ReturnInvoiceModal from '../components/ReturnInvoiceModal';
import EditInvoiceModal from '../components/EditInvoiceModal';
import { useAuth } from '../context/AuthContext';



export default function PartyDashboard() {
  const { t } = useTranslation();
  const { partyId } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [bulkInvoicesToPrint, setBulkInvoicesToPrint] = useState([]);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineItems, setInlineItems] = useState([]);
  const [inlineSaving, setInlineSaving] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [returnInvoice, setReturnInvoice] = useState(null);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [paperSize, setPaperSize] = useState('a4');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentSubmitting, setPaymentSubmitting] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [toastMessage, setToastMessage] = useState('');
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const [returnItems, setReturnItems] = useState([]);
  const [returnSubmitting, setReturnSubmitting] = useState(false);
  const [returnError, setReturnError] = useState('');
  const [isTotalExpanded, setIsTotalExpanded] = useState(false);
  const [editingPaymentId, setEditingPaymentId] = useState(null);
  const [editPaymentAmount, setEditPaymentAmount] = useState('');
  const [paymentActionLoading, setPaymentActionLoading] = useState(null);
  const [paymentToDelete, setPaymentToDelete] = useState(null);

  function toggleRow(id) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

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

  // ─── Inline Editing Handlers ───
  const startInlineEdit = (inv) => {
    setInlineEditId(inv.id);
    setInlineItems((inv.items || []).map(it => ({
      id: it.id,
      product_name: it.product_name || it.name || `Product #${it.product_id}`,
      batch_id: it.batch_id,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price || it.price || 0),
    })));
  };
  const cancelInlineEdit = () => { setInlineEditId(null); setInlineItems([]); };
  const updateInlineItem = (idx, field, val) => {
    setInlineItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: Number(val) || 0 } : it));
  };
  const saveInlineEdit = async () => {
    try {
      setInlineSaving(true);
      await api.updateInvoice(inlineEditId, {
        items: inlineItems.map(it => ({ batch_id: it.batch_id, quantity: it.quantity, unit_price: it.unit_price }))
      });
      cancelInlineEdit();
      loadSummary();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.detail || err?.message || 'فشل حفظ التعديلات',
        color: 'red',
      });
    } finally {
      setInlineSaving(false);
    }
  };


  useEffect(() => {
    loadSummary();
  }, [partyId, navigate]);

  async function handleRecordPayment() {
    setPaymentError('');
    const amt = Number(paymentAmount);
    if (!amt || amt <= 0) {
      setPaymentError('Enter a valid amount.');
      return;
    }
    if (amt > summary.financials.balance) {
      setPaymentError('Amount cannot exceed outstanding balance.');
      return;
    }
    setPaymentSubmitting(true);
    try {
      await api.createPartyPayment(partyId, { amount_paid: amt });
      setToastMessage('Payment recorded successfully!');
      setTimeout(() => setToastMessage(''), 3000);
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      loadSummary();
    } catch (err) {
      setPaymentError(err.response?.data?.detail || 'Failed to record payment.');
    } finally {
      setPaymentSubmitting(false);
    }
  }

  async function handleUpdatePayment(paymentId) {
    const amt = Number(editPaymentAmount);
    if (!amt || amt <= 0) return;
    setPaymentActionLoading(paymentId);
    try {
      await api.updatePartyPayment(partyId, paymentId, { amount_paid: amt });
      setEditingPaymentId(null);
      setEditPaymentAmount('');
      setToastMessage('Payment updated successfully!');
      setTimeout(() => setToastMessage(''), 3000);
      loadSummary();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.detail || 'Failed to update payment.', color: 'red' });
    } finally {
      setPaymentActionLoading(null);
    }
  }

  async function handleDeletePayment(paymentId) {
    setPaymentActionLoading(paymentId);
    try {
      await api.deletePartyPayment(partyId, paymentId);
      setPaymentToDelete(null);
      setToastMessage('Payment deleted successfully!');
      setTimeout(() => setToastMessage(''), 3000);
      loadSummary();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.detail || 'Failed to delete payment.', color: 'red' });
    } finally {
      setPaymentActionLoading(null);
    }
  }

  function openReturnModal() {
    if (!summary || !summary.products || summary.products.length === 0) return;
    setReturnItems(
      summary.products
        .filter(p => p.remaining_stock > 0)
        .map(p => ({
          product_id: p.id,
          product_name: p.name,
          available_stock: p.remaining_stock,
          return_qty: 0,
          unit_price: p.last_purchase_price || 0,
        }))
    );
    setReturnError('');
    setIsReturnModalOpen(true);
  }

  async function handleStockReturn() {
    setReturnError('');
    const validItems = returnItems.filter(i => i.return_qty > 0);
    if (validItems.length === 0) {
      setReturnError('Select at least one product to return.');
      return;
    }
    for (const item of validItems) {
      if (item.return_qty > item.available_stock) {
        setReturnError(`Cannot return more than available stock for "${item.product_name}".`);
        return;
      }
    }
    setReturnSubmitting(true);
    try {
      const result = await api.createStockReturn(partyId, {
        items: validItems.map(i => ({
          product_id: i.product_id,
          quantity: i.return_qty,
          unit_price: i.unit_price,
        }))
      });
      setSummary(result);
      setToastMessage('Return processed successfully!');
      setTimeout(() => setToastMessage(''), 3000);
      setIsReturnModalOpen(false);
    } catch (err) {
      setReturnError(err.message || 'Failed to process return.');
    } finally {
      setReturnSubmitting(false);
    }
  }

  async function handleDeleteInvoice(invoiceId) {
    try {
      await api.deleteInvoice(invoiceId);
      setInvoiceToDelete(null);
      loadSummary();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.response?.data?.detail || 'Failed to delete invoice', color: 'red' });
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

  const fmt = (n) => `${t('common.currency')} ${Number(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  const balance = Number(financials.balance || 0);
  const totalBeforePayments = Number(financials.initial_balance || 0) + Number(financials.total_purchases || 0) - Number(financials.total_returns || 0);

  return (
    <>
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        <div className="flex items-center justify-between gap-4 flex-wrap">
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
          <div className="flex items-center gap-3">
            {products.length > 0 && (
              <button
                onClick={openReturnModal}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all cursor-pointer btn-tactile"
              >
                <RotateCcw size={18} />
                Return / استرجاع
              </button>
            )}
            {balance > 0 && (
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile"
              >
                <Plus size={18} />
                Record Payment
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
                  <span className="text-sm font-medium text-charcoal-ink/70">Total Amount</span>
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
                    <span className="text-muted-steel">Initial Balance</span>
                    <span className="font-mono-tabular font-medium text-amber-600">{fmt(financials.initial_balance)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-steel">Total Purchases <span className="text-charcoal-ink/30 ml-1">(+)</span></span>
                  <span className="font-mono-tabular font-medium text-charcoal-ink">{fmt(financials.total_purchases)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-steel">Total Returns <span className="text-indigo-400 ml-1">(−)</span></span>
                  <span className="font-mono-tabular font-medium text-indigo-500">{fmt(financials.total_returns)}</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-outline-variant/20 text-sm font-bold">
                  <span className="text-charcoal-ink">Final Total <span className="text-charcoal-ink/30 ml-1">(=)</span></span>
                  <span className="font-mono-tabular text-charcoal-ink">{fmt(totalBeforePayments)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Card 2: Total Paid */}
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper p-6 flex flex-col justify-start">
            <div className="flex items-center gap-2 mb-2">
              <CreditCard size={20} className="text-emerald-500" />
              <span className="text-sm font-medium text-charcoal-ink/70">Total Paid</span>
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
              <span className="text-sm font-medium text-charcoal-ink/70">Outstanding Balance</span>
            </div>
            <p className={`text-3xl font-bold font-mono-tabular tracking-tight ${
              balance > 0 ? 'text-error' : 'text-accent'
            }`}>
              {fmt(balance)}
            </p>
            {balance === 0 && (
              <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-accent/10 text-accent text-xs font-semibold w-fit">
                <span>✓</span> Fully settled
              </div>
            )}
          </div>
          
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
                    {party.party_type !== 'supplier' && <th className="py-3 px-4 text-right">Profit</th>}
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => {
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
                              {typeLabel}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono-tabular font-medium text-charcoal-ink">{t('common.currency')} {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          {party.party_type !== 'supplier' && (
                            <td className="py-3 px-4 text-right font-mono-tabular font-medium">
                              {inv.invoice_profit != null && inv.invoice_type === 'sell' ? (
                                <span className={Number(inv.invoice_profit) >= 0 ? 'text-emerald-600' : 'text-red-500'}>
                                  {Number(inv.invoice_profit) > 0 ? '+' : ''}{t('common.currency')} {Number(inv.invoice_profit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-muted-steel">—</span>
                              )}
                            </td>
                          )}
                          <td className="py-3 px-4 font-mono-tabular text-muted-steel text-xs">{inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB') : '-'}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => setInvoiceToPrint(inv)}
                              className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile"
                              title="Print / طباعة">
                              <Printer size={16} />
                            </button>
                          </td>
                        </tr>
                        {isExpanded && hasItems && (
                          <tr key={`${inv.id}-items`}>
                            <td colSpan={party.party_type !== 'supplier' ? 7 : 6} className="pt-0 pb-3 px-4">
                              <div className="bg-surface-container-low/80 rounded-xl border border-outline-variant/30 overflow-hidden">
                                {/* Header with actions */}
                                <div className="flex items-center justify-between px-4 py-2.5 bg-surface-container border-b border-outline-variant/20">
                                  <span className="text-xs font-semibold text-charcoal-ink/60 tracking-wide">
                                    تفاصيل الفاتورة #{String(inv.id).padStart(5, '0')}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <button onClick={() => setEditingInvoice(inv)}
                                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-accent-surface text-accent hover:bg-accent hover:text-white transition-all cursor-pointer">
                                      <Edit size={12} /> تعديل
                                    </button>
                                    {(inv.invoice_type === 'sell' || inv.invoice_type === 'sale') && (
                                      <button onClick={() => setReturnInvoice(inv)}
                                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all cursor-pointer">
                                        <RotateCcw size={12} /> استرجاع
                                      </button>
                                    )}
                                  </div> 
                                </div>
                                {/* Items table */}
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-muted-steel">
                                      <th className="py-2 px-4 text-left font-medium">المنتج</th>
                                      <th className="py-2 px-4 text-center font-medium">الكمية</th>
                                      <th className="py-2 px-4 text-right font-medium">السعر</th>
                                      <th className="py-2 px-4 text-right font-medium">الإجمالي</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {inv.items.map((item, idx) => (
                                      <tr key={idx} className="border-t border-outline-variant/10 hover:bg-surface-container/40 transition-colors">
                                        <td className="py-2.5 px-4 font-medium text-charcoal-ink">{item.product_name || item.name || `#${item.product_id}`}</td>
                                        <td className="py-2.5 px-4 text-center font-mono-tabular">{item.quantity}</td>
                                        <td className="py-2.5 px-4 text-right font-mono-tabular">{t('common.currency')} {Number(item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                        <td className="py-2.5 px-4 text-right font-mono-tabular font-semibold text-charcoal-ink">{t('common.currency')} {Number(item.total_price ?? item.unit_price * item.quantity).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                  <tfoot>
                                    <tr className="border-t-2 border-outline-variant/30 bg-surface-container/40">
                                      <td colSpan={3} className="py-2 px-4 text-right text-muted-steel font-medium">الإجمالي</td>
                                      <td className="py-2 px-4 text-right font-mono-tabular font-bold text-charcoal-ink">{t('common.currency')} {Number(inv.total_amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                    </tr>
                                  </tfoot>
                                </table>
                              </div>
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
              <h3 className="text-h3 text-charcoal-ink">Payments</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-3 px-6 text-left">Invoice ID</th>
                    <th className="py-3 px-6 text-right">Amount</th>
                    <th className="py-3 px-6 text-left">Date</th>
                    <th className="py-3 px-6 text-right">Actions</th>
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
                              title="Save"
                            >
                              {paymentActionLoading === payment.id ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                            </button>
                            <button
                              onClick={() => { setEditingPaymentId(null); setEditPaymentAmount(''); }}
                              className="p-1.5 rounded-lg text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                              title="Cancel"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <span className="font-mono-tabular font-medium text-emerald-600">{t('common.currency')} {Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                        )}
                      </td>
                      <td className="py-3 px-6 font-mono-tabular text-muted-steel text-xs">{payment.created_at ? new Date(payment.created_at).toLocaleDateString('en-GB') : (payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-GB') : '-')}</td>
                      <td className="py-3 px-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => { setEditingPaymentId(payment.id); setEditPaymentAmount(String(payment.amount)); }}
                            className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile opacity-0 group-hover:opacity-100"
                            title="Edit"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => setPaymentToDelete(payment)}
                            className="p-1.5 rounded-xl text-error/50 hover:bg-error-container/20 hover:text-error transition-all cursor-pointer btn-tactile opacity-0 group-hover:opacity-100"
                            title="Delete"
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
                    const container = document.getElementById('print-only-container');
                    try {
                      if (container) container.style.display = 'block';
                      await new Promise(r => setTimeout(r, 100));
                      const el = container?.querySelector('#invoice-print-area') || document.getElementById('invoice-print-area');
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
                      notifications.show({ title: 'PDF Error', message: 'Error downloading PDF. Use Print → Save as PDF instead.', color: 'red' });
                    } finally {
                      if (container) container.style.display = 'none';
                      setDownloadingPdf(false);
                    }
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
          {createPortal(
            <div id="print-only-container" style={{ display: 'none' }}>
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
          {createPortal(
            <div id="print-only-container" style={{ display: 'none' }}>
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

      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          paperSize={paperSize}
          onPaperSizeChange={setPaperSize}
          onPrint={(printInvoice) => setInvoiceToPrint(printInvoice)}
          onClose={() => setEditingInvoice(null)}
          onSaved={() => {
            setEditingInvoice(null);
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

      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-h3 text-charcoal-ink">Record Payment</h3>
                <button onClick={() => setIsPaymentModalOpen(false)} className="p-2 text-muted-steel hover:bg-surface-container-low rounded-xl transition-all btn-tactile">
                  <X size={20} />
                </button>
              </div>
              
              <div className="mb-6 space-y-4">
                <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30 flex justify-between items-center">
                  <span className="text-label-sm text-muted-steel">Outstanding Balance:</span>
                  <span className="text-label-md text-error font-mono-tabular">{t('common.currency')} {Number(financials.balance).toLocaleString()}</span>
                </div>
                
                <div>
                  <label className="block text-label-sm text-charcoal-ink mb-1.5">Payment Amount ({t('common.currency')})</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    max={financials.balance}
                    value={paymentAmount}
                    onChange={(e) => {
                      setPaymentAmount(e.target.value);
                      if (paymentError) setPaymentError('');
                    }}
                    placeholder="Enter amount..."
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
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  disabled={paymentSubmitting || !paymentAmount || Number(paymentAmount) <= 0 || Number(paymentAmount) > financials.balance}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isReturnModalOpen && (
        <div className="fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-2xl overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                    <RotateCcw size={20} />
                  </div>
                  <div>
                    <h3 className="text-h3 text-charcoal-ink">Stock Return / استرجاع</h3>
                    <p className="text-xs text-muted-steel mt-0.5">Select products and quantities to return</p>
                  </div>
                </div>
                <button onClick={() => setIsReturnModalOpen(false)} className="p-2 text-muted-steel hover:bg-surface-container-low rounded-xl transition-all btn-tactile">
                  <X size={20} />
                </button>
              </div>

              {returnItems.length === 0 ? (
                <p className="text-muted-steel text-sm py-8 text-center">No products with available stock.</p>
              ) : (
                <div className="max-h-[50vh] overflow-y-auto mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                        <th className="py-2.5 px-3 text-left">Product</th>
                        <th className="py-2.5 px-3 text-right">Stock</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-center w-28">Return Qty</th>
                        <th className="py-2.5 px-3 text-right">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {returnItems.map((item, idx) => (
                        <tr key={item.product_id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors">
                          <td className="py-3 px-3 text-charcoal-ink font-medium">{item.product_name}</td>
                          <td className="py-3 px-3 text-right font-mono-tabular text-muted-steel">{item.available_stock}</td>
                          <td className="py-3 px-3 text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              value={item.unit_price}
                              onChange={(e) => {
                                const val = Math.max(0, Number(e.target.value));
                                setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, unit_price: val } : it));
                              }}
                              className="w-24 bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1.5 text-right text-charcoal-ink font-mono-tabular focus:border-accent outline-none transition-all"
                            />
                          </td>
                          <td className="py-3 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              max={item.available_stock}
                              value={item.return_qty || ''}
                              onChange={(e) => {
                                const val = Math.max(0, Math.min(item.available_stock, Number(e.target.value)));
                                setReturnItems(prev => prev.map((it, i) => i === idx ? { ...it, return_qty: val } : it));
                              }}
                              placeholder="0"
                              className="w-24 mx-auto bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1.5 text-center text-charcoal-ink font-mono-tabular focus:border-indigo-500 outline-none transition-all"
                            />
                          </td>
                          <td className="py-3 px-3 text-right font-mono-tabular font-medium text-charcoal-ink">
                            {item.return_qty > 0 ? `${t('common.currency')} ${(item.return_qty * item.unit_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '-'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {(() => {
                const returnTotal = returnItems.reduce((sum, i) => sum + (i.return_qty * i.unit_price), 0);
                return returnTotal > 0 ? (
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex justify-between items-center">
                    <span className="text-sm font-medium text-indigo-700">Return Total / إجمالي الاسترجاع</span>
                    <span className="text-lg font-bold font-mono-tabular text-indigo-700">{t('common.currency')} {returnTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                  </div>
                ) : null;
              })()}

              {returnError && <p className="text-error text-xs mb-3">{returnError}</p>}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setIsReturnModalOpen(false)}
                  disabled={returnSubmitting}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStockReturn}
                  disabled={returnSubmitting || returnItems.every(i => i.return_qty <= 0)}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {returnSubmitting && <Loader2 size={16} className="animate-spin" />}
                  Confirm Return / تأكيد الاسترجاع
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
              <h3 className="text-h3 text-charcoal-ink mb-2">Delete Payment</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6">
                Are you sure you want to delete this payment of <strong className="text-charcoal-ink">{t('common.currency')} {Number(paymentToDelete.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>? The balance will be recalculated.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setPaymentToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeletePayment(paymentToDelete.id)}
                  disabled={paymentActionLoading === paymentToDelete.id}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {paymentActionLoading === paymentToDelete.id && <Loader2 size={16} className="animate-spin" />}
                  Confirm Delete
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
