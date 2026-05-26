import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Select } from '@mantine/core';
import {
  ShoppingCart, Plus, Minus, Trash2, Printer, Loader2,
  CheckCircle2, Package, UserSquare2, X, Edit, Undo2, Search,
  Truck, UserPlus, Phone, MapPin, Download
} from 'lucide-react';
import api from '../services/api';
import { useInvoiceStore } from '../store/useInvoiceStore';
import InvoicePrintTemplate from '../components/InvoicePrintTemplate';
import EditInvoiceModal from '../components/EditInvoiceModal';
import { useAuth } from '../context/AuthContext';
import { notifications } from '@mantine/notifications';
import html2pdf from 'html2pdf.js';
import { useTranslation } from 'react-i18next';

function InvoiceItemRow({ item, products, invoiceType, onQuantityChange, onRemove, onEdit, maxStock }) {
  const { t } = useTranslation();
  const product = products.find((p) => p.id === item.product_id);
  const displayName = item.product_name || product?.name || `#${item.product_id ?? item.batch_id}`;
  const unitPrice = invoiceType === 'sale' ? Number(item.sale_price || 0) : Number(item.purchase_price || 0);
  const lineTotal = unitPrice * Number(item.quantity);

  const handleQtyInput = (e) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    if (val === '') return;
    let n = parseInt(val, 10);
    if (n < 1) n = 1;
    if (invoiceType === 'sale' && maxStock != null && n > maxStock) n = maxStock;
    onQuantityChange(item.product_id, n);
  };

  const handleIncrement = () => {
    const next = item.quantity + 1;
    if (invoiceType === 'sale' && maxStock != null && next > maxStock) return;
    onQuantityChange(item.product_id, next);
  };

  return (
    <div className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors group">
      <div className="col-span-4 flex flex-col">
        <span className="text-label-md text-charcoal-ink truncate">{displayName}</span>
        {invoiceType === 'purchase' && item.purchase_price !== undefined && (
          <span className="font-mono-tabular text-label-sm text-muted-steel mt-0.5">
            {t('invoices.buy')}: {Number(item.purchase_price).toLocaleString()} | {t('invoices.sell')}: {Number(item.selling_price).toLocaleString()}
          </span>
        )}
        {invoiceType === 'sale' && item.sale_price != null && (
          <span className="font-mono-tabular text-label-sm text-muted-steel mt-0.5">
            {t('common.price')}: {Number(item.sale_price).toLocaleString()}
          </span>
        )}
      </div>
      <div className="col-span-3 flex justify-center">
        <div className="flex items-center gap-0 bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden">
          <button onClick={() => onQuantityChange(item.product_id, Math.max(1, item.quantity - 1))} className="p-1.5 text-muted-steel hover:text-accent hover:bg-accent-surface transition-colors cursor-pointer"><Minus size={14} /></button>
          <input
            type="text"
            inputMode="numeric"
            value={item.quantity}
            onChange={handleQtyInput}
            className="w-10 text-center font-mono-tabular text-label-md text-charcoal-ink border-x border-outline-variant/40 py-1 bg-transparent outline-none focus:bg-accent-surface/20 transition-colors"
          />
          <button onClick={handleIncrement} className="p-1.5 text-muted-steel hover:text-accent hover:bg-accent-surface transition-colors cursor-pointer"><Plus size={14} /></button>
        </div>
      </div>
      <div className="col-span-3 text-right">
        <span className="font-mono-tabular text-label-md text-charcoal-ink font-medium">{t('common.currency')} {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="col-span-2 flex justify-end gap-1">
        <button onClick={() => onEdit(item)} className="p-1.5 rounded-xl text-muted-steel/50 hover:bg-accent-surface hover:text-accent transition-all opacity-0 group-hover:opacity-100 cursor-pointer btn-tactile" title={t('common.edit')}><Edit size={14} /></button>
        <button onClick={() => onRemove(item.product_id)} className="p-1.5 rounded-xl text-error/50 hover:bg-error-container/20 hover:text-error transition-all opacity-0 group-hover:opacity-100 cursor-pointer btn-tactile" title={t('common.delete')}><Trash2 size={14} /></button>
      </div>
    </div>
  );
}


