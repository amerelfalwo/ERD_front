import { useState, useEffect, useCallback, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Plus, Trash2, Save, Loader2, CreditCard, AlertCircle, CheckCircle, Package, Printer } from 'lucide-react';
import api from '../../../services/api';

import ProductSearchSelect from '../../../components/invoice/ProductSearchSelect';

export default function EditInvoiceModal({ invoice, onClose, onSaved, onPrint, paperSize, onPaperSizeChange }) {
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [payments, setPayments] = useState([]);
  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [batches, setBatches] = useState({});
  const [saving, setSaving] = useState(false);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [newPaymentAmount, setNewPaymentAmount] = useState('');
  const [addingPayment, setAddingPayment] = useState(false);
  const [activeTab, setActiveTab] = useState('items');
  const [feedback, setFeedback] = useState(null);
  // Track whether items were loaded for this invoice ID (avoid resetting on onSaved updates)
  const loadedInvoiceIdRef = useRef(null);

  const flash = useCallback((type, msg) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 2800);
  }, []);

  // Only reload items when the invoice.id changes (new invoice opened)
  // NOT when onSaved updates the invoice object (which would overwrite user edits)
  useEffect(() => {
    if (!invoice) return;
    if (loadedInvoiceIdRef.current === invoice.id) {
      // Same invoice — only refresh payments, keep item edits intact
      setLoadingPayments(true);
      api.getInvoicePayments(invoice.id)
        .then(setPayments)
        .catch(() => setPayments([]))
        .finally(() => setLoadingPayments(false));
      return;
    }
    loadedInvoiceIdRef.current = invoice.id;
    setItems(
      invoice.items.map((it) => ({
        id: it.id,
        batch_id: it.batch_id,
        // product_id is returned by the backend in InvoiceItemOut
        product_id: it.product_id ?? null,
        quantity: String(it.quantity),
        unit_price: String(it.unit_price),
        product_name: it.product_name || (it.batch_id ? `Batch #${it.batch_id}` : ''),
      }))
    );
    // Fetch all products (high limit so dropdown is complete)
    setProductsLoading(true);
    api.getProducts(0, 1000)
      .then((res) => {
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        setProducts(list);
        // Backfill product_id or product_name if missing
        setItems((prevItems) =>
          prevItems.map((it) => {
            if (it.product_id) {
              const found = list.find((p) => String(p.id) === String(it.product_id));
              if (found && !it.product_name) {
                return { ...it, product_name: found.name };
              }
            }
            if (!it.product_id && it.product_name) {
              const found = list.find((p) => p.name === it.product_name);
              if (found) {
                return { ...it, product_id: found.id };
              }
            }
            return it;
          })
        );
      })
      .catch(console.error)
      .finally(() => setProductsLoading(false));

    setLoadingPayments(true);
    api.getInvoicePayments(invoice.id)
      .then(setPayments)
      .catch(() => setPayments([]))
      .finally(() => setLoadingPayments(false));
  }, [invoice]);

  // Only pre-fetch batches for products that are ALREADY in the invoice items.
  // Additional batches are loaded on-demand when user selects from the dropdown (onProductSelect).
  useEffect(() => {
    if (!items.length) return;
    const productIds = [...new Set(items.map((it) => it.product_id).filter(Boolean))];
    productIds.forEach((pid) => {
      if (!batches[pid]) {
        api.getBatchesByProduct(pid)
          .then((b) => setBatches((prev) => ({ ...prev, [pid]: b })))
          .catch(() => {});
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.map(it => it.product_id).join(',')]);

  const deliveryFee = parseFloat(invoice?.delivery_fee) || 0;
  const subtotal = items.reduce((acc, it) => {
    return acc + (parseFloat(it.quantity) || 0) * (parseFloat(it.unit_price) || 0);
  }, 0);
  const total = subtotal + deliveryFee;

  // For SELL invoices in edit mode, add back the current item quantities to the
  // batch remaining so the dropdown shows "available if you were to re-set this qty".
  const _isSell = ['SELL', 'SALE'].includes((invoice?.invoice_type || '').toUpperCase());
  const batchesForDisplay = (() => {
    if (!_isSell) return batches;
    // Build a map of product_id → credited qty from current items
    const creditByProduct = {};
    items.forEach((it) => {
      const pid = it.product_id;
      if (pid) {
        creditByProduct[pid] = (creditByProduct[pid] || 0) + (parseFloat(it.quantity) || 0);
      }
    });
    if (!Object.keys(creditByProduct).length) return batches;
    // Deep-clone only the affected product batch arrays, adding back the credited qty
    const result = { ...batches };
    Object.entries(creditByProduct).forEach(([pid, credit]) => {
      const pBatches = batches[Number(pid)];
      if (!pBatches?.length) return;
      // Add the credit to the first (primary/FIFO) batch for display purposes
      result[Number(pid)] = pBatches.map((b, i) =>
        i === 0
          ? { ...b, remaining_quantity: (Number(b.remaining_quantity) || 0) + credit }
          : b
      );
    });
    return result;
  })();

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
    // New blank row — product_id='' so the select shows the placeholder
    setItems((prev) => [...prev, { id: null, batch_id: '', product_id: '', quantity: '1', unit_price: '', product_name: '' }]);
  }

  function removeItem(idx) {
    if (items.length <= 1) {
      flash('error', t('editInvoiceModal.cannotDeleteLastItem', { defaultValue: 'لا يمكن حذف كل البنود — يجب أن تحتوي الفاتورة على بند واحد على الأقل' }));
      return;
    }
    setItems((prev) => prev.filter((_, i) => i !== idx));
  }

  function updateItem(idx, field, value) {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)));
  }

  /**
   * SELL invoices: user picks a product from the dropdown.
   * We store product_id (for the save payload) and resolve the active batch
   * only for price look-up purposes.
   * Batches are loaded on-demand (lazy) if not yet cached.
   */
  function onProductSelect(idx, productId, productObj) {
    if (!productId) {
      setItems((prev) => prev.map((it, i) =>
        i === idx ? { ...it, product_id: '', batch_id: '', unit_price: '', product_name: '', price_is_purchase: false } : it
      ));
      return;
    }
    const pId = Number(productId);
    const product = products.find((p) => p.id === pId) || productObj;

    function applyBatches(pBatches) {
      const activeBatch = pBatches.find((b) => Number(b.remaining_quantity) > 0) || pBatches[0];
      const highestBatch = pBatches.reduce((acc, b) => {
        if (!acc) return b;
        const bPrice = Number(b.selling_price ?? b.current_selling_price ?? 0);
        const aPrice = Number(acc.selling_price ?? acc.current_selling_price ?? 0);
        return bPrice > aPrice ? b : acc;
      }, null);

      const sellingPrice =
        highestBatch?.selling_price ??
        highestBatch?.current_selling_price ??
        activeBatch?.selling_price ??
        activeBatch?.current_selling_price ??
        null;

      const purchasePrice = activeBatch?.purchase_price ?? activeBatch?.unit_cost ?? null;
      const isPurchasePrice = !sellingPrice && !!purchasePrice;
      const resolvedPrice = sellingPrice ?? purchasePrice ?? '';

      setItems((prev) => prev.map((it, i) =>
        i === idx
          ? {
              ...it,
              product_id: pId,
              batch_id: activeBatch ? activeBatch.id : '',
              unit_price: String(resolvedPrice),
              product_name: product?.name || '',
              price_is_purchase: isPurchasePrice,
            }
          : it
      ));
    }

    // Use cached batches if available, otherwise fetch on-demand
    if (batches[pId]) {
      applyBatches(batches[pId]);
    } else {
      // Optimistically update product name while loading batches
      setItems((prev) => prev.map((it, i) =>
        i === idx ? { ...it, product_id: pId, product_name: product?.name || '', unit_price: '' } : it
      ));
      api.getBatchesByProduct(pId)
        .then((b) => {
          setBatches((prev) => ({ ...prev, [pId]: b }));
          applyBatches(b);
        })
        .catch(() => {});
    }
  }

  /** PURCHASE invoices: batch-level dropdown (disabled in UI but kept for completeness) */
  function onBatchSelect(idx, batchId) {
    const allBatches = Object.values(batches).flat();
    const batch = allBatches.find((b) => String(b.id) === String(batchId));
    updateItem(idx, 'batch_id', Number(batchId));
    if (batch) {
      const productBatches = batches[batch.product_id] || [];
      const highestBatch = productBatches.reduce((acc, b) => {
        if (!acc) return b;
        const bPrice = Number(b.selling_price ?? b.current_selling_price ?? 0);
        const aPrice = Number(acc.selling_price ?? acc.current_selling_price ?? 0);
        return bPrice > aPrice ? b : acc;
      }, null);
      const latestPrice = highestBatch?.selling_price ?? highestBatch?.current_selling_price ?? batch.selling_price ?? batch.purchase_price ?? '';
      updateItem(idx, 'unit_price', String(latestPrice));
    }
  }

  async function handleSaveItems() {
    const isSell = ['SELL', 'SALE'].includes((invoice?.invoice_type || '').toUpperCase());

    if (items.some((it) => (!it.product_id && !it.batch_id) || !it.quantity || !it.unit_price)) {
      flash('error', t('editInvoiceModal.pleaseFillItemFields'));
      return;
    }

    setSaving(true);
    try {
      let payload;
      if (isSell) {
        payload = {
          items: items.map((it) => ({
            product_id: Number(it.product_id),
            quantity: parseFloat(it.quantity),
            unit_price: parseFloat(it.unit_price),
          })),
        };
      } else {
        payload = {
          items: items.map((it) => ({
            batch_id: it.batch_id ? Number(it.batch_id) : undefined,
            product_id: it.product_id ? Number(it.product_id) : undefined,
            quantity: parseFloat(it.quantity),
            unit_price: parseFloat(it.unit_price),
          })),
        };
      }
      const updated = await api.updateInvoice(invoice.id, payload);
      flash('success', t('editInvoiceModal.modificationsSaved'));
      onSaved(updated);
    } catch (err) {
      flash('error', err.message || t('editInvoiceModal.errorOccurred'));
    } finally {
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
      onSaved(null);
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
      onSaved(null);
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
      onSaved(null);
    } catch (err) {
      flash('error', err.message || t('editInvoiceModal.errorOccurred'));
    }
  }

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 transition-all';

  if (!invoice) return null;

  const isSell = ['SELL', 'SALE'].includes((invoice?.invoice_type || '').toUpperCase());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border border-outline-variant/40">

        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/30">
          <div>
            <h2 className="text-h2 text-charcoal-ink">{t('editInvoiceModal.editInvoice')}{invoice.id}</h2>
            <p className="text-body-sm text-muted-steel mt-0.5">
              {['SALE', 'SELL'].includes(invoice.invoice_type?.toUpperCase()) ? t('saleInvoice') : invoice.invoice_type === 'PURCHASE' ? t('purchaseInvoice') : t('returnInvoice')}
            </p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-surface-container text-muted-steel transition-colors cursor-pointer">
            <X size={20} />
          </button>
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

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {activeTab === 'items' && (
            <>
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/30">
                  <div className="col-span-5">
                    <label className="block text-label-sm text-muted-steel mb-1 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceProduct')}</label>

                    <ProductSearchSelect
                      value={item.product_id}
                      productName={item.product_name}
                      onChange={(productId, productObj) => onProductSelect(idx, productId, productObj)}
                      products={products}
                      batches={batchesForDisplay}
                      placeholder={t('editInvoiceModal.editInvoiceSelectProduct', { defaultValue: 'بحث باسم المنتج...' })}
                      inputClass={inputCls}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-label-sm text-muted-steel mb-1 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceQuantity')}</label>
                    <input
                      type="number" step="0.001" min="0.001"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, 'quantity', e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="block text-label-sm text-muted-steel mb-1 uppercase tracking-wider">{t('editInvoiceModal.editInvoicePrice')}</label>
                    <input
                      type="number" step="0.01" min="0"
                      value={item.unit_price}
                      onChange={(e) => { updateItem(idx, 'unit_price', e.target.value); updateItem(idx, 'price_is_purchase', false); }}
                      className={`${inputCls} ${item.price_is_purchase ? 'border-amber-400 ring-1 ring-amber-200' : ''}`}
                    />
                    {item.price_is_purchase && (
                      <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                        سعر الشراء — لا يوجد سعر بيع مسجل
                      </p>
                    )}
                  </div>
                  <div className="col-span-1 flex items-end pb-1">
                    <button
                      disabled={items.length <= 1}
                      onClick={() => removeItem(idx)}
                      title={items.length <= 1 ? 'لا يمكن حذف البند الأخير' : 'حذف البند'}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:hover:bg-transparent disabled:opacity-30 transition-colors cursor-pointer btn-tactile"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="col-span-12 text-right">
                    <span className="text-label-sm text-muted-steel">{t('editInvoiceModal.editInvoiceSubtotal')}</span>
                    <span className="text-label-md font-mono-tabular text-charcoal-ink">
                      EGP {((parseFloat(item.quantity) || 0) * (parseFloat(item.unit_price) || 0)).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}

              <button
                onClick={addItem}
                disabled={productsLoading}
                className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border-2 border-dashed border-accent/30 text-accent text-label-sm hover:bg-accent-surface disabled:opacity-50 transition-colors cursor-pointer"
              >
                {productsLoading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {t('editInvoiceModal.editInvoiceAddNewItem')}
              </button>
            </>
          )}

          {activeTab === 'payments' && (
            <>
              <div className="flex gap-2 p-3 rounded-xl bg-surface-container-low/40 border border-outline-variant/30">
                <div className="flex-1">
                  <label className="block text-label-sm text-muted-steel mb-1 uppercase tracking-wider">{t('editInvoiceModal.editInvoiceNewPayment')}</label>
                  <input type="number" step="0.01" min="0" placeholder={t('editInvoiceModal.editInvoiceAmountPlaceholder')} value={newPaymentAmount} onChange={(e) => setNewPaymentAmount(e.target.value)} className={inputCls} />
                </div>
                <div className="flex items-end">
                  <button onClick={handleAddPayment} disabled={addingPayment} className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-accent text-on-primary text-label-sm hover:bg-accent-hover disabled:opacity-50 transition-colors cursor-pointer btn-tactile">
                    {addingPayment ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                    {t('editInvoiceModal.editInvoiceAdd')}
                  </button>
                </div>
              </div>

              {loadingPayments ? (
                <div className="flex justify-center py-6"><Loader2 size={24} className="animate-spin text-accent" /></div>
              ) : payments.length === 0 ? (
                <p className="text-center text-muted-steel text-body-sm py-6">{t('editInvoiceModal.editInvoiceNoPaymentsRecorded')}</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((p) => (
                    <div key={p.id} className="flex items-center justify-between px-4 py-3 rounded-xl border border-outline-variant/30 bg-surface-container-lowest">
                      <div>
                        <p className="text-label-md font-mono-tabular text-charcoal-ink">EGP {Number(p.amount).toLocaleString('en', { minimumFractionDigits: 2 })}</p>
                        <p className="text-label-sm text-muted-steel">{p.payment_date ? new Date(p.payment_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}</p>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => handleEditPayment(p)} className="px-3 py-1.5 text-label-sm rounded-lg text-accent hover:bg-accent-surface transition-colors cursor-pointer btn-tactile">{t('editInvoiceModal.editInvoiceEdit')}</button>
                        <button onClick={() => handleDeletePayment(p)} className="px-3 py-1.5 text-label-sm rounded-lg text-red-500 hover:bg-red-50 transition-colors cursor-pointer btn-tactile">{t('editInvoiceModal.editInvoiceDelete')}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-outline-variant/30 flex items-center justify-between gap-4 bg-surface-container-low/30 rounded-b-2xl">
          <div className="flex gap-4 text-label-sm">
            <span className="text-muted-steel">{t('editInvoiceModal.editInvoiceTotal')} <span className="font-mono-tabular text-charcoal-ink">EGP {total.toFixed(2)}</span></span>
            <span className="text-muted-steel">{t('editInvoiceModal.editInvoicePaid')} <span className="font-mono-tabular text-green-600">EGP {totalPaid.toFixed(2)}</span></span>
            <span className={`font-medium ${balance > 0 ? 'text-amber-600' : 'text-green-600'}`}>
              {t('editInvoiceModal.editInvoiceRemaining')} EGP {balance.toFixed(2)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={paperSize}
              onChange={(e) => onPaperSizeChange?.(e.target.value)}
              className="px-3 py-2 rounded-xl text-label-sm border border-outline-variant/60 bg-surface-container-lowest text-muted-steel focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all cursor-pointer"
            >
              <option value="a4">A4</option>
              <option value="a5">A5</option>
              <option value="receipt">80mm</option>
            </select>
            <button
              onClick={() => onPrint?.(printInvoice)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-outline-variant/60 text-label-sm text-charcoal-ink hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
            >
              <Printer size={16} />
              {t('editInvoiceModal.editInvoicePrint')}
            </button>
            {activeTab === 'items' && (
              <button onClick={handleSaveItems} disabled={saving} className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-accent text-on-primary text-label-md hover:bg-accent-hover disabled:opacity-50 shadow-sm transition-all cursor-pointer btn-tactile">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                {t('editInvoiceModal.editInvoiceSaveChanges')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
