import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Save, Loader2, CreditCard, AlertCircle, CheckCircle, Package, Printer } from 'lucide-react';
import api from '../services/api';

export default function InlineInvoiceEditor({ invoice, onCancel, onSaved, onPrint }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [batches, setBatches] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [feedback, setFeedback] = useState(null);

  // Payments
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);

  const flash = useCallback((type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 2800);
  }, []);

  useEffect(() => {
    if (!invoice) return;
    setItems(
      invoice.items.map((it) => ({
        id: it.id,
        batch_id: it.batch_id,
        quantity: String(it.quantity),
        unit_price: String(it.unit_price),
        product_name: it.product_name || `Batch #${it.batch_id}`,
      }))
    );
    api.getProducts().then(setProducts).catch(console.error);
    
    setLoadingPayments(true);
    api.getInvoicePayments(invoice.id)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoadingPayments(false));
  }, [invoice]);

  useEffect(() => {
    products.forEach((p) => {
      if (!batches[p.id]) {
        api.getBatchesByProduct(p.id)
          .then((b) => setBatches((prev) => ({ ...prev, [p.id]: b })))
          .catch(() => {});
      }
    });
  }, [products]);

  const deliveryFee = parseFloat(invoice?.delivery_fee) || 0;
  const subtotal = items.reduce((acc, it) => {
    return acc + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
  }, 0);
  const total = subtotal + deliveryFee;

  const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
  const balance = total - totalPaid;

  const printInvoice = {
    ...invoice,
    total_amount: total,
    items: items.map((it) => ({
      batch_id: Number(it.batch_id),
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price),
      product_name: it.product_name,
    })),
  };

  function addItem() {
    setItems((prev) => [...prev, { id: null, batch_id: '', quantity: '1', unit_price: '', product_name: '' }]);
  }

  function removeItem(idx) {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  function onBatchSelect(idx, batchId) {
    const allBatches = Object.values(batches).flat();
    const batch = allBatches.find((b) => String(b.id) === String(batchId));
    updateItem(idx, 'batch_id', Number(batchId));
    if (batch) {
      const productBatches = batches[batch.product_id] || [];
      const highestBatch = productBatches.reduce((acc, b) => {
        if (!acc) return b;
        return Number(b.selling_price) > Number(acc.selling_price) ? b : acc;
      }, null);
      const latestPrice = highestBatch?.selling_price ?? batch.selling_price ?? batch.purchase_price ?? '';
      updateItem(idx, 'unit_price', String(latestPrice));
    }
  }

  async function handleSaveItems() {
    if (items.some((it) => !it.batch_id || !it.quantity || !it.unit_price)) {
      flash('error', t('editInvoiceModal.pleaseFillItemFields'));
      return;
    }
    setSaving(true);
    try {
      const payload = {
        items: items.map((it) => ({
          batch_id: Number(it.batch_id),
          quantity: parseFloat(it.quantity),
          unit_price: parseFloat(it.unit_price),
        })),
      };
      const updated = await api.updateInvoice(invoice.id, payload);
      onSaved(updated);
    } catch (err) {
      flash('error', err.message || t('editInvoiceModal.errorOccurred'));
      setSaving(false);
    }
  }

  async function handleAddPayment() {
    const amount = parseFloat(newPaymentAmount);
    if (!amount || amount <= 0) { flash('error', t('editInvoiceModal.enterValidAmount')); return; }
    if (amount > balance) { flash('error', t('editInvoiceModal.cannotPayMoreThanBalance')); return; }
    setAddingPayment(true);
    try {
      await api.addPayment({ invoice_id: invoice.id, party_id: invoice.party_id, amount });
      const updated = await api.getInvoicePayments(invoice.id);
      setPayments(updated);
      setNewPaymentAmount('');
      flash('success', t('editInvoiceModal.paymentAdded'));
    } catch (err) {
      flash('error', err.message || t('editInvoiceModal.errorOccurred'));
    } finally {
      setAddingPayment(false);
    }
  }

  async function handleEditPayment(p) {
    const val = prompt(t('editInvoiceModal.newAmount'), p.amount);
    if (!val || isNaN(val)) return;
    try {
      await api.updatePayment(invoice.id, p.id, { amount: parseFloat(val) });
      const updated = await api.getInvoicePayments(invoice.id);
      setPayments(updated);
      flash('success', t('editInvoiceModal.paymentModified'));
    } catch (err) {
      flash('error', err.message || t('editInvoiceModal.errorOccurred'));
    }
  }

  async function handleDeletePayment(p) {
    if (!confirm(t('editInvoiceModal.deleteThisPayment'))) return;
    try {
      await api.deletePayment(invoice.id, p.id);
      setPayments((prev) => prev.filter((x) => x.id !== p.id));
      flash('success', t('editInvoiceModal.paymentDeleted'));
    } catch (err) {
      flash('error', err.message || t('editInvoiceModal.errorOccurred'));
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all';

  return (
    <td colSpan={7} className="p-0 border-b border-outline-variant/30">
      <div className="bg-surface-container-lowest border-y-4 border-accent animate-fade-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30 bg-surface-container-low/30">
          <div>
            <h3 className="text-label-md text-charcoal-ink font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              {t('editInvoiceModal.editInvoice')}{invoice.id}
            </h3>
            <p className="text-xs text-muted-steel mt-0.5 ml-4">
              {invoice.invoice_type === 'SALE' ? t('editInvoiceModal.saleInvoice') : invoice.invoice_type === 'PURCHASE' ? t('editInvoiceModal.purchaseInvoice') : invoice.invoice_type}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onPrint?.(printInvoice)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-sm text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">
              <Printer size={16} /> {t('editInvoiceModal.editInvoicePrint')}
            </button>
            <button onClick={onCancel} className="px-4 py-2 rounded-xl text-label-sm text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">
              {t('editInvoiceModal.cancel')}
            </button>
            <button onClick={handleSaveItems} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent text-on-primary text-label-sm hover:bg-accent-hover disabled:opacity-50 shadow-sm transition-all cursor-pointer btn-tactile">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {t('editInvoiceModal.save')}
            </button>
          </div>
        </div>

        {feedback && (
          <div className={`mx-6 mt-4 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm ${feedback.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {feedback.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
            {feedback.msg}
          </div>
        )}

        <div className="flex gap-1 px-6 pt-4">
          {['items', 'payments'].map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-label-sm font-medium transition-all cursor-pointer ${activeTab === tab ? 'bg-accent text-on-primary' : 'text-muted-steel hover:bg-surface-container'}`}>
              {tab === 'items' ? <span className="flex items-center gap-1.5"><Package size={14} />{t('editInvoiceModal.editInvoiceItems')}</span> : <span className="flex items-center gap-1.5"><CreditCard size={14} />{t('editInvoiceModal.editInvoicePayments')}</span>}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'items' && (
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/30">
                  <div className="col-span-5">
                    <label className="block text-xs font-semibold text-muted-steel mb-1.5 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceProduct')}</label>
                    <select
                      disabled={invoice.invoice_type === 'PURCHASE'}
                      value={item.batch_id}
                      onChange={(e) => onBatchSelect(idx, e.target.value)}
                      className={`${inputCls} disabled:opacity-50 disabled:bg-surface-container`}
                    >
                      <option value="">{t('editInvoiceModal.editInvoiceSelectProduct')}</option>
                      {products.map((p) => (
                        (batches[p.id] || []).map((b) => (
                          <option key={b.id} value={b.id}>
                            {invoice.invoice_type === 'PURCHASE'
                              ? `${p.name} — (${t('editInvoiceModal.editInvoiceOriginal')} ${b.initial_quantity}, ${t('editInvoiceModal.editInvoiceSold')} ${(Number(b.initial_quantity) - Number(b.remaining_quantity)).toFixed(2)})`
                              : `${p.name} — ${t('editInvoiceModal.editInvoiceAvailable')} ${Number(b.remaining_quantity).toFixed(2)}`}
                          </option>
                        ))
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-steel mb-1.5 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceQuantity')}</label>
                    <input
                      type="number" step="0.001" min="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-muted-steel mb-1.5 uppercase tracking-wider">{t('editInvoiceModal.editInvoicePrice')}</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={item.unit_price}
                      onChange={(e) => updateItem(idx, 'unit_price', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-2 text-right">
                    <label className="block text-xs font-semibold text-muted-steel mb-1.5 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceTotal').replace(': ', '')}</label>
                    <div className="h-[38px] flex items-center justify-end font-mono-tabular font-semibold text-charcoal-ink">
                      EGP {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-center justify-end h-[38px]">
                    <button
                      disabled={invoice.invoice_type === 'PURCHASE'}
                      onClick={() => removeItem(idx)}
                      className="p-2 rounded-xl text-red-400 hover:bg-red-50 hover:text-red-500 disabled:hover:bg-transparent disabled:opacity-30 transition-colors cursor-pointer btn-tactile"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}

              {invoice.invoice_type !== 'PURCHASE' ? (
                <button onClick={addItem} className="w-full flex items-center justify-center gap-1.5 py-3 rounded-xl border-2 border-dashed border-accent/30 text-accent text-label-sm hover:bg-accent-surface hover:border-accent/60 transition-colors cursor-pointer mt-4">
                  <Plus size={16} /> {t('editInvoiceModal.editInvoiceAddNewItem')}
                </button>
              ) : (
                <div className="text-center p-4 mt-4 text-sm text-sky-700 bg-sky-50 rounded-xl border border-sky-200">
                  {t('editInvoiceModal.editInvoicePurchaseEditWarning')}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div className="space-y-4">
              <div className="flex gap-3 p-4 rounded-xl bg-surface-container-low/40 border border-outline-variant/30">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-muted-steel mb-1.5 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceNewPayment')}</label>
                  <input type="number" step="0.01" min="0" placeholder={t('editInvoiceModal.editInvoiceAmountPlaceholder')} value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} className={inputCls} />
                </div>
                <div className="flex items-end">
                  <button onClick={handleAddPayment} disabled={addingPayment} className="flex items-center gap-1.5 h-[38px] px-5 rounded-xl bg-accent text-on-primary text-label-sm hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer btn-tactile">
                    {addingPayment ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {t('editInvoiceModal.recordPayment')}
                  </button>
                </div>
              </div>

              {loadingPayments ? (
                <div className="flex justify-center py-8"><Loader2 size={24} className="animate-spin text-accent" /></div>
              ) : payments.length === 0 ? (
                <p className="text-center text-muted-steel text-sm py-8 bg-surface-container-lowest rounded-xl border border-outline-variant/20 border-dashed">{t('editInvoiceModal.editInvoiceNoPaymentsRecorded')}</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-5 py-4 rounded-xl border border-outline-variant/30 bg-surface-container-lowest shadow-sm hover:shadow-md transition-shadow">
                      <div>
                        <p className="text-label-md font-mono-tabular text-charcoal-ink">EGP {Number(p.amount).toLocaleString('en', { minimumFractionDigits: 2 })}</p>
                        <p className="text-xs text-muted-steel mt-0.5">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleEditPayment(p)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-accent bg-accent/10 hover:bg-accent/20 transition-colors cursor-pointer btn-tactile">{t('editInvoiceModal.editInvoiceEdit')}</button>
                        <button onClick={() => handleDeletePayment(p)} className="px-3 py-1.5 text-xs font-medium rounded-lg text-red-600 bg-red-50 hover:bg-red-100 transition-colors cursor-pointer btn-tactile">{t('editInvoiceModal.editInvoiceDelete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-6 p-4 rounded-xl bg-surface-container border border-outline-variant/20 flex flex-wrap gap-6 justify-between items-center text-sm">
            <div className="flex items-center gap-6">
              <div className="flex flex-col">
                <span className="text-xs text-muted-steel mb-0.5 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceTotal').replace(': ', '')}</span>
                <span className="font-mono-tabular font-medium text-charcoal-ink">EGP {total.toFixed(2)}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-muted-steel mb-0.5 uppercase tracking-wider">{t('editInvoiceModal.editInvoicePaid').replace(': ', '')}</span>
                <span className="font-mono-tabular font-medium text-green-600">EGP {totalPaid.toFixed(2)}</span>
              </div>
              <div className="flex flex-col border-r border-outline-variant/30 pr-6 mr-2">
                <span className="text-xs text-muted-steel mb-0.5 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceRemaining').replace(': ', '')}</span>
                <span className={`font-mono-tabular font-bold ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                  EGP {balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </td>
  );
}