export default function InvoicesView() {
  const { t, i18n } = useTranslation();
  const {
    invoiceType, selectedParty, items,
    setInvoiceType, setSelectedParty,
    addItem: storeAddItem, updateItem, updateQuantity, removeItem, clearCart,
  } = useInvoiceStore();

  const isSale = invoiceType === 'sale' || invoiceType === 'sale_return';
  const partyInfoLabel = isSale ? t('invoices.clientInfo') : t('invoices.supplierInfo');
  const partyLabel = isSale ? t('invoices.selectClient') : t('invoices.selectSupplier');
  const partyEntityLabel = isSale ? t('parties.client') : t('parties.supplier');
  const partyNameLabel = isSale ? t('invoices.clientName') : t('invoices.supplierName');
  const partyNamePlaceholder = isSale ? t('invoices.enterClientName') : t('invoices.enterSupplierName');
  const partySelectPlaceholder = isSale ? t('invoices.selectClientPlaceholder') : t('invoices.selectSupplierPlaceholder');
  const dateLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';

  const formatInvoiceType = (value) => {
    const key = String(value || '').toLowerCase();
    const fallback = String(value || '').replace('_', ' ');
    return t(`invoices.typeLabels.${key}`, { defaultValue: fallback });
  };

  const formatStatus = (value) => {
    const key = String(value || '').toLowerCase();
    return t(`invoices.status.${key}`, { defaultValue: value || '' });
  };

  const [parties, setParties] = useState([]);
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [autoFetchedCost, setAutoFetchedCost] = useState(null);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemQuantity, setItemQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [lastInvoice, setLastInvoice] = useState(null);
  const [templates, setTemplates] = useState([]);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
  const [paperSize, setPaperSize] = useState('a4');
  const [amountPaid, setAmountPaid] = useState('');
  const [deliveryFee, setDeliveryFee] = useState('');
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkInvoicesToPrint, setBulkInvoicesToPrint] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [activeTab, setActiveTab] = useState('create');
  const [historySearch, setHistorySearch] = useState('');
  const [isNewParty, setIsNewParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [hasDelivery, setHasDelivery] = useState(false);

  const { user } = useAuth();
  const tenantName = user?.tenant?.company_name || 'ERP Dashboard';
  const defaultFooterText = user?.tenant?.default_footer_text || user?.tenant?.print_notes || null;
  const logoUrl = user?.tenant?.logo_url || null;
  const taxNumber = user?.tenant?.tax_number || null;
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  function loadHistory() {
    api.getInvoices().then(setInvoiceHistory).catch(() => {});
  }

  async function handleDeleteInvoice(invoiceId) {
    try {
      await api.deleteInvoice(invoiceId);
      setInvoiceToDelete(null);
      loadHistory();
      api.getInventoryReport().then(setInventory);
    } catch (err) {
      notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.errorDeleting'), color: 'red' });
    }
  }

  const [availableParties, setAvailableParties] = useState([]);

  useEffect(() => {
    Promise.all([
      api.getProducts(),
      api.getInventoryReport(),
      api.getTemplates()
    ])
      .then(([pr, inv, tmpl]) => { setProducts(pr); setInventory(inv); setTemplates(tmpl); })
      .catch((err) => notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.failedLoadInitialData'), color: 'red' }));
    loadHistory();

    Promise.all([api.getCustomersSelect().catch(()=>[]), api.getSuppliersSelect().catch(()=>[])])
      .then(([c, s]) => {
         const custs = Array.isArray(c) ? c : (c.data || c.items || []);
         const supps = Array.isArray(s) ? s : (s.data || s.items || []);
         setParties([
           ...custs.map(x=>({...x, party_type: 'client'})),
           ...supps.map(x=>({...x, party_type: 'supplier'}))
         ]);
      }).catch((err) => notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.failedLoadParties'), color: 'red' }));
  }, []);

  useEffect(() => {
    let active = true;
    async function fetchAvailableParties() {
      try {
        let res;
        if (invoiceType === 'sale' || invoiceType === 'sale_return') {
          res = await api.getCustomersSelect();
        } else if (invoiceType === 'purchase' || invoiceType === 'purchase_return') {
          res = await api.getSuppliersSelect();
        }
        if (active) {
          setAvailableParties(Array.isArray(res) ? res : (res?.data || res?.items || []));
        }
      } catch (err) {
        notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.failedFetchAvailableParties'), color: 'red' });
      }
    }
    fetchAvailableParties();
    return () => { active = false; };
  }, [invoiceType]);

  useEffect(() => {
    if (!selectedProduct) {
      setAutoFetchedCost(null);
      return;
    }
    const prod = products.find(p => String(p.id) === String(selectedProduct));
    if (!prod) return;
    if (invoiceType === 'purchase') {
      if (prod.last_purchase_price) setPurchasePrice(prod.last_purchase_price);
    } else if (invoiceType === 'sale') {
      const cost = prod.current_cost != null ? prod.current_cost : prod.last_purchase_price;
      setAutoFetchedCost(cost != null ? Number(cost) : null);
      const sell = prod.current_selling_price;
      if (sell != null && !salePrice) setSalePrice(String(sell));
    }
  }, [selectedProduct, products, invoiceType]);

  // Compute available stock for the currently selected product (sale invoices)
  const selectedAvailableStock = (() => {
    if (invoiceType !== 'sale' || !selectedProduct) return null;
    const stockProd = inventory?.products?.find(ip => String(ip.product_id) === String(selectedProduct));
    if (!stockProd) return null;
    return stockProd.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) ?? null;
  })();

  const addItem = useCallback(() => {
    if (!selectedProduct) return;
    const qty = parseInt(itemQuantity) || 1;

    // Block adding when stock is exhausted for sale invoices
    if (invoiceType === 'sale' && selectedAvailableStock != null && selectedAvailableStock <= 0 && !editingItemId) return;

    if (editingItemId) {
      const updates = { quantity: qty };
      if (invoiceType === 'purchase') {
        updates.purchase_price = parseFloat(purchasePrice) || 0;
        updates.selling_price = parseFloat(sellingPrice) || 0;
      }
      if (invoiceType === 'sale') {
        updates.sale_price = parseFloat(salePrice) || undefined;
        updates.purchase_price = autoFetchedCost != null ? autoFetchedCost : undefined;
      }
      updateItem(editingItemId, updates);
      setEditingItemId(null);
    } else {
      const newItem = { product_id: parseInt(selectedProduct), quantity: qty };
      if (invoiceType === 'purchase') {
        newItem.purchase_price = parseFloat(purchasePrice) || 0;
        newItem.selling_price = parseFloat(sellingPrice) || 0;
      }
      if (invoiceType === 'sale') {
        newItem.sale_price = parseFloat(salePrice) || undefined;
        newItem.purchase_price = autoFetchedCost != null ? autoFetchedCost : undefined;
      }
      storeAddItem(newItem);
    }
    setSelectedProduct('');
    setProductSearch('');
    setPurchasePrice('');
    setSellingPrice('');
    setSalePrice('');
    setItemQuantity('1');
    setAutoFetchedCost(null);
  }, [selectedProduct, invoiceType, purchasePrice, sellingPrice, salePrice, itemQuantity, autoFetchedCost, storeAddItem, updateItem, editingItemId, selectedAvailableStock]);

  function handleEditItem(item) {
    const prod = products.find(p => p.id === item.product_id);
    setSelectedProduct(String(item.product_id));
    setProductSearch(prod?.name || '');
    setItemQuantity(String(item.quantity));
    setEditingItemId(item.product_id);
    if (invoiceType === 'purchase') {
      setPurchasePrice(String(item.purchase_price || ''));
      setSellingPrice(String(item.selling_price || ''));
    }
    if (invoiceType === 'sale') {
      setSalePrice(String(item.sale_price || ''));
      setAutoFetchedCost(item.purchase_price != null ? Number(item.purchase_price) : null);
    }
  }


  async function handleCreateNewProduct() {
    if (!productSearch.trim()) return;
    setCreatingProduct(true);
    try {
      const newProd = await api.createProduct({ name: productSearch.trim() });
      setProducts([...products, newProd]);
      setSelectedProduct(newProd.id);
      setProductSearch(newProd.name);
      setShowProductDropdown(false);
    } catch (err) {
      notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.errorCreatingProduct'), color: 'red' });
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleSubmit() {
    if (items.length === 0) return;

    let partyId = selectedParty ? parseInt(selectedParty) : null;

    // If new party mode, create the party first
    if (isNewParty) {
      if (!newPartyName.trim()) {
        notifications.show({ title: t('common.validationError'), message: t('invoices.pleaseEnterName', { party: partyLabel }), color: 'red' });
        return;
      }
      setSubmitting(true);
      try {
        const payload = {
          name: newPartyName.trim(),
          phone: newPartyPhone.trim() || null,
          address: newPartyAddress.trim() || null,
        };
        let newParty;
        if (invoiceType === 'sale' || invoiceType === 'sale_return') {
          newParty = await api.createCustomer(payload);
          newParty.party_type = 'client';
        } else {
          newParty = await api.createSupplier(payload);
          newParty.party_type = 'supplier';
        }
        partyId = newParty.id;
        setParties(prev => [...prev, newParty]);
        setSelectedParty(String(newParty.id));
        setIsNewParty(false);
        setNewPartyName('');
        setNewPartyPhone('');
        setNewPartyAddress('');
      } catch (err) {
        notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.errorCreatingParty'), color: 'red' });
        setSubmitting(false);
        return;
      }
    } else if (!partyId) {
      notifications.show({ title: t('common.validationError'), message: t('invoices.pleaseSelectParty', { party: partyEntityLabel }), color: 'red' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        party_id: partyId,
        amount_paid: parseFloat(amountPaid) || 0,
        delivery_fee: hasDelivery ? (parseFloat(deliveryFee) || 0) : 0,
        items: items.map((i) => {
          if (invoiceType === 'purchase') {
            return { product_id: i.product_id, quantity: i.quantity, purchase_price: i.purchase_price, selling_price: i.selling_price };
          }
          return {
            product_id: i.product_id,
            quantity: i.quantity,
            ...(i.sale_price != null ? { sale_price: i.sale_price } : {}),
            ...(i.purchase_price != null ? { purchase_price: i.purchase_price } : {}),
          };
        }),
      };
      const result = invoiceType === 'sale' ? await api.createSaleInvoice(payload) : await api.createPurchaseInvoice(payload);
      setLastInvoice(result);
      clearCart();
      setAmountPaid('');
      setDeliveryFee('');
      setHasDelivery(false);
      setSalePrice('');
      setAutoFetchedCost(null);
      loadHistory();
      api.getInventoryReport().then(setInventory);
      notifications.show({ title: t('common.success'), message: t('invoices.invoiceSaved'), color: 'green' });
    } catch (err) {
      notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.errorSaving'), color: 'red' });
    }
    finally { setSubmitting(false); }
  }

  function handleOpenPrintPreview(invoiceData) {
    setInvoiceToPrint(invoiceData);
  }

  function handleClosePrintPreview() {
    setInvoiceToPrint(null);
    setBulkInvoicesToPrint([]);
  }

  const printPortalRef = useRef(null);
  const invoicePrintRef = useRef(null);

  function handleConfirmPrint() {
    const portal = printPortalRef.current;
    if (!portal) { window.print(); return; }
    portal.style.display = 'block';
    document.body.classList.add('printing');
    requestAnimationFrame(() => {
      window.print();
      portal.style.display = 'none';
      document.body.classList.remove('printing');
    });
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function handleBulkPrint() {
    const selected = invoiceHistory.filter(inv => selectedIds.has(inv.id));
    if (selected.length === 0) return;
    setBulkInvoicesToPrint(selected);
  }

  async function handlePrintFromTemplate() {
    if (!lastInvoice || templates.length === 0) return;
    setLoadingPreview(true);
    try {
      const hydratedData = await api.previewTemplate(templates[0].id, lastInvoice.id);
      handleOpenPrintPreview(hydratedData);
    } catch (err) {
      notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.errorPrint'), color: 'red' });
    }
    finally { setLoadingPreview(false); }
  }

  const partyForPrint = invoiceToPrint
    ? parties.find((p) => p.id === invoiceToPrint.party_id) || (invoiceToPrint.party_name ? {
        name: invoiceToPrint.party_name,
        phone: invoiceToPrint.party_phone,
        address: invoiceToPrint.party_address,
      } : null)
    : null;

  const subtotal = items.reduce((sum, item) => {
    if (invoiceType === 'purchase') {
      return sum + (item.quantity * (item.purchase_price || 0));
    } else {
      const sp = item.sale_price != null ? item.sale_price : (() => {
        const invProd = inventory?.products?.find(p => String(p.product_id) === String(item.product_id));
        const best = invProd?.batches?.filter(b => Number(b.remaining_quantity) > 0)
          .reduce((acc, b) => (!acc || Number(b.selling_price) > Number(acc.selling_price) ? b : acc), null)
          ?? invProd?.batches?.reduce((acc, b) => (!acc || Number(b.selling_price) > Number(acc.selling_price) ? b : acc), null);
        return best?.selling_price || 0;
      })();
      return sum + (item.quantity * sp);
    }
  }, 0);

  const totalProfit = invoiceType === 'sale'
    ? items.reduce((sum, item) => {
        if (item.sale_price != null && item.purchase_price != null) {
          return sum + (Number(item.sale_price) - Number(item.purchase_price)) * Number(item.quantity);
        }
        return sum;
      }, 0)
    : 0;

  const totalAmount = subtotal + (parseFloat(deliveryFee) || 0);

  const remainingBalance = Math.max(0, totalAmount - (parseFloat(amountPaid) || 0));

  const inputClass = "w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-charcoal-ink focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all duration-200";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <>
      <div className="print:hidden">
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
            <div>
              <h2 className="text-h1 text-charcoal-ink">{t('invoices.title')}</h2>
              <p className="text-body-base text-muted-steel mt-1">{t('invoices.subtitle')}</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-1 flex gap-1 shadow-whisper">
              <button onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-lg text-label-md transition-all duration-200 cursor-pointer btn-tactile flex items-center gap-2
                  ${activeTab === 'create' ? 'bg-accent text-on-primary shadow-sm' : 'text-muted-steel hover:bg-surface-container-low'}`}>
                <Plus size={16} /> {t('invoices.addInvoice')}
              </button>
              <button onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg text-label-md transition-all duration-200 cursor-pointer btn-tactile flex items-center gap-2
                  ${activeTab === 'history' ? 'bg-accent text-on-primary shadow-sm' : 'text-muted-steel hover:bg-surface-container-low'}`}>
                <Package size={16} /> {t('invoices.history')}
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'create' && (
        <div className="max-w-7xl mx-auto space-y-6 px-6">
          <div className="mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
            <h2 className="text-h3 text-charcoal-ink">{t('invoices.invoiceDetails')}</h2>
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-1 flex gap-1 shadow-whisper">
              {[
                { key: 'sale', label: t('invoices.saleInvoice') },
                { key: 'purchase', label: t('invoices.purchaseInvoice') }
              ].map(({ key, label }) => (
                <button key={key} onClick={() => {
                  if (invoiceType !== key) {
                    setInvoiceType(key);
                    setSelectedParty('');
                  }
                }}
                  className={`px-4 py-1.5 rounded-lg text-label-md capitalize transition-all duration-200 cursor-pointer btn-tactile
                    ${invoiceType === key ? 'bg-accent text-on-primary shadow-sm' : 'text-muted-steel hover:bg-surface-container-low'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper animate-fade-in-up stagger-1">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/30">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-accent-surface text-accent"><UserSquare2 size={18} /></div>
                    <h3 className="text-h3 text-charcoal-ink">{partyInfoLabel}</h3>
                  </div>
                  {invoiceType === 'sale' && (
                    <button
                      onClick={() => { setIsNewParty(!isNewParty); if (!isNewParty) setSelectedParty(''); }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-label-sm transition-all cursor-pointer btn-tactile ${
                        isNewParty
                          ? 'bg-accent text-on-primary shadow-sm'
                          : 'text-accent border border-accent/30 hover:bg-accent-surface'
                      }`}
                    >
                      <UserPlus size={14} />
                      {isNewParty ? t('invoices.selectExisting') : (isSale ? t('invoices.newClient') : t('invoices.newSupplier'))}
                    </button>
                  )}
                </div>

                {!isNewParty ? (
                  <div>
                    <Select
                      label={partyLabel}
                      placeholder={partySelectPlaceholder}
                      value={selectedParty ? String(selectedParty) : null}
                      onChange={(val) => setSelectedParty(val || '')}
                      data={availableParties.map((p) => ({
                        value: String(p.id),
                        label: `${p.name}${p.phone ? ` — ${p.phone}` : ''}`
                      }))}
                      searchable
                      clearable
                      required
                      withAsterisk
                      classNames={{
                        input: "bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-4 py-2.5 text-sm text-charcoal-ink focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200",
                        label: "text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5"
                      }}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{partyNameLabel} *</label>
                      <div className="relative">
                        <UserSquare2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                        <input
                          type="text"
                          value={newPartyName}
                          onChange={(e) => setNewPartyName(e.target.value)}
                          placeholder={partyNamePlaceholder}
                          className={`${inputClass} pr-10`}
                          dir="rtl"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.phoneNumber')}</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                          <input
                            type="tel"
                            value={newPartyPhone}
                            onChange={(e) => setNewPartyPhone(e.target.value)}
                            placeholder={t('parties.phonePlaceholder')}
                            className={`${inputClass} pl-10`}
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.addressLabel')}</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                          <input
                            type="text"
                            value={newPartyAddress}
                            onChange={(e) => setNewPartyAddress(e.target.value)}
                            placeholder={t('invoices.addressPlaceholder')}
                            className={`${inputClass} pr-10`}
                            dir="rtl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper animate-fade-in-up stagger-2">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-outline-variant/30">
                  <div className="p-1.5 rounded-lg bg-accent-surface text-accent"><Package size={18} /></div>
                  <h3 className="text-h3 text-charcoal-ink">{t('invoices.lineItems')}</h3>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-4 items-end">
                  <div className="relative flex-1">
                    <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.product')}</label>
                    <input 
                      type="text" 
                      value={productSearch}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                        const exact = products.find(p => p.name.toLowerCase() === e.target.value.toLowerCase());
                        setSelectedProduct(exact ? exact.id : '');
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                      placeholder={t('invoices.searchOrAddProduct')}
                      className={inputClass}
                    />
                    {showProductDropdown && (
                      <div className="absolute top-full mt-1 left-0 w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                        {products
                          .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                          .filter(p => editingItemId === p.id || !items.some(i => i.product_id === p.id))
                          .map(p => {
                            const stock = inventory?.products?.find(ip => String(ip.product_id) === String(p.id));
                            const stockQty = stock ? stock.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) : null;
                            return (
                              <div
                                key={p.id}
                                className="px-4 py-2 hover:bg-surface-container-low cursor-pointer text-charcoal-ink text-sm flex items-center justify-between"
                                onClick={() => {
                                  setProductSearch(p.name);
                                  setSelectedProduct(p.id);
                                  setShowProductDropdown(false);
                                }}
                              >
                                <span>{p.name}</span>
                                {invoiceType === 'sale' && stockQty != null && (
                                  <span className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded-md ${stockQty > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                    {t('invoices.stock')}: {stockQty}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        {productSearch && !products.some(p => p.name.toLowerCase() === productSearch.toLowerCase()) && invoiceType === 'purchase' && (
                          <div
                            className="px-4 py-2 text-accent hover:bg-accent-surface cursor-pointer flex items-center gap-2 text-sm border-t border-outline-variant/30"
                            onClick={handleCreateNewProduct}
                          >
                            {creatingProduct ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {t('invoices.addNewProductPrompt', { name: productSearch })}
                          </div>
                        )}
                        {!productSearch && products.filter(p => editingItemId === p.id || !items.some(i => i.product_id === p.id)).length === 0 && (
                          <div className="px-4 py-2 text-muted-steel text-sm">{t('invoices.noProductsAvailable')}</div>
                        )}
                      </div>
                    )}
                  </div>
                  {invoiceType === 'purchase' && (
                    <div className="flex flex-col gap-0">
                      <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.purchasePriceLabel')}</label>
                      <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" className={`sm:w-28 ${inputClass}`} />
                    </div>
                  )}
                  {invoiceType === 'sale' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.sellPriceLabel')}</label>
                      <input
                        type="number"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="0"
                        className={`sm:w-32 ${inputClass}`}
                      />
                      {autoFetchedCost != null && (
                        <span className="text-[10px] text-muted-steel px-1">
                          {t('invoices.cost')}: <span className="font-mono font-semibold text-charcoal-ink">{autoFetchedCost.toLocaleString()}</span>
                          {salePrice && parseFloat(salePrice) > 0 && (
                            <span className={`ml-2 font-bold ${
                              parseFloat(salePrice) - autoFetchedCost > 0 ? 'text-emerald-600' : 'text-red-500'
                            }`}>
                              {parseFloat(salePrice) - autoFetchedCost > 0 ? '+' : ''}
                              {(parseFloat(salePrice) - autoFetchedCost).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                            </span>
                          )}
                        </span>
                      )}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.quantityLabel')}</label>
                    <input
                      type="number"
                      value={itemQuantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (invoiceType === 'sale' && selectedProduct) {
                          const stockProd = inventory?.products?.find(ip => String(ip.product_id) === String(selectedProduct));
                          const avail = stockProd ? stockProd.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) : null;
                          if (avail != null && parseInt(val) > avail) {
                            setItemQuantity(String(avail));
                            return;
                          }
                        }
                        setItemQuantity(val);
                      }}
                      placeholder="1"
                      min="1"
                      className={`sm:w-20 ${inputClass} text-center`}
                    />
                    {invoiceType === 'sale' && selectedProduct && (() => {
                      const stockProd = inventory?.products?.find(ip => String(ip.product_id) === String(selectedProduct));
                      const avail = stockProd ? stockProd.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) : null;
                      if (avail != null) return (
                        <span className={`text-[10px] font-mono-tabular px-1 ${avail > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {t('invoices.available')}: {avail}
                        </span>
                      );
                      return null;
                    })()}
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={addItem} disabled={!selectedProduct || (invoiceType === 'sale' && selectedAvailableStock != null && selectedAvailableStock <= 0 && !editingItemId)}
                      className={`px-4 py-2 rounded-xl text-on-primary text-label-md shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer btn-tactile ${
                        editingItemId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-accent hover:bg-accent-hover'
                      }`}>
                      {editingItemId ? <><Edit size={14} /> {t('common.update')}</> : <><Plus size={16} /> {t('common.add')}</>}
                    </button>
                    {editingItemId && (
                      <button onClick={() => { setEditingItemId(null); setSelectedProduct(''); setProductSearch(''); setPurchasePrice(''); setSellingPrice(''); setSalePrice(''); setItemQuantity('1'); setAutoFetchedCost(null); }}
                        className="p-2 rounded-xl text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile">
                        <X size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-outline-variant/40 rounded-xl overflow-hidden">
                  <div className="grid grid-cols-12 gap-2 px-4 py-2.5 bg-surface-container-low/30 border-b border-outline-variant/30 text-label-sm text-muted-steel/70 uppercase tracking-wider">
                    <div className="col-span-4">{t('invoices.productHeader')}</div>
                    <div className="col-span-3 text-center">{t('invoices.qtyHeader')}</div>
                    <div className="col-span-3 text-right">{t('invoices.totalHeader')}</div>
                    <div className="col-span-2 text-right">{t('invoices.actionsHeader')}</div>
                  </div>
                  <div className="bg-surface-container-lowest">
                    {items.length > 0 ? (
                      items.map((item) => {
                        const stockProd = inventory?.products?.find(ip => String(ip.product_id) === String(item.product_id));
                        const maxStock = invoiceType === 'sale' && stockProd ? stockProd.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) : undefined;
                        return <InvoiceItemRow key={item.product_id} item={item} products={products} invoiceType={invoiceType} onQuantityChange={updateQuantity} onRemove={removeItem} onEdit={handleEditItem} maxStock={maxStock} />;
                      })
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-steel">
                        <ShoppingCart size={32} strokeWidth={1.2} className="mb-3 opacity-30" />
                        <p className="text-body-base text-charcoal-ink">{t('invoices.noItemsAdded')}</p>
                        <p className="text-body-sm text-muted-steel mt-1">{t('invoices.noItemsHint')}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper relative overflow-hidden animate-fade-in-up stagger-3">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-accent rounded-t-2xl" />
                <h3 className="text-h3 text-charcoal-ink mb-4 mt-1">{t('invoices.currentOrder')}</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-body-sm text-muted-steel">
                    <span>{t('invoices.itemsCount')}</span>
                    <span className="font-mono-tabular text-charcoal-ink font-medium">{items.length}</span>
                  </div>
                  {items.length > 0 && (
                    <>
                      <div className="flex justify-between items-center text-body-sm text-muted-steel border-t border-outline-variant/30 pt-2">
                        <span>{t('invoices.subtotal')}</span>
                        <span className="font-mono-tabular text-charcoal-ink font-medium">{t('common.currency')} {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>

                      {/* Delivery Toggle */}
                      <div className="border-t border-outline-variant/30 pt-2 space-y-2">
                        <div className="flex justify-between items-center">
                          <button
                            onClick={() => { setHasDelivery(!hasDelivery); if (hasDelivery) setDeliveryFee(''); }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-label-sm transition-all cursor-pointer btn-tactile ${
                              hasDelivery
                                ? 'bg-accent text-on-primary shadow-sm'
                                : 'text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low'
                            }`}
                          >
                            <Truck size={14} />
                            {hasDelivery ? t('invoices.hasDelivery') : t('invoices.addDelivery')}
                          </button>
                          {hasDelivery && (
                            <input
                              type="number"
                              value={deliveryFee}
                              onChange={(e) => setDeliveryFee(e.target.value)}
                              placeholder={t('invoices.deliveryPrice')}
                              className="w-28 bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1.5 text-sm text-right text-charcoal-ink focus:border-accent outline-none"
                              autoFocus
                            />
                          )}
                        </div>
                        {hasDelivery && deliveryFee && (
                          <div className="flex justify-between items-center text-body-sm text-muted-steel">
                            <span>{t('invoices.deliveryFee')}</span>
                            <span className="font-mono-tabular text-charcoal-ink font-medium">{t('common.currency')} {Number(deliveryFee || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-body-sm text-muted-steel border-t border-outline-variant/30 pt-2">
                        <span>{t('invoices.totalAmount')}</span>
                        <span className="font-mono-tabular text-charcoal-ink font-medium">{t('common.currency')} {totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      {invoiceType === 'sale' && totalProfit !== 0 && (
                        <div className="flex justify-between items-center text-body-sm border-t border-outline-variant/30 pt-2">
                          <span className="text-muted-steel">{t('invoices.estProfit')}</span>
                          <span className={`font-mono-tabular font-bold text-sm ${
                            totalProfit > 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {totalProfit > 0 ? '+' : ''}{t('common.currency')} {totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-body-sm text-muted-steel pt-1">
                        <span>{t('invoices.amountPaid')}</span>
                        <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0.00" className="w-24 bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1 text-sm text-right text-charcoal-ink focus:border-accent outline-none" />
                      </div>
                      <div className="flex justify-between items-center text-label-md text-charcoal-ink border-t border-outline-variant/30 pt-2">
                        <span>{t('invoices.remainingBalance')}</span>
                        <span className="font-mono-tabular font-medium text-error">{t('common.currency')} {Math.max(0, totalAmount - (parseFloat(amountPaid) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    </>
                  )}
                </div>
                <button onClick={handleSubmit} disabled={submitting || (!selectedParty && !isNewParty) || items.length === 0 || (isNewParty && !newPartyName.trim())}
                  className="w-full bg-accent hover:bg-accent-hover text-on-primary text-label-md py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer btn-tactile">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> {t('invoices.generateInvoice')}</>}
                </button>
              </div>

              {lastInvoice && (
                <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper relative overflow-hidden animate-scale-in">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent to-accent-muted rounded-t-2xl" />
                  <h3 className="text-h3 text-charcoal-ink mb-4 mt-1">{t('invoices.lastGenerated')}</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-body-sm text-muted-steel border-b border-outline-variant/20 pb-2">
                      <span>{t('invoices.invoiceId')}</span>
                      <span className="font-mono-tabular text-charcoal-ink">#{lastInvoice.id}</span>
                    </div>
                    <div className="flex justify-between items-center text-body-sm text-muted-steel border-b border-outline-variant/20 pb-2">
                      <span>{t('common.status')}</span>
                      <span className={`text-label-sm px-2 py-0.5 rounded-lg ${lastInvoice.status === 'paid' ? 'bg-accent-surface text-accent' : 'bg-error-container/30 text-error'}`}>{formatStatus(lastInvoice.status)}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                      <span className="text-label-md text-charcoal-ink">{t('invoices.totalAmount')}</span>
                      <span className="text-h2 text-accent font-mono-tabular tracking-tight">{t('common.currency')} {Number(lastInvoice.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button onClick={() => handleOpenPrintPreview(lastInvoice)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
                      <Printer size={18} />
                      {t('invoices.printInvoice')}
                    </button>
                    {templates.length > 0 && (
                      <button onClick={handlePrintFromTemplate} disabled={loadingPreview}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-label-md border border-outline-variant/60 text-charcoal-ink hover:bg-surface-container-low transition-all duration-200 cursor-pointer btn-tactile disabled:opacity-50">
                        {loadingPreview ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                        {t('invoices.template')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        )}

      {activeTab === 'history' && (
        <div className="max-w-7xl mx-auto space-y-6 px-6">
          <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl shadow-whisper animate-fade-in-up">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-6 border-b border-outline-variant/30 gap-4">
              <h3 className="text-h3 text-charcoal-ink">{t('invoices.previousInvoices')}</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel" />
                  <input 
                    type="text" 
                    placeholder={t('invoices.searchByIdOrType')}
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-sm focus:border-accent outline-none"
                  />
                </div>
                {selectedIds.size > 0 && (
                  <button onClick={handleBulkPrint}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 transition-all shadow-sm cursor-pointer btn-tactile">
                    <Printer size={16} /> {t('invoices.printSelected')} ({selectedIds.size})
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-3 px-4 text-left w-10"></th>
                    <th className="py-3 px-4 text-left">{t('common.id')}</th>
                    <th className="py-3 px-4 text-left">{t('invoices.party')}</th>
                    <th className="py-3 px-4 text-left">{t('invoices.type')}</th>
                    <th className="py-3 px-4 text-right">{t('common.total')}</th>
                    <th className="py-3 px-4 text-center">{t('common.status')}</th>
                    <th className="py-3 px-4 text-left">{t('common.date')}</th>
                    <th className="py-3 px-4 text-right">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceHistory.filter(inv => {
                    if (!historySearch) return true;
                    const s = historySearch.toLowerCase();
                    return String(inv.id).includes(s) || inv.invoice_type.replace('_', ' ').toLowerCase().includes(s) || inv.status.toLowerCase().includes(s) || (inv.party_name || '').toLowerCase().includes(s);
                  }).map((inv) => (
                  <tr key={inv.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-4">
                      <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                        className="w-4 h-4 rounded border-outline-variant/60 text-accent focus:ring-accent/20 cursor-pointer" />
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-charcoal-ink">#{String(inv.id).padStart(5, '0')}</td>
                    <td className="py-3 px-4 text-charcoal-ink font-medium">{inv.party_name || <span className="text-muted-steel/50 italic text-xs">—</span>}</td>
                    <td className="py-3 px-4 capitalize text-muted-steel">{formatInvoiceType(inv.invoice_type)}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-charcoal-ink">{t('common.currency')} {Number(inv.total_amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg ${inv.status === 'paid' ? 'bg-accent-surface text-accent' : inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-error-container/30 text-error'}`}>{formatStatus(inv.status)}</span>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-muted-steel text-xs">{inv.created_at ? new Date(inv.created_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: '2-digit' }) : '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(inv.invoice_type === 'SALE' || inv.invoice_type === 'PURCHASE') && (
                          <button onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile"
                            title={t('common.edit')}>
                            <Edit size={16} />
                          </button>
                        )}
                        <button onClick={() => handleOpenPrintPreview(inv)}
                          className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile"
                          title={t('common.print')}>
                          <Printer size={16} />
                        </button>
                        <button onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 rounded-xl text-muted-steel hover:bg-error-container/30 hover:text-error transition-all cursor-pointer btn-tactile"
                          title={t('common.delete')}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
            {invoiceHistory.length === 0 && (
              <div className="p-8 text-center text-muted-steel">
                {t('invoices.noInvoices')}
              </div>
            )}
          </div>
        </div>
      )}
      </div>

      {invoiceToPrint && (
        <>
          <div className="print:hidden fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-lowest border-b border-outline-variant/60 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-surface text-accent flex items-center justify-center">
                  <Printer size={16} />
                </div>
                <div>
                  <h3 className="text-label-md text-charcoal-ink font-semibold leading-tight">{t('invoices.printPreview')}</h3>
                  <p className="text-[11px] text-muted-steel mt-0.5">{t('invoices.invoiceId')} #{String(invoiceToPrint.id).padStart(5, '0')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="px-3 py-2 rounded-xl text-label-md border border-outline-variant/60 bg-surface-container-lowest text-muted-steel focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all text-sm cursor-pointer"
                >
                  <option value="a4">{t('invoices.a4Paper')}</option>
                  <option value="a5">{t('invoices.a5Paper')}</option>
                  <option value="receipt">{t('invoices.receipt')}</option>
                </select>
                <button onClick={handleClosePrintPreview}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile">
                  <X size={16} />
                  {t('common.cancel')}
                </button>
                <button
                  onClick={async () => {
                    const el = invoicePrintRef.current?.querySelector('.invoice-print-area');
                    if (!el) return;
                    setDownloadingPdf(true);
                    try {
                      await html2pdf()
                        .set({
                          margin: 0,
                          filename: `Invoice_#${invoiceToPrint.id}.pdf`,
                          image: { type: 'jpeg', quality: 0.98 },
                          html2canvas: { scale: 2, useCORS: true },
                          jsPDF: { unit: 'mm', format: paperSize === 'a5' ? 'a5' : 'a4', orientation: 'portrait' },
                        })
                        .from(el)
                        .save();
                    } catch (err) {
                      notifications.show({ title: t('common.error'), message: err.response?.data?.detail || err.message || t('invoices.pdfFailed'), color: 'red' });
                    } finally {
                      setDownloadingPdf(false);
                    }
                  }}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  {t('invoices.savePdf')}
                </button>
                <button onClick={handleConfirmPrint}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile">
                  <Printer size={16} />
                  {t('invoices.confirmPrint')}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-8 flex justify-center">
              <div ref={invoicePrintRef} className="shadow-2xl rounded-xl overflow-hidden border border-outline-variant/30 self-start">
                <InvoicePrintTemplate
                  key={`${invoiceToPrint?.id || 'preview'}-${paperSize}`}
                  invoice={invoiceToPrint}
                  tenantName={tenantName}
                  partyName={partyForPrint?.name || t('common.unknown')}
                  partyPhone={partyForPrint?.phone || null}
                  partyAddress={partyForPrint?.address || null}
                  logoUrl={logoUrl}
                  defaultFooterText={defaultFooterText}
                  taxNumber={taxNumber}
                  paperSize={paperSize}
                />
              </div>
            </div>
          </div>

          {createPortal(
            <div ref={printPortalRef} className="print-portal" style={{ display: 'none' }}>
              <InvoicePrintTemplate
                key={`print-${invoiceToPrint?.id || 'preview'}-${paperSize}`}
                invoice={invoiceToPrint}
                tenantName={tenantName}
                partyName={partyForPrint?.name || t('common.unknown')}
                partyPhone={partyForPrint?.phone || null}
                partyAddress={partyForPrint?.address || null}
                logoUrl={logoUrl}
                defaultFooterText={defaultFooterText}
                taxNumber={taxNumber}
                paperSize={paperSize}
              />
            </div>,
            document.body
          )}
        </>
      )}

      {bulkInvoicesToPrint.length > 0 && (
        <>
          <div className="print:hidden fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 bg-surface-container-lowest border-b border-outline-variant/60 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-accent-surface text-accent flex items-center justify-center">
                  <Printer size={16} />
                </div>
                <h3 className="text-label-md text-charcoal-ink font-semibold">{t('invoices.bulkPrint', { count: bulkInvoicesToPrint.length })}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleClosePrintPreview}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile">
                  <X size={16} /> {t('common.cancel')}
                </button>
                <button onClick={handleConfirmPrint}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile">
                  <Printer size={16} /> {t('invoices.printAll')}
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-8 flex flex-col items-center gap-8">
              {bulkInvoicesToPrint.map((inv) => (
                <div key={inv.id} className="shadow-2xl rounded-xl overflow-hidden border border-outline-variant/30">
                  <InvoicePrintTemplate
                    invoice={inv}
                    tenantName={tenantName}
                    partyName={parties.find(p => p.id === inv.party_id)?.name || t('common.unknown')}
                    logoUrl={logoUrl}
                    defaultFooterText={defaultFooterText}
                    taxNumber={taxNumber}
                    paperSize={paperSize}
                  />
                </div>
              ))}
            </div>
          </div>

          {createPortal(
            <div ref={printPortalRef} className="print-portal" style={{ display: 'none' }}>
              {bulkInvoicesToPrint.map((inv) => (
                <InvoicePrintTemplate
                  key={inv.id}
                  invoice={inv}
                  tenantName={tenantName}
                  partyName={parties.find(p => p.id === inv.party_id)?.name || t('common.unknown')}
                  logoUrl={logoUrl}
                  defaultFooterText={defaultFooterText}
                  taxNumber={taxNumber}
                  paperSize={paperSize}
                />
              ))}
            </div>,
            document.body
          )}
        </>
      )}

      {editingInvoice && (
        <EditInvoiceModal
          invoice={editingInvoice}
          paperSize={paperSize}
          onPaperSizeChange={setPaperSize}
          onPrint={(printInvoice) => handleOpenPrintPreview(printInvoice)}
          onClose={() => setEditingInvoice(null)}
          onSaved={() => {
            setEditingInvoice(null);
            loadHistory();
            api.getInventoryReport().then(setInventory);
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
              <h3 className="text-h3 text-charcoal-ink mb-2">{t('invoices.deleteInvoice')}</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6">
                {t('invoices.deleteInvoiceMessage', { id: String(invoiceToDelete.id).padStart(5, '0') })}
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setInvoiceToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => handleDeleteInvoice(invoiceToDelete.id)}
                  className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile"
                >
                  {t('invoices.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
