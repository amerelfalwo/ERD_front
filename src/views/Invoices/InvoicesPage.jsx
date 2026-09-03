import React, { useState, useEffect, useCallback, useRef, useMemo, memo, Suspense, lazy } from 'react';
import { createPortal } from 'react-dom';
import {
  ShoppingCart, Plus, Minus, Trash2, Printer, Loader2,
  CheckCircle2, Package, UserSquare2, X, Edit, Undo2, Search,
  Truck, UserPlus, Phone, MapPin, Download, RotateCcw, Tag
} from 'lucide-react';
import { notifications } from '@mantine/notifications';
import api from '../../services/api';
import { useInvoiceStore } from '../../store/useInvoiceStore';
import InvoiceDocument from '../../components/invoice/InvoiceDocument';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { calculateInvoiceTotals } from '../../utils/calculateInvoiceTotals';
import { generatePdfFileName } from '../../services/invoiceService';

const EditInvoiceModal = lazy(() => import('./components/EditInvoiceModal'));
const ReturnInvoiceModal = lazy(() => import('./components/ReturnInvoiceModal'));


const InvoiceItemRow = memo(function InvoiceItemRow({ item, products, invoiceType, onQuantityChange, onRemove, onEdit, maxStock, inventoryProductsMap }) {
  const { t } = useTranslation();
  const product = products.find((p) => p.id === item.product_id);
  const displayName = item.product_name || product?.name || `#${item.product_id ?? item.batch_id}`;

  const getSalePrice = () => {
    if (item.sale_price != null) return item.sale_price;
    const invProd = inventoryProductsMap?.[String(item.product_id)];
    const best = invProd?.batches?.filter(b => Number(b.remaining_quantity) > 0)
      .reduce((acc, b) => (!acc || Number(b.selling_price) > Number(acc.selling_price) ? b : acc), null)
      ?? invProd?.batches?.reduce((acc, b) => (!acc || Number(b.selling_price) > Number(acc.selling_price) ? b : acc), null);
    return best?.selling_price || 0;
  };

  const unitPrice = invoiceType === 'sale' ? Number(getSalePrice()) : Number(item.purchase_price || 0);
  const lineTotal = unitPrice * Number(item.quantity);
  const costPrice = product?.purchase_price || product?.last_purchase_price || 0;
  const margin = invoiceType === 'sale' && unitPrice > 0 && costPrice > 0 ? (unitPrice - costPrice) * Number(item.quantity) : null;

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
    <div className="grid grid-cols-12 gap-2 items-center px-5 py-3 mx-2 my-1 rounded-2xl border border-outline-variant/20 hover:border-outline-variant/50 hover:bg-surface-container-low/60 hover:shadow-sm transition-all duration-300 group">
      <div className="col-span-4 flex flex-col">
        <span className="text-label-md font-bold text-charcoal-ink truncate">{displayName}</span>
        {invoiceType === 'purchase' && item.purchase_price !== undefined && (
          <span className="font-mono-tabular text-label-sm text-muted-steel mt-0.5">
            {t('invoices.buy', { defaultValue: 'شراء' })}: <strong className="text-charcoal-ink">{Number(item.purchase_price).toLocaleString()}</strong> | {t('invoices.sell', { defaultValue: 'بيع' })}: <strong className="text-charcoal-ink">{Number(item.selling_price).toLocaleString()}</strong>
          </span>
        )}
        {invoiceType === 'supplier_return' && item.purchase_price !== undefined && (
          <span className="font-mono-tabular text-label-sm text-error mt-0.5">
            {t('invoices.unitPrice', { defaultValue: 'سعر الوحدة' })}: <strong className="font-bold">{Number(item.purchase_price).toLocaleString()}</strong>
          </span>
        )}
        {invoiceType === 'sale' && (
          <span className="font-mono-tabular text-label-sm text-muted-steel mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>{t('invoices.price', { defaultValue: 'السعر' })}: <strong className="text-charcoal-ink">{Number(unitPrice).toLocaleString()}</strong></span>
            {costPrice > 0 && (
              <span className="text-[11px] text-muted-steel/70">({t('invoices.cost', { defaultValue: 'التكلفة' })}: {Number(costPrice).toLocaleString()})</span>
            )}
          </span>
        )}
      </div>

      <div className="col-span-3 flex flex-col items-center justify-center">
        <div className="flex items-center gap-0 bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden shadow-2xs">
          <button onClick={() => onQuantityChange(item.product_id, Math.max(1, item.quantity - 1))} className="p-1.5 text-muted-steel hover:text-accent hover:bg-accent-surface transition-colors cursor-pointer"><Minus size={14} /></button>
          <input
            type="text"
            inputMode="numeric"
            value={item.quantity}
            onChange={handleQtyInput}
            className="w-11 text-center font-mono-tabular font-bold text-label-md text-charcoal-ink border-x border-outline-variant/40 py-1 bg-transparent outline-none focus:bg-accent-surface/20 transition-colors"
          />
          <button onClick={handleIncrement} className="p-1.5 text-muted-steel hover:text-accent hover:bg-accent-surface transition-colors cursor-pointer"><Plus size={14} /></button>
        </div>
        {invoiceType === 'sale' && maxStock != null && (
          <span className={`text-[10px] font-mono-tabular mt-1 px-1.5 py-0.5 rounded-md ${maxStock > 0 ? 'bg-emerald-50 text-emerald-600 font-semibold' : 'bg-red-50 text-red-500'}`}>
            {t('invoices.available', { defaultValue: 'متاح' })}: {maxStock}
          </span>
        )}
      </div>

      <div className="col-span-3 text-right">
        <span className="font-mono-tabular text-label-md font-bold text-charcoal-ink block">{lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {t('common.currency', { defaultValue: 'ج.م' })}</span>
        {margin != null && (
          <span className={`text-[10px] font-mono-tabular font-medium ${margin >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {t('invoices.estProfit', { defaultValue: 'الربح' })}: {margin >= 0 ? '+' : ''}{margin.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </span>
        )}
      </div>

      <div className="col-span-2 flex justify-end gap-1">
        <button onClick={() => onEdit(item)} className="p-1.5 rounded-xl text-muted-steel/70 hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile" title={t('common.edit', { defaultValue: 'تعديل' })}><Edit size={14} /></button>
        <button onClick={() => onRemove(item.product_id)} className="p-1.5 rounded-xl text-error/70 hover:bg-error-container/20 hover:text-error transition-all cursor-pointer btn-tactile" title={t('common.delete', { defaultValue: 'حذف' })}><Trash2 size={14} /></button>
      </div>
    </div>
  );
});


export default function InvoicesView() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const {
    invoiceType, selectedParty, items,
    setInvoiceType, setSelectedParty,
    addItem: storeAddItem, updateItem, updateQuantity, removeItem, clearCart,
  } = useInvoiceStore();

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
  const [isAmountPaidDirty, setIsAmountPaidDirty] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState('');
  const [hasDelivery, setHasDelivery] = useState(false);
  const [discountAmount, setDiscountAmount] = useState('');
  const [hasDiscount, setHasDiscount] = useState(false);
  const [invoiceHistory, setInvoiceHistory] = useState([]);
  const [historyTotal, setHistoryTotal] = useState(0);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageSize, setHistoryPageSize] = useState(20);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyTypeFilter, setHistoryTypeFilter] = useState('all');
  const [historyStatusFilter, setHistoryStatusFilter] = useState('all');
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkInvoicesToPrint, setBulkInvoicesToPrint] = useState([]);
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [invoiceToReturn, setInvoiceToReturn] = useState(null);
  const [activeTab, setActiveTab] = useState('create');
  const [historySearch, setHistorySearch] = useState('');
  const [isNewParty, setIsNewParty] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyPhone, setNewPartyPhone] = useState('');
  const [newPartyAddress, setNewPartyAddress] = useState('');
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [supplierStockMap, setSupplierStockMap] = useState({});

  const inventoryProductsMap = useMemo(() => {
    const map = {};
    if (inventory?.products) {
      inventory.products.forEach(p => {
        map[String(p.product_id)] = p;
      });
    }
    return map;
  }, [inventory]);

  const tenantName = user?.tenant?.company_name || 'ERP Dashboard';
  const defaultFooterText = user?.tenant?.default_footer_text || user?.tenant?.print_notes || null;
  const logoUrl = user?.tenant?.logo_url || null;
  const taxNumber = user?.tenant?.tax_number || null;
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const loadHistory = useCallback(async (page = historyPage, pageSize = historyPageSize) => {
    setHistoryLoading(true);
    try {
      const skip = (page - 1) * pageSize;
      const response = await api.getInvoices({
        skip,
        limit: pageSize,
        invoiceType: historyTypeFilter !== 'all' ? historyTypeFilter : undefined,
        status: historyStatusFilter !== 'all' ? historyStatusFilter : undefined,
        search: historySearch.trim() || undefined,
      });
      const list = Array.isArray(response) ? response : (response?.data || response?.items || []);
      const total = Array.isArray(response) ? list.length : Number(response?.total ?? list.length);
      setInvoiceHistory(list);
      setHistoryTotal(total);
      setSelectedIds(new Set());
    } catch (err) {
      notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: err?.message || t('invoices.fetchHistoryError', { defaultValue: 'Failed to load invoice history' }), color: 'red' });
      setInvoiceHistory([]);
      setHistoryTotal(0);
    } finally {
      setHistoryLoading(false);
    }
  }, [historyPage, historyPageSize, historyTypeFilter, historyStatusFilter, historySearch]);

  const handleDeleteInvoice = useCallback(async (invoiceId) => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await api.deleteInvoice(invoiceId);
      setInvoiceToDelete(null);
      loadHistory(historyPage, historyPageSize);
      api.getInventoryReport().then(setInventory);
    } catch (err) {
      notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: err.message || t('invoices.deleteInvoiceError', { defaultValue: 'Failed to delete invoice' }), color: 'red' });
    } finally {
      setIsDeleting(false);
    }
  }, [historyPage, historyPageSize, loadHistory, isDeleting]);

  useEffect(() => {
    api.getParties(0, 1000)
      .then((res) => setParties(Array.isArray(res) ? res : (res?.data || res?.items || [])))
      .catch((err) => console.error('Failed to load parties:', err));

    api.getProducts(0, 1000)
      .then((res) => setProducts(Array.isArray(res) ? res : (res?.data || res?.items || [])))
      .catch((err) => console.error('Failed to load products:', err));

    api.getInventoryReport()
      .then((res) => setInventory(res || null))
      .catch((err) => console.error('Failed to load inventory report:', err));

    api.getTemplates()
      .then((res) => setTemplates(Array.isArray(res) ? res : (res?.data || res?.items || [])))
      .catch((err) => console.error('Failed to load templates:', err));
  }, []);

  useEffect(() => {
    document.title = `${t('common.erbSystem', 'ERB_SYSTEM')} | ${t('invoices.title', 'الفواتير')}`;
  }, [t]);


  useEffect(() => {
    if (invoiceType !== 'supplier_return' || !selectedParty) {
      setSupplierProducts([]);
      setSupplierStockMap({});
      return;
    }
    let canceled = false;
    api.getSupplierSummary(selectedParty)
      .then((res) => {
        if (canceled) return;
        const list = Array.isArray(res?.products) ? res.products : [];
        setSupplierProducts(list);
        const map = {};
        list.forEach((p) => {
          const suppQty = Number(p.supplier_stock ?? 0);
          const remQty = Number(p.remaining_stock ?? 0);
          map[p.id] = Math.min(suppQty, remQty);
        });
        setSupplierStockMap(map);
      })
      .catch((err) => {
        notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: err?.message || t('invoices.loadSupplierDataError', { defaultValue: 'Failed to load supplier data' }), color: 'red' });
        if (!canceled) {
          setSupplierProducts([]);
          setSupplierStockMap({});
        }
      });
    return () => { canceled = true; };
  }, [invoiceType, selectedParty]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory(historyPage, historyPageSize);
    }
  }, [activeTab, historyPage, historyPageSize, historyTypeFilter, historyStatusFilter, historySearch, loadHistory]);

  const filteredParties = useMemo(() => {
    return parties.filter((p) => {
      const pType = String(p.party_type?.value || p.party_type || p.type || '').toLowerCase();
      if (invoiceType === 'sale') {
        return pType === 'client' || pType === 'customer' || !pType;
      }
      return pType === 'supplier' || !pType;
    });
  }, [parties, invoiceType]);

  useEffect(() => {
    if (!selectedProduct) {
      setAutoFetchedCost(null);
      return;
    }
    const prod = (invoiceType === 'supplier_return' ? supplierProducts : products)
      .find(p => String(p.id) === String(selectedProduct));
    if (!prod) return;
    if (invoiceType === 'purchase' || invoiceType === 'supplier_return') {
      if (prod.last_purchase_price) setPurchasePrice(prod.last_purchase_price);
    } else if (invoiceType === 'sale') {
      const cost = prod.purchase_price != null ? prod.purchase_price : prod.last_purchase_price;
      setAutoFetchedCost(cost != null ? Number(cost) : null);
      const sell = prod.sell_price;
      if (sell != null && !salePrice) setSalePrice(String(sell));
    }
  }, [selectedProduct, products, supplierProducts, invoiceType]);

  const selectedAvailableStock = useMemo(() => {
    if (invoiceType !== 'sale' || !selectedProduct) return null;
    const stockProd = inventoryProductsMap?.[String(selectedProduct)];
    if (!stockProd) return null;
    return stockProd.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) ?? null;
  }, [invoiceType, selectedProduct, inventoryProductsMap]);

  const selectedSupplierStock = useMemo(() => {
    if (invoiceType !== 'supplier_return' || !selectedProduct) return null;
    const stock = supplierStockMap[String(selectedProduct)] ?? supplierStockMap[Number(selectedProduct)];
    return stock != null ? Number(stock) : null;
  }, [invoiceType, selectedProduct, supplierStockMap]);

  const addItem = useCallback(() => {
    if (!selectedProduct) return;
    const qty = parseInt(itemQuantity) || 1;

    // Block adding when stock is exhausted for sale or supplier returns
    if (invoiceType === 'sale' && selectedAvailableStock != null && selectedAvailableStock <= 0 && !editingItemId) return;
    if (invoiceType === 'supplier_return' && selectedSupplierStock != null && selectedSupplierStock <= 0 && !editingItemId) return;

    if (editingItemId) {
      const updates = { quantity: qty };
      if (invoiceType === 'purchase' || invoiceType === 'supplier_return') {
        updates.purchase_price = parseFloat(purchasePrice) || 0;
        if (invoiceType === 'purchase') updates.selling_price = parseFloat(sellingPrice) || 0;
      }
      if (invoiceType === 'sale') {
        const parsedSalePrice = parseFloat(salePrice);
        updates.sale_price = !isNaN(parsedSalePrice) ? parsedSalePrice : undefined;
        updates.purchase_price = autoFetchedCost != null ? autoFetchedCost : undefined;
      }
      updateItem(editingItemId, updates);
      setEditingItemId(null);
    } else {
      const newItem = { product_id: parseInt(selectedProduct), quantity: qty };
      if (invoiceType === 'purchase' || invoiceType === 'supplier_return') {
        newItem.purchase_price = parseFloat(purchasePrice) || 0;
        if (invoiceType === 'purchase') newItem.selling_price = parseFloat(sellingPrice) || 0;
      }
      if (invoiceType === 'sale') {
        const parsedSalePrice = parseFloat(salePrice);
        newItem.sale_price = !isNaN(parsedSalePrice) ? parsedSalePrice : undefined;
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

  const handleEditItem = useCallback((item) => {
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
  }, [products, invoiceType]);


  const handleCreateNewProduct = useCallback(async () => {
    if (!productSearch.trim()) return;
    setCreatingProduct(true);
    try {
      const newProd = await api.createProduct({ name: productSearch.trim() });
      setProducts(prev => [...prev, newProd]);
      setSelectedProduct(newProd.id);
      setProductSearch(newProd.name);
      setShowProductDropdown(false);
    } catch (err) {
      notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: err?.message || t('invoices.createProductError', { defaultValue: 'Error creating product' }), color: 'red' });
    } finally {
      setCreatingProduct(false);
    }
  }, [productSearch]);

  const handleSubmit = useCallback(async () => {
    if (items.length === 0) return;

    let partyId = selectedParty ? parseInt(selectedParty) : null;

    // If new party mode, create the party first
    if (isNewParty) {
      if (!newPartyName.trim()) { notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: t('invoices.pleaseEnterName', { party: invoiceType === 'supplier_return' || invoiceType === 'purchase' ? 'supplier' : 'customer' }), color: 'red' }); return; }
      setSubmitting(true);
      try {
        const partyType = invoiceType === 'sale' ? 'client' : 'supplier';
        const newParty = await api.createParty({
          name: newPartyName.trim(),
          party_type: partyType,
          phone: newPartyPhone.trim() || null,
          address: newPartyAddress.trim() || null,
        });
        partyId = newParty.id;
        setParties(prev => [...prev, newParty]);
        setSelectedParty(String(newParty.id));
        setIsNewParty(false);
        setNewPartyName('');
        setNewPartyPhone('');
        setNewPartyAddress('');
      } catch (err) {
        notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: err?.message || t('invoices.createPartyError', { defaultValue: 'Error creating party' }), color: 'red' });
        setSubmitting(false);
        return;
      }
    } else if (!partyId) {
      notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: t('invoices.pleaseSelectParty', { party: invoiceType === 'supplier_return' || invoiceType === 'purchase' ? 'supplier' : 'customer' }), color: 'red' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        party_id: partyId,
        amount_paid: parseFloat(amountPaid) || 0,
        delivery_fee: hasDelivery ? (parseFloat(deliveryFee) || 0) : 0,
        discount_amount: (invoiceType === 'sale' && hasDiscount) ? (parseFloat(discountAmount) || 0) : 0,
        items: items.map((i) => {
          if (invoiceType === 'purchase') {
            return { product_id: i.product_id, quantity: i.quantity, purchase_price: i.purchase_price, selling_price: i.selling_price };
          }
          if (invoiceType === 'supplier_return') {
            return { product_id: i.product_id, quantity: i.quantity, unit_price: i.purchase_price || 0 };
          }
          return {
            product_id: i.product_id,
            quantity: i.quantity,
            ...(i.sale_price != null ? { sell_price: i.sale_price } : {}),
            ...(i.purchase_price != null ? { purchase_price: i.purchase_price } : {}),
          };
        }),
      };
      let result;
      if (invoiceType === 'supplier_return') {
        result = await api.createSupplierStockReturn(partyId, { items: payload.items });
        notifications.show({ title: t('common.success', { defaultValue: 'Success' }), message: t('invoices.supplierReturnSuccess'), color: 'green' });
        setLastInvoice(result);
      } else {
        result = invoiceType === 'sale' ? await api.createSellInvoice(payload) : await api.createPurchaseInvoice(payload);
        setLastInvoice(result);
      }
      clearCart();
      setAmountPaid('');
      setIsAmountPaidDirty(false);
      setDeliveryFee('');
      setHasDelivery(false);
      setDiscountAmount('');
      setHasDiscount(false);
      setSalePrice('');
      setAutoFetchedCost(null);
      loadHistory(historyPage, historyPageSize);
      api.getInventoryReport().then(setInventory);
    } catch (err) { notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: err?.message || t('common.error', { defaultValue: 'Error' }), color: 'red' }); }
    finally { setSubmitting(false); }
  }, [items, selectedParty, isNewParty, newPartyName, newPartyPhone, newPartyAddress, invoiceType, t, amountPaid, hasDelivery, deliveryFee, hasDiscount, discountAmount, clearCart, loadHistory, historyPage, historyPageSize]);

  const handleOpenPrintPreview = useCallback((invoiceData) => {
    setInvoiceToPrint(invoiceData);
  }, []);

  const handleClosePrintPreview = useCallback(() => {
    setInvoiceToPrint(null);
    setBulkInvoicesToPrint([]);
  }, []);

  const printPortalRef = useRef(null);
  const invoicePrintRef = useRef(null);

  const handleConfirmPrint = useCallback(() => {
    const portal = printPortalRef.current;
    if (!portal) { window.print(); return; }
    portal.style.display = 'block';
    document.body.classList.add('printing');
    requestAnimationFrame(() => {
      window.print();
      portal.style.display = 'none';
      document.body.classList.remove('printing');
    });
  }, []);

  const toggleSelect = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const handleBulkPrint = useCallback(() => {
    const selected = invoiceHistory.filter(inv => selectedIds.has(inv.id));
    if (selected.length === 0) return;
    setBulkInvoicesToPrint(selected);
  }, [invoiceHistory, selectedIds]);

  const handlePrintFromTemplate = useCallback(async () => {
    if (!lastInvoice || templates.length === 0) return;
    setLoadingPreview(true);
    try {
      const hydratedData = await api.previewTemplate(templates[0].id, lastInvoice.id);
      handleOpenPrintPreview(hydratedData);
    } catch (err) { notifications.show({ title: t('common.error', { defaultValue: 'Error' }), message: err?.message || t('common.error', { defaultValue: 'Error' }), color: 'red' }); }
    finally { setLoadingPreview(false); }
  }, [lastInvoice, templates, handleOpenPrintPreview]);

  const partyForPrint = invoiceToPrint
    ? parties.find((p) => p.id === invoiceToPrint.party_id) || (invoiceToPrint.party_name ? {
        name: invoiceToPrint.party_name,
        phone: invoiceToPrint.party_phone,
        address: invoiceToPrint.party_address,
      } : null)
    : null;

  const subtotal = useMemo(() => items.reduce((sum, item) => {
    if (invoiceType === 'purchase' || invoiceType === 'supplier_return') {
      return sum + (item.quantity * (item.purchase_price || 0));
    } else {
      const sp = item.sale_price != null ? item.sale_price : (() => {
        const invProd = inventoryProductsMap?.[String(item.product_id)];
        const best = invProd?.batches?.filter(b => Number(b.remaining_quantity) > 0)
          .reduce((acc, b) => (!acc || Number(b.selling_price) > Number(acc.selling_price) ? b : acc), null)
          ?? invProd?.batches?.reduce((acc, b) => (!acc || Number(b.selling_price) > Number(acc.selling_price) ? b : acc), null);
        return best?.selling_price || 0;
      })();
      return sum + (item.quantity * sp);
    }
  }, 0), [items, invoiceType, inventoryProductsMap]);

  const preparedItemsForTotals = useMemo(() => {
    return items.map((item) => {
      if (invoiceType === 'purchase' || invoiceType === 'supplier_return') {
        return { ...item, price: item.purchase_price || 0 };
      }
      const sp = item.sale_price != null ? item.sale_price : (() => {
        const invProd = inventoryProductsMap?.[String(item.product_id)];
        const best = invProd?.batches?.filter(b => Number(b.remaining_quantity) > 0)
          .reduce((acc, b) => (!acc || Number(b.selling_price) > Number(acc.selling_price) ? b : acc), null)
          ?? invProd?.batches?.reduce((acc, b) => (!acc || Number(b.selling_price) > Number(acc.selling_price) ? b : acc), null);
        return best?.selling_price || 0;
      })();
      return { ...item, price: sp };
    });
  }, [items, invoiceType, inventoryProductsMap]);

  const totals = useMemo(() => {
    return calculateInvoiceTotals(
      preparedItemsForTotals,
      hasDelivery ? deliveryFee : 0,
      (invoiceType === 'sale' && hasDiscount) ? discountAmount : 0
    );
  }, [preparedItemsForTotals, hasDelivery, deliveryFee, invoiceType, hasDiscount, discountAmount]);

  const totalAmount = totals.grandTotal;

  const totalProfit = useMemo(() => {
    if (invoiceType !== 'sale') return 0;
    const baseProfit = items.reduce((sum, item) => {
      if (item.sale_price != null && item.purchase_price != null) {
        return sum + (Number(item.sale_price) - Number(item.purchase_price)) * Number(item.quantity);
      }
      return sum;
    }, 0);
    const parsedDiscount = hasDiscount ? (parseFloat(discountAmount) || 0) : 0;
    return baseProfit - parsedDiscount;
  }, [invoiceType, items, hasDiscount, discountAmount]);

  // Removed auto-filling of amountPaid to let the user explicitly decide the payment price.
  // useEffect(() => {
  //   if (!isAmountPaidDirty) {
  //     setAmountPaid(totalAmount > 0 ? String(totalAmount) : '');
  //   }
  // }, [totalAmount, isAmountPaidDirty]);

  const remainingBalance = useMemo(() => Math.max(0, totalAmount - (parseFloat(amountPaid) || 0)), [totalAmount, amountPaid]);

  const filteredInvoiceHistory = useMemo(() => {
    let list = invoiceHistory;
    if (historyStatusFilter !== 'all') {
      list = list.filter(inv => String(inv.status).toLowerCase() === historyStatusFilter);
    }
    if (historyTypeFilter !== 'all') {
      list = list.filter(inv => String(inv.invoice_type || '').toLowerCase() === historyTypeFilter);
    }
    if (!historySearch) return list;
    const s = historySearch.toLowerCase();
    return list.filter(inv => (
      String(inv.id).includes(s)
      || inv.invoice_type.replace('_', ' ').toLowerCase().includes(s)
      || inv.status.toLowerCase().includes(s)
    ));
  }, [invoiceHistory, historySearch, historyStatusFilter, historyTypeFilter]);

  const historyTotalPages = Math.max(1, Math.ceil(historyTotal / historyPageSize));

  const inputClass = "w-full bg-surface-container-lowest/50 backdrop-blur-sm border border-outline-variant/50 rounded-2xl px-5 py-3 text-sm text-charcoal-ink focus:bg-surface-container-lowest focus:border-accent focus:ring-4 focus:ring-accent/10 outline-none transition-all duration-300 shadow-inner hover:border-accent/50";
  const selectClass = `${inputClass} appearance-none cursor-pointer`;

  return (
    <>
      <div className="print:hidden">
        <div className="max-w-7xl mx-auto px-6 pt-6">
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 animate-fade-in-up">
            <div className="relative">
              <div className="absolute -inset-1 bg-gradient-to-r from-accent/20 to-accent-muted/20 blur-xl opacity-50 rounded-full"></div>
              <h2 className="relative text-4xl font-extrabold text-charcoal-ink tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-charcoal-ink to-muted-steel">{t('invoices.title')}</h2>
              <p className="relative text-body-base text-muted-steel mt-2 max-w-md">{t('invoices.subtitle')}</p>
            </div>
            <div className="bg-surface-container-low/60 backdrop-blur-md border border-outline-variant/50 rounded-xl p-1.5 flex gap-1.5 shadow-sm relative overflow-hidden">
              <button onClick={() => setActiveTab('create')}
                className={`relative z-10 px-6 py-2.5 rounded-lg text-label-md font-medium transition-all duration-200 cursor-pointer flex items-center gap-2
                  ${activeTab === 'create' ? 'bg-charcoal-ink text-white shadow-sm' : 'text-muted-steel hover:bg-surface-container-lowest hover:text-charcoal-ink'}`}>
                <Plus size={18} /> {t('invoices.addInvoice')}
              </button>
              <button onClick={() => setActiveTab('history')}
                className={`relative z-10 px-6 py-2.5 rounded-lg text-label-md font-medium transition-all duration-200 cursor-pointer flex items-center gap-2
                  ${activeTab === 'history' ? 'bg-charcoal-ink text-white shadow-sm' : 'text-muted-steel hover:bg-surface-container-lowest hover:text-charcoal-ink'}`}>
                <Package size={18} /> {t('invoices.history')}
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'create' && (
        <div className="max-w-7xl mx-auto space-y-6 px-6">
          <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
            <h2 className="text-2xl font-bold text-charcoal-ink tracking-tight flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-accent-surface flex items-center justify-center text-accent shadow-sm">
                <ShoppingCart size={18} />
              </span>
              {t('invoices.invoiceDetails')}
            </h2>
            <div className="bg-surface-container-low/60 backdrop-blur-md border border-outline-variant/50 rounded-xl p-1.5 flex gap-1.5 shadow-sm overflow-x-auto w-full sm:w-auto">
              {[{key: 'sale', label: t('invoices.saleInvoice')}, {key: 'purchase', label: t('invoices.purchaseInvoice')}, {key: 'supplier_return', label: t('invoices.supplierReturn')}].map((invType) => (
                <button key={invType.key} onClick={() => setInvoiceType(invType.key)}
                  className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer flex-1 sm:flex-none text-center whitespace-nowrap
                    ${invoiceType === invType.key 
                      ? (invType.key === 'supplier_return' ? 'bg-error text-white shadow-sm ring-1 ring-error/60' : 'bg-surface-container-lowest text-charcoal-ink shadow-sm ring-1 ring-outline-variant/60')
                      : 'text-muted-steel hover:bg-surface-container-low/80 hover:text-charcoal-ink'}`}>
                  {invType.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 space-y-6">
              <div className="relative bg-surface-container-lowest/80 backdrop-blur-2xl border border-outline-variant/50 rounded-3xl p-7 shadow-xl shadow-charcoal-ink/5 hover:shadow-2xl hover:shadow-charcoal-ink/10 transition-all duration-500 animate-fade-in-up stagger-1 overflow-hidden group">
                <div className="absolute -top-32 -right-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors duration-700 pointer-events-none" />
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-outline-variant/30 relative z-10">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-accent-surface text-accent"><UserSquare2 size={18} /></div>
                    <h3 className="text-h3 text-charcoal-ink">{invoiceType === 'sale' ? t('invoices.clientInfo') : t('invoices.supplierInfo')}</h3>
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
                      {isNewParty ? t('invoices.selectExisting') : (invoiceType === 'supplier_return' || invoiceType === 'purchase' ? t('invoices.newSupplier') : t('invoices.newCustomer'))}
                    </button>
                  )}
                </div>

                {!isNewParty ? (
                  <div>
                    <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{invoiceType === 'sale' ? t('invoices.selectClient') : t('invoices.selectSupplier')}</label>
                    <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className={selectClass}>
                      <option value="">{invoiceType === 'sale' ? t('invoices.selectClientPlaceholder') : t('invoices.selectSupplierPlaceholder')}</option>
                      {filteredParties.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}{p.phone ? ` — ${p.phone}` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.customerSupplier')} *</label>
                      <div className="relative">
                        <UserSquare2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                        <input
                          type="text"
                          value={newPartyName}
                          onChange={(e) => setNewPartyName(e.target.value)}
                          placeholder="..."
                          className={`${inputClass} pr-10`}
                          dir="rtl"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.phone')}</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                          <input
                            type="tel"
                            value={newPartyPhone}
                            onChange={(e) => setNewPartyPhone(e.target.value)}
                            placeholder="01000000000"
                            className={`${inputClass} pl-10`}
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.address')}</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                          <input
                            type="text"
                            value={newPartyAddress}
                            onChange={(e) => setNewPartyAddress(e.target.value)}
                            placeholder="..."
                            className={`${inputClass} pr-10`}
                            dir="rtl"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative bg-surface-container-lowest/80 backdrop-blur-2xl border border-outline-variant/50 rounded-3xl p-7 shadow-xl shadow-charcoal-ink/5 hover:shadow-2xl hover:shadow-charcoal-ink/10 transition-all duration-500 animate-fade-in-up stagger-2 overflow-hidden group">
                <div className="absolute -bottom-32 -left-32 w-64 h-64 bg-accent/5 rounded-full blur-3xl group-hover:bg-accent/10 transition-colors duration-700 pointer-events-none" />
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-outline-variant/30 relative z-10">
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
                        const val = e.target.value;
                        setProductSearch(val);
                        setShowProductDropdown(true);
                        const pool = invoiceType === 'supplier_return' ? supplierProducts : products;
                        const exact = pool.find(p => p.name.trim().toLowerCase() === val.trim().toLowerCase());
                        setSelectedProduct(exact ? exact.id : '');
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onBlur={() => setTimeout(() => setShowProductDropdown(false), 200)}
                      placeholder={t('invoices.searchOrAddProduct')}
                      className={inputClass}
                    />
                    {showProductDropdown && (
                      <div className="absolute top-full mt-1 left-0 w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                        {(invoiceType === 'supplier_return' ? supplierProducts : products)
                          .filter(p => p.name.trim().toLowerCase().includes(productSearch.trim().toLowerCase()))
                          .filter(p => editingItemId === p.id || !items.some(i => i.product_id === p.id))
                          .filter(p => {
                            if (invoiceType === 'supplier_return') {
                              const suppQty = Number(p.supplier_stock ?? 0);
                              const remQty = Number(p.remaining_stock ?? 0);
                              const avail = supplierStockMap[p.id] != null ? Number(supplierStockMap[p.id]) : Math.min(suppQty, remQty);
                              return avail > 0;
                            }
                            return true;
                          })
                          .map(p => {
                            const stock = inventoryProductsMap?.[String(p.id)];
                            const stockQty = stock ? stock.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) : null;
                            const supplierQty = supplierStockMap[p.id] != null ? Number(supplierStockMap[p.id]) : null;
                            return (
                              <div 
                                key={p.id} 
                                className="px-4 py-2 hover:bg-surface-container-low cursor-pointer text-charcoal-ink text-sm flex items-center justify-between"
                                onMouseDown={(e) => {
                                  e.preventDefault();
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
                                {invoiceType === 'supplier_return' && supplierQty != null && (
                                  <span className={`text-[10px] font-mono-tabular px-1.5 py-0.5 rounded-md ${supplierQty > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                    {t('invoices.stock')}: {supplierQty}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        {productSearch && !(invoiceType === 'supplier_return' ? supplierProducts : products).some(p => p.name.toLowerCase() === productSearch.toLowerCase()) && invoiceType === 'purchase' && (
                          <div 
                            className="px-4 py-2 text-accent hover:bg-accent-surface cursor-pointer flex items-center gap-2 text-sm border-t border-outline-variant/30"
                            onClick={handleCreateNewProduct}
                          >
                            {creatingProduct ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            {t('invoices.addNewProductPrompt', { name: productSearch })}
                          </div>
                        )}
                        {!productSearch && (invoiceType === 'supplier_return' ? supplierProducts : products).filter(p => editingItemId === p.id || !items.some(i => i.product_id === p.id)).length === 0 && (
                          <div className="px-4 py-2 text-muted-steel text-sm">{t('invoices.noProductsAvailable')}</div>
                        )}
                      </div>
                    )}
                  </div>
                  {(invoiceType === 'purchase' || invoiceType === 'supplier_return') && (
                    <div className="flex flex-col gap-0">
                      <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{invoiceType === 'supplier_return' ? t('invoices.unitPrice') : t('invoices.purchasePrice')}</label>
                      <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0" className={`sm:w-28 ${inputClass}`} />
                    </div>
                  )}
                  {invoiceType === 'sale' && (
                    <div className="flex flex-col gap-1">
                      <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.salePrice')}</label>
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
                    <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">{t('invoices.quantity')}</label>
                    <input
                      type="number"
                      value={itemQuantity}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (invoiceType === 'sale' && selectedProduct) {
                          const stockProd = inventoryProductsMap?.[String(selectedProduct)];
                          const avail = stockProd ? stockProd.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) : null;
                          if (avail != null && parseInt(val) > avail) {
                            setItemQuantity(String(avail));
                            return;
                          }
                        }
                        if (invoiceType === 'supplier_return' && selectedProduct) {
                          const avail = selectedSupplierStock;
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
                      const stockProd = inventoryProductsMap?.[String(selectedProduct)];
                      const avail = stockProd ? stockProd.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) : null;
                      if (avail != null) return (
                        <span className={`text-[10px] font-mono-tabular px-1 ${avail > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {t('invoices.available')}: {avail}
                        </span>
                      );
                      return null;
                    })()}
                    {invoiceType === 'supplier_return' && selectedSupplierStock != null && (
                      <span className={`text-[10px] font-mono-tabular px-1 ${selectedSupplierStock > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {t('invoices.available', { defaultValue: 'Available' })}: {selectedSupplierStock}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={addItem} disabled={!selectedProduct || (invoiceType === 'sale' && selectedAvailableStock != null && selectedAvailableStock <= 0 && !editingItemId) || (invoiceType === 'supplier_return' && selectedSupplierStock != null && selectedSupplierStock <= 0 && !editingItemId)}
                      className={`h-[46px] px-6 rounded-xl text-white font-semibold shadow-sm transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] ${
                        editingItemId ? 'bg-amber-600 hover:bg-amber-700' : 'bg-accent hover:bg-accent-hover'
                      }`}>
                      {editingItemId ? <><Edit size={16} /> {t('common.update')}</> : <><Plus size={18} /> {t('common.add')}</>}
                    </button>
                    {editingItemId && (
                      <button onClick={() => { setEditingItemId(null); setSelectedProduct(''); setProductSearch(''); setPurchasePrice(''); setSellingPrice(''); setSalePrice(''); setItemQuantity('1'); setAutoFetchedCost(null); }}
                        className="h-[46px] w-[46px] rounded-2xl text-muted-steel border-2 border-outline-variant/40 hover:border-error/50 hover:bg-error/5 hover:text-error flex items-center justify-center transition-all duration-300 cursor-pointer">
                        <X size={18} strokeWidth={2.5} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="border border-outline-variant/30 rounded-2xl overflow-hidden bg-surface-container-lowest/50 backdrop-blur-sm shadow-inner relative z-10">
                  <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-surface-container-low/50 border-b border-outline-variant/30 text-xs font-bold text-muted-steel uppercase tracking-widest">
                    <div className="col-span-4">{t('invoices.productHeader')}</div>
                    <div className="col-span-3 text-center">{t('invoices.qtyHeader')}</div>
                    <div className="col-span-3 text-right">{t('invoices.totalHeader')}</div>
                    <div className="col-span-2 text-right">{t('invoices.actionsHeader')}</div>
                  </div>
                  <div className="bg-surface-container-lowest">
                    {items.length > 0 ? (
                      items.map((item) => {
                        const stockProd = inventoryProductsMap?.[String(item.product_id)];
                        const maxStock = invoiceType === 'sale' && stockProd ? stockProd.batches?.reduce((s, b) => s + Number(b.remaining_quantity || 0), 0) : undefined;
                        return <InvoiceItemRow key={item.product_id} item={item} products={products} invoiceType={invoiceType} onQuantityChange={updateQuantity} onRemove={removeItem} onEdit={handleEditItem} maxStock={maxStock} inventoryProductsMap={inventoryProductsMap} />;
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
              <div className="bg-surface-container-lowest/80 backdrop-blur-2xl border border-outline-variant/50 rounded-3xl p-7 shadow-xl shadow-charcoal-ink/5 relative overflow-hidden animate-fade-in-up stagger-3 group hover:shadow-2xl transition-all duration-500">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-accent via-accent-muted to-accent opacity-80 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-accent/10 rounded-full blur-2xl group-hover:bg-accent/20 transition-colors duration-700 pointer-events-none" />
                <h3 className="text-h3 text-charcoal-ink mb-4 mt-1 relative z-10">{t('invoices.currentOrder')}</h3>
                <div className="space-y-3 mb-6 relative z-10">
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
                              placeholder="0.00"
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

                      {/* Discount Toggle (Only for SALE invoices) */}
                      {invoiceType === 'sale' && (
                        <div className="border-t border-outline-variant/30 pt-2 space-y-2">
                          <div className="flex justify-between items-center">
                            <button
                              onClick={() => { setHasDiscount(!hasDiscount); if (hasDiscount) setDiscountAmount(''); }}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-label-sm transition-all cursor-pointer btn-tactile ${
                                hasDiscount
                                  ? 'bg-rose-600 text-white shadow-sm'
                                  : 'text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low'
                              }`}
                            >
                              <Tag size={14} />
                              {hasDiscount ? t('invoices.hasDiscount', 'خصم مالي') : t('invoices.addDiscount', '+ خصم مالي')}
                            </button>
                            {hasDiscount && (
                              <input
                                type="number"
                                value={discountAmount}
                                onChange={(e) => setDiscountAmount(e.target.value)}
                                placeholder="0.00"
                                className="w-28 bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1.5 text-sm text-right text-charcoal-ink focus:border-rose-500 outline-none font-mono-tabular"
                                autoFocus
                              />
                            )}
                          </div>
                          {hasDiscount && discountAmount && (
                            <div className="flex justify-between items-center text-body-sm text-rose-600 dark:text-rose-400 font-medium">
                              <span>{t('invoices.discount', 'Discount')}</span>
                              <span className="font-mono-tabular font-bold">-{t('common.currency')} {Number(discountAmount || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex justify-between items-center border-t border-outline-variant/30 pt-4 mt-2">
                        <span className="text-sm font-semibold text-charcoal-ink">{t('invoices.totalAmount')}</span>
                        <span className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-accent to-accent-muted drop-shadow-sm font-mono-tabular tracking-tight">
                          {t('common.currency')} {totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}
                        </span>
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
                      {invoiceType === 'sale' && (
                        <>
                          <div className="flex justify-between items-center text-body-sm text-muted-steel pt-1">
                            <span>{t('invoices.amountPaid')}</span>
                            <input type="number" value={amountPaid} onChange={(e) => { setIsAmountPaidDirty(true); setAmountPaid(e.target.value); }} placeholder="0.00" className="w-24 bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1 text-sm text-right text-charcoal-ink focus:border-accent outline-none" />
                          </div>
                          <div className="flex justify-between items-center text-label-md text-charcoal-ink border-t border-outline-variant/30 pt-2">
                            <span>{t('invoices.remainingBalance')}</span>
                            <span className="font-mono-tabular font-medium text-error">{t('common.currency')} {remainingBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
                <button onClick={handleSubmit} disabled={submitting || (!selectedParty && !isNewParty) || items.length === 0 || (isNewParty && !newPartyName.trim())}
                  className="w-full bg-accent hover:bg-accent-hover text-on-primary font-bold text-base py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] mt-6 relative z-10">
                  {submitting ? <Loader2 size={20} className="animate-spin" /> : <><CheckCircle2 size={20} /> {t('invoices.generateInvoice')}</>}
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
                    {lastInvoice.invoice_type === 'SALE' && (
                      <div className="flex justify-between items-center text-body-sm text-muted-steel border-b border-outline-variant/20 pb-2">
                        <span>{t('common.status')}</span>
                        <span className={`text-label-sm px-2 py-0.5 rounded-lg ${lastInvoice.status === 'paid' ? 'bg-accent-surface text-accent' : 'bg-error-container/30 text-error'}`}>{t(`invoices.status.${lastInvoice.status}`, { defaultValue: lastInvoice.status })}</span>
                      </div>
                    )}
                    {Number(lastInvoice.discount_amount) > 0 && (
                      <div className="flex justify-between items-center text-body-sm text-rose-600 dark:text-rose-400 border-b border-outline-variant/20 pb-2">
                        <span>{t('invoices.discount', 'Discount')}</span>
                        <span className="font-mono-tabular font-bold">-{t('common.currency')} {Number(lastInvoice.discount_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                      <span className="text-label-md text-charcoal-ink">{t('invoices.totalAmount')}</span>
                      <span className="text-h2 text-accent font-mono-tabular tracking-tight">{t('common.currency')} {Number(lastInvoice.total_amount).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
        <div className="max-w-7xl mx-auto space-y-6 px-6 pb-12">
          <div className="bg-surface-container-lowest/80 backdrop-blur-2xl border border-outline-variant/50 rounded-3xl shadow-xl shadow-charcoal-ink/5 animate-fade-in-up overflow-hidden">
            <div className="p-7 border-b border-outline-variant/30 bg-surface-container-low/30 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h3 className="text-h3 text-charcoal-ink">{t('invoices.previousInvoices')}</h3>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative group w-full sm:w-auto">
                    <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-steel group-focus-within:text-accent transition-colors duration-300" />
                    <input 
                      type="text" 
                      placeholder={t('invoices.searchByIdOrType')}
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      className="pl-10 pr-4 py-2.5 w-full sm:w-64 bg-surface-container-low border border-outline-variant/60 rounded-xl text-sm focus:border-accent focus:ring-2 focus:ring-accent/20 focus:bg-surface-container-lowest transition-all outline-none"
                    />
                  </div>
                  {selectedIds.size > 0 && (
                    <button onClick={handleBulkPrint}
                      className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 transition-all shadow-sm cursor-pointer btn-tactile whitespace-nowrap">
                      <Printer size={16} /> {t('invoices.printSelected')} ({selectedIds.size})
                    </button>
                  )}
                </div>
              </div>

              <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'all', label: t('common.all') },
                    { key: 'sale', label: t('invoices.typeLabels.sale') },
                    { key: 'purchase', label: t('invoices.typeLabels.purchase') },
                    { key: 'sell_return', label: t('invoices.typeLabels.sale_return') },
                    { key: 'purchase_return', label: t('invoices.typeLabels.purchase_return') },
                    { key: 'supplier_return', label: t('invoices.typeLabels.supplier_return') },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setHistoryTypeFilter(f.key); setHistoryPage(1); }}
                      className={`px-3 py-1.5 rounded-xl text-label-sm border transition-all cursor-pointer btn-tactile ${
                        historyTypeFilter === f.key
                          ? 'bg-accent text-on-primary border-accent'
                          : 'border-outline-variant/60 text-muted-steel hover:bg-surface-container-low'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                
                <div className="hidden lg:block w-px h-6 bg-outline-variant/50"></div>

                <div className="flex flex-wrap items-center gap-2">
                  {[
                    { key: 'all', label: t('common.all') },
                    { key: 'paid', label: t('invoices.status.paid') },
                    { key: 'partial', label: t('invoices.status.partial') },
                    { key: 'unpaid', label: t('invoices.status.unpaid') },
                  ].map((f) => (
                    <button
                      key={f.key}
                      onClick={() => { setHistoryStatusFilter(f.key); setHistoryPage(1); }}
                      className={`px-3 py-1.5 rounded-xl text-label-sm border transition-all cursor-pointer btn-tactile ${
                        historyStatusFilter === f.key
                          ? 'bg-charcoal-ink text-white border-charcoal-ink'
                          : 'border-outline-variant/60 text-muted-steel hover:bg-surface-container-low'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface-container-low/40">
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-4 px-6 w-12 rounded-tl-xl"></th>
                    <th className="py-4 px-6 font-semibold">{t('common.id')}</th>
                    <th className="py-4 px-6 font-semibold">{t('invoices.customerSupplier')}</th>
                    <th className="py-4 px-6 font-semibold">{t('invoices.type')}</th>
                    <th className="py-4 px-6 font-semibold text-right">{t('common.total')}</th>
                    <th className="py-4 px-6 font-semibold text-center">{t('common.status')}</th>
                    <th className="py-4 px-6 font-semibold">{t('common.date')}</th>
                    <th className="py-4 px-6 font-semibold text-right rounded-tr-xl">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20">
                  {filteredInvoiceHistory.map((inv) => (
                  <tr key={inv.id} className="group hover:bg-surface-container-low/50 transition-all duration-200">
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center">
                        <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                          className="w-4 h-4 rounded border-outline-variant/50 text-accent focus:ring-accent/20 cursor-pointer transition-colors" />
                      </div>
                    </td>
                    <td className="py-4 px-6 font-mono-tabular text-charcoal-ink font-medium">#{String(inv.id).padStart(5, '0')}</td>
                    <td className="py-4 px-6 text-charcoal-ink font-medium truncate max-w-[160px]" title={inv.party_name || ''}>{inv.party_name || '—'}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                        inv.invoice_type === 'SALE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/50' : 
                        inv.invoice_type === 'PURCHASE' ? 'bg-blue-50 text-blue-700 border border-blue-200/50' : 
                        'bg-surface-container-low text-muted-steel border border-outline-variant/50'
                      }`}>
                        {t(`invoices.typeLabels.${inv.invoice_type?.toLowerCase()}`, { defaultValue: inv.invoice_type?.replace('_', ' ') })}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-mono-tabular text-charcoal-ink font-bold">{Number(inv.total_amount).toLocaleString()} {t('common.currencyEGP', { defaultValue: 'EGP' })}</td>
                    <td className="py-4 px-6 text-center">
                      {inv.invoice_type === 'SALE' ? (
                        <span className={`inline-flex items-center justify-center px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider shadow-sm ${
                          inv.status === 'paid' ? 'bg-emerald-100/80 text-emerald-800 border border-emerald-200/50' : 
                          inv.status === 'partial' ? 'bg-amber-100/80 text-amber-800 border border-amber-200/50' : 
                          'bg-red-100/80 text-red-800 border border-red-200/50'
                        }`}>
                          {t(`invoices.status.${inv.status}`, { defaultValue: inv.status })}
                        </span>
                      ) : (
                        <span className="text-muted-steel">—</span>
                      )}
                    </td>
                    <td className="py-4 px-6 font-mono-tabular text-muted-steel text-xs">{inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '-'}</td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        {(inv.invoice_type === 'SALE' || inv.invoice_type === 'PURCHASE') && (
                          <button onClick={() => setEditingInvoice(inv)}
                            className="p-2 rounded-xl text-muted-steel hover:bg-accent/10 hover:text-accent transition-all cursor-pointer btn-tactile"
                            title={t('common.edit', { defaultValue: 'Edit' })}>
                            <Edit size={16} />
                          </button>
                        )}
                        {inv.invoice_type?.toLowerCase() === 'sell' && (
                          <button onClick={() => setInvoiceToReturn(inv)}
                            className="p-2 rounded-xl text-muted-steel hover:bg-amber-500/10 hover:text-amber-600 transition-all cursor-pointer btn-tactile"
                            title={t('invoices.returnInvoice', { defaultValue: 'Return Invoice' })}>
                            <RotateCcw size={16} />
                          </button>
                        )}
                        <button onClick={() => handleOpenPrintPreview(inv)}
                          className="p-2 rounded-xl text-muted-steel hover:bg-charcoal-ink/10 hover:text-charcoal-ink transition-all cursor-pointer btn-tactile"
                          title={t('common.print', { defaultValue: 'Print' })}>
                          <Printer size={16} />
                        </button>
                        <button onClick={() => setInvoiceToDelete(inv)}
                          className="p-2 rounded-xl text-muted-steel hover:bg-error/10 hover:text-error transition-all cursor-pointer btn-tactile"
                          title={t('common.delete', { defaultValue: 'Delete' })}>
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                </tbody>
              </table>
            </div>
            {historyLoading && (
              <div className="p-8 text-center text-muted-steel">
                {t('common.loading')}
              </div>
            )}
            {!historyLoading && filteredInvoiceHistory.length === 0 && (
              <div className="p-8 text-center text-muted-steel">
                {t('invoices.noInvoices')}
              </div>
            )}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-5 border-t border-outline-variant/30 bg-surface-container-low/20">
              <div className="flex items-center gap-3 text-sm text-muted-steel">
                <span className="font-medium">{t('common.rowsPerPage', { defaultValue: 'Rows per page' })}</span>
                <select
                  value={historyPageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    setHistoryPageSize(nextSize);
                    setHistoryPage(1);
                  }}
                  className="px-3 py-1.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm font-medium focus:border-accent focus:ring-2 focus:ring-accent/10 outline-none transition-all cursor-pointer shadow-sm hover:border-outline-variant"
                >
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                </select>
                <span className="ml-2 font-medium">
                  {historyTotal === 0 ? '0' : (historyPage - 1) * historyPageSize + 1}
                  -
                  {Math.min(historyPage * historyPageSize, historyTotal)} {t('common.of', { defaultValue: 'of' })} {historyTotal}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                  disabled={historyPage <= 1}
                  className="px-4 py-2 rounded-xl border border-outline-variant/60 text-sm font-semibold text-charcoal-ink hover:bg-surface-container-low hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {t('common.previous', { defaultValue: 'Previous' })}
                </button>
                <div className="px-4 py-2 flex items-center justify-center font-medium text-sm text-charcoal-ink min-w-[5rem]">
                  {historyPage} <span className="text-muted-steel mx-1">/</span> {historyTotalPages}
                </div>
                <button
                  onClick={() => setHistoryPage((p) => Math.min(historyTotalPages, p + 1))}
                  disabled={historyPage >= historyTotalPages}
                  className="px-4 py-2 rounded-xl border border-outline-variant/60 text-sm font-semibold text-charcoal-ink hover:bg-surface-container-low hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  {t('common.next', { defaultValue: 'Next' })}
                </button>
              </div>
            </div>
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
                    const el = invoicePrintRef.current?.querySelector('.invoice-print-area') || invoicePrintRef.current;
                    if (!el) return;
                    setDownloadingPdf(true);
                    try {
                      const clonedContainer = document.createElement('div');
                      clonedContainer.innerHTML = el.outerHTML;
                      const clone = clonedContainer.firstElementChild;
                      document.body.appendChild(clonedContainer);
                      
                      clonedContainer.style.position = 'absolute';
                      clonedContainer.style.left = '0';
                      clonedContainer.style.top = '0';
                      clonedContainer.style.width = (paperSize === 'a5' ? 559 : (paperSize === 'receipt' || paperSize === '80mm') ? 302 : 794) + 'px';
                      clonedContainer.style.zIndex = '-9999';
                      clonedContainer.style.opacity = '0';
                      clonedContainer.style.pointerEvents = 'none';

                      const partyNameForPdf = partyForPrint?.name || invoiceToPrint?.party_name || invoiceToPrint?.party?.name || 'Customer';
                      const rawDate = invoiceToPrint?.created_at || invoiceToPrint?.issue_date || invoiceToPrint?.date;
                      const pdfFileName = generatePdfFileName(partyNameForPdf, rawDate, invoiceToPrint?.invoice_type || invoiceToPrint?.invoiceType);

                      const { default: html2pdf } = await import('html2pdf.js');
                      await html2pdf()
                        .set({
                          margin: [5, 0, 5, 0],
                          filename: pdfFileName,
                          image: { type: 'jpeg', quality: 0.98 },
                          html2canvas: { scale: 2, useCORS: true },
                          jsPDF: { unit: 'mm', format: paperSize === 'a5' ? 'a5' : (paperSize === 'receipt' || paperSize === '80mm') ? [80, 297] : 'a4', orientation: 'portrait' },
                          pagebreak: { mode: ['css', 'legacy'] },
                        })
                        .from(clone)
                        .save();

                      document.body.removeChild(clonedContainer);
                    } catch (err) {
                      console.error('PDF generation failed:', err);
                      notifications.show({ title: t('common.error'), message: t('invoices.pdfFailed'), color: 'red' });
                      try {
                        // Fallback: open browser print dialog
                        window.print();
                      } catch (e) {
                        console.error('Print fallback failed', e);
                      }
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
              <div ref={invoicePrintRef} className="shadow-2xl rounded-xl overflow-hidden border border-outline-variant/30 self-start" style={{ width: paperSize === 'a5' ? '559px' : paperSize === '80mm' || paperSize === 'receipt' ? '302px' : '794px' }}>
                <InvoiceDocument
                  key={`${invoiceToPrint?.id || 'preview'}-${paperSize}`}
                  invoice={invoiceToPrint}
                  tenantName={tenantName}
                  partyName={partyForPrint?.name || 'Unknown'}
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
              <InvoiceDocument
                key={`print-${invoiceToPrint?.id || 'preview'}-${paperSize}`}
                invoice={invoiceToPrint}
                tenantName={tenantName}
                partyName={partyForPrint?.name || 'Unknown'}
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
                  <InvoiceDocument
                    invoice={inv}
                    tenantName={tenantName}
                    partyName={parties.find(p => p.id === inv.party_id)?.name || 'Unknown'}
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
                <InvoiceDocument
                  key={inv.id}
                  invoice={inv}
                  tenantName={tenantName}
                  partyName={parties.find(p => p.id === inv.party_id)?.name || 'Unknown'}
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
        <Suspense fallback={null}>
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
        </Suspense>
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
                  disabled={isDeleting}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {isDeleting && <Loader2 size={16} className="animate-spin" />}
                  {t('invoices.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {invoiceToReturn && (
        <Suspense fallback={null}>
          <ReturnInvoiceModal
            invoice={invoiceToReturn}
            onClose={() => setInvoiceToReturn(null)}
            onSaved={() => {
              setInvoiceToReturn(null);
              loadHistory(historyPage, historyPageSize);
              api.getInventoryReport().then(setInventory);
            }}
          />
        </Suspense>
      )}
    </>
  );
}
