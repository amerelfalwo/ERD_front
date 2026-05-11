import { useState, useEffect, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
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
import html2pdf from 'html2pdf.js';


function InvoiceItemRow({ item, products, invoiceType, onQuantityChange, onRemove, onEdit }) {
  const product = products.find((p) => p.id === item.product_id);
  const displayName = item.product_name || product?.name || `#${item.product_id ?? item.batch_id}`;
  const unitPrice = invoiceType === 'sale' ? Number(item.sale_price || 0) : Number(item.purchase_price || 0);
  const lineTotal = unitPrice * Number(item.quantity);

  return (
    <div className="grid grid-cols-12 gap-2 items-center px-4 py-2.5 border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors group">
      <div className="col-span-4 flex flex-col">
        <span className="text-label-md text-charcoal-ink truncate">{displayName}</span>
        {invoiceType === 'purchase' && item.purchase_price !== undefined && (
          <span className="font-mono-tabular text-label-sm text-muted-steel mt-0.5">
            Buy: {Number(item.purchase_price).toLocaleString()} | Sell: {Number(item.selling_price).toLocaleString()}
          </span>
        )}
        {invoiceType === 'sale' && item.sale_price != null && (
          <span className="font-mono-tabular text-label-sm text-muted-steel mt-0.5">
            Price: {Number(item.sale_price).toLocaleString()}
          </span>
        )}
      </div>
      <div className="col-span-3 flex justify-center">
        <div className="flex items-center gap-0 bg-surface-container-lowest border border-outline-variant/60 rounded-xl overflow-hidden">
          <button onClick={() => onQuantityChange(item.product_id, Math.max(1, item.quantity - 1))} className="p-1.5 text-muted-steel hover:text-accent hover:bg-accent-surface transition-colors cursor-pointer"><Minus size={14} /></button>
          <span className="w-8 text-center font-mono-tabular text-label-md text-charcoal-ink border-x border-outline-variant/40 py-1">{item.quantity}</span>
          <button onClick={() => onQuantityChange(item.product_id, item.quantity + 1)} className="p-1.5 text-muted-steel hover:text-accent hover:bg-accent-surface transition-colors cursor-pointer"><Plus size={14} /></button>
        </div>
      </div>
      <div className="col-span-3 text-right">
        <span className="font-mono-tabular text-label-md text-charcoal-ink font-medium">EGP {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
      </div>
      <div className="col-span-2 flex justify-end gap-1">
        <button onClick={() => onEdit(item)} className="p-1.5 rounded-xl text-muted-steel/50 hover:bg-accent-surface hover:text-accent transition-all opacity-0 group-hover:opacity-100 cursor-pointer btn-tactile" title="Edit"><Edit size={14} /></button>
        <button onClick={() => onRemove(item.product_id)} className="p-1.5 rounded-xl text-error/50 hover:bg-error-container/20 hover:text-error transition-all opacity-0 group-hover:opacity-100 cursor-pointer btn-tactile" title="Delete"><Trash2 size={14} /></button>
      </div>
    </div>
  );
}


export default function InvoicesView() {
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
      alert(err.response?.data?.detail || 'Failed to delete invoice');
    }
  }

  useEffect(() => {
    Promise.all([api.getParties(), api.getProducts(), api.getInventoryReport(), api.getTemplates()])
      .then(([p, pr, inv, tmpl]) => { setParties(p); setProducts(pr); setInventory(inv); setTemplates(tmpl); })
      .catch(console.error);
    loadHistory();
  }, []);

  const filteredParties = parties.filter((p) => invoiceType === 'sale' ? p.party_type === 'client' : p.party_type === 'supplier');

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

  const addItem = useCallback(() => {
    if (!selectedProduct) return;
    const qty = parseInt(itemQuantity) || 1;

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
  }, [selectedProduct, invoiceType, purchasePrice, sellingPrice, salePrice, itemQuantity, autoFetchedCost, storeAddItem, updateItem, editingItemId]);

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
      alert(err?.message || 'Error creating product');
    } finally {
      setCreatingProduct(false);
    }
  }

  async function handleSubmit() {
    if (items.length === 0) return;

    let partyId = selectedParty ? parseInt(selectedParty) : null;

    // If new party mode, create the party first
    if (isNewParty) {
      if (!newPartyName.trim()) { alert('يرجى إدخال اسم العميل'); return; }
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
        alert(err?.message || 'Error creating party');
        setSubmitting(false);
        return;
      }
    } else if (!partyId) {
      alert('يرجى اختيار طرف أو إضافة عميل جديد');
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
    } catch (err) { alert(err?.message || 'Error'); }
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
    } catch (err) { alert(err?.message || 'Error'); }
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
              <h2 className="text-h1 text-charcoal-ink">Invoices</h2>
              <p className="text-body-base text-muted-steel mt-1">Manage sales, purchases, and returns.</p>
            </div>
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-1 flex gap-1 shadow-whisper">
              <button onClick={() => setActiveTab('create')}
                className={`px-4 py-2 rounded-lg text-label-md transition-all duration-200 cursor-pointer btn-tactile flex items-center gap-2
                  ${activeTab === 'create' ? 'bg-accent text-on-primary shadow-sm' : 'text-muted-steel hover:bg-surface-container-low'}`}>
                <Plus size={16} /> Add Invoice
              </button>
              <button onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg text-label-md transition-all duration-200 cursor-pointer btn-tactile flex items-center gap-2
                  ${activeTab === 'history' ? 'bg-accent text-on-primary shadow-sm' : 'text-muted-steel hover:bg-surface-container-low'}`}>
                <Package size={16} /> History
              </button>
            </div>
          </div>
        </div>

        {activeTab === 'create' && (
        <div className="max-w-7xl mx-auto space-y-6 px-6">
          <div className="mb-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in-up">
            <h2 className="text-h3 text-charcoal-ink">Invoice Details</h2>
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-1 flex gap-1 shadow-whisper">
              {['sale', 'purchase'].map((t) => (
                <button key={t} onClick={() => setInvoiceType(t)}
                  className={`px-4 py-1.5 rounded-lg text-label-md capitalize transition-all duration-200 cursor-pointer btn-tactile
                    ${invoiceType === t ? 'bg-accent text-on-primary shadow-sm' : 'text-muted-steel hover:bg-surface-container-low'}`}>
                  {t} Invoice
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
                    <h3 className="text-h3 text-charcoal-ink">{invoiceType === 'sale' ? 'Client' : 'Supplier'} Information</h3>
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
                      {isNewParty ? 'اختيار موجود' : 'عميل جديد'}
                    </button>
                  )}
                </div>

                {!isNewParty ? (
                  <div>
                    <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">Select Party</label>
                    <select value={selectedParty} onChange={(e) => setSelectedParty(e.target.value)} className={selectClass}>
                      <option value="">Choose a party...</option>
                      {filteredParties.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` — ${p.phone}` : ''}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">اسم العميل *</label>
                      <div className="relative">
                        <UserSquare2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                        <input
                          type="text"
                          value={newPartyName}
                          onChange={(e) => setNewPartyName(e.target.value)}
                          placeholder="ادخل اسم العميل..."
                          className={`${inputClass} pr-10`}
                          dir="rtl"
                          autoFocus
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">رقم الهاتف</label>
                        <div className="relative">
                          <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                          <input
                            type="tel"
                            value={newPartyPhone}
                            onChange={(e) => setNewPartyPhone(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            className={`${inputClass} pl-10`}
                            dir="ltr"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-label-sm text-muted-steel block uppercase tracking-wider mb-1.5">العنوان</label>
                        <div className="relative">
                          <MapPin size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-steel/50" />
                          <input
                            type="text"
                            value={newPartyAddress}
                            onChange={(e) => setNewPartyAddress(e.target.value)}
                            placeholder="المنطقة / الشارع"
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
                  <h3 className="text-h3 text-charcoal-ink">Line Items</h3>
                </div>

                <div className="flex flex-col sm:flex-row gap-2 mb-4">
                  <div className="relative flex-1">
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
                      placeholder="Search or type to add product..."
                      className={inputClass}
                    />
                    {showProductDropdown && (
                      <div className="absolute top-full mt-1 left-0 w-full bg-surface-container-lowest border border-outline-variant/60 rounded-xl shadow-lg z-50 max-h-48 overflow-y-auto">
                        {products.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                          <div 
                            key={p.id} 
                            className="px-4 py-2 hover:bg-surface-container-low cursor-pointer text-charcoal-ink text-sm"
                            onClick={() => {
                              setProductSearch(p.name);
                              setSelectedProduct(p.id);
                              setShowProductDropdown(false);
                            }}
                          >
                            {p.name}
                          </div>
                        ))}
                        {productSearch && !products.some(p => p.name.toLowerCase() === productSearch.toLowerCase()) && invoiceType === 'purchase' && (
                          <div 
                            className="px-4 py-2 text-accent hover:bg-accent-surface cursor-pointer flex items-center gap-2 text-sm border-t border-outline-variant/30"
                            onClick={handleCreateNewProduct}
                          >
                            {creatingProduct ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                            Add new product: "{productSearch}"
                          </div>
                        )}
                        {!productSearch && products.length === 0 && (
                          <div className="px-4 py-2 text-muted-steel text-sm">No products available</div>
                        )}
                      </div>
                    )}
                  </div>
                  {invoiceType === 'purchase' && (
                    <>
                      <input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="سعر الشراء" className={`sm:w-28 ${inputClass}`} />
                    </>
                  )}
                  {invoiceType === 'sale' && (
                    <div className="flex flex-col gap-1">
                      <input
                        type="number"
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        placeholder="سعر البيع"
                        className={`sm:w-32 ${inputClass}`}
                      />
                      {autoFetchedCost != null && (
                        <span className="text-[10px] text-muted-steel px-1">
                          Cost: <span className="font-mono font-semibold text-charcoal-ink">{autoFetchedCost.toLocaleString()}</span>
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
                  <input
                    type="number"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    placeholder="الكمية"
                    min="1"
                    className={`sm:w-20 ${inputClass} text-center`}
                  />
                  <div className="flex items-center gap-1">
                    <button onClick={addItem} disabled={!selectedProduct}
                      className={`px-4 py-2 rounded-xl text-on-primary text-label-md shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer btn-tactile ${
                        editingItemId ? 'bg-amber-500 hover:bg-amber-600' : 'bg-accent hover:bg-accent-hover'
                      }`}>
                      {editingItemId ? <><Edit size={14} /> Update</> : <><Plus size={16} /> Add</>}
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
                    <div className="col-span-4">Product</div>
                    <div className="col-span-3 text-center">Qty</div>
                    <div className="col-span-3 text-right">Total</div>
                    <div className="col-span-2 text-right">Actions</div>
                  </div>
                  <div className="bg-surface-container-lowest">
                    {items.length > 0 ? (
                      items.map((item) => <InvoiceItemRow key={item.product_id} item={item} products={products} invoiceType={invoiceType} onQuantityChange={updateQuantity} onRemove={removeItem} onEdit={handleEditItem} />)
                    ) : (
                      <div className="flex flex-col items-center justify-center py-10 text-muted-steel">
                        <ShoppingCart size={32} strokeWidth={1.2} className="mb-3 opacity-30" />
                        <p className="text-body-base text-charcoal-ink">No items added yet</p>
                        <p className="text-body-sm text-muted-steel mt-1">Select a product and click Add</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper relative overflow-hidden animate-fade-in-up stagger-3">
                <div className="absolute top-0 left-0 w-full h-[3px] bg-accent rounded-t-2xl" />
                <h3 className="text-h3 text-charcoal-ink mb-4 mt-1">Current Order</h3>
                <div className="space-y-3 mb-6">
                  <div className="flex justify-between items-center text-body-sm text-muted-steel">
                    <span>Items Count</span>
                    <span className="font-mono-tabular text-charcoal-ink font-medium">{items.length}</span>
                  </div>
                  {items.length > 0 && (
                    <>
                      <div className="flex justify-between items-center text-body-sm text-muted-steel border-t border-outline-variant/30 pt-2">
                        <span>Subtotal</span>
                        <span className="font-mono-tabular text-charcoal-ink font-medium">EGP {subtotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
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
                            {hasDelivery ? 'يوجد توصيل ✓' : 'إضافة توصيل'}
                          </button>
                          {hasDelivery && (
                            <input
                              type="number"
                              value={deliveryFee}
                              onChange={(e) => setDeliveryFee(e.target.value)}
                              placeholder="سعر التوصيل"
                              className="w-28 bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1.5 text-sm text-right text-charcoal-ink focus:border-accent outline-none"
                              autoFocus
                            />
                          )}
                        </div>
                        {hasDelivery && deliveryFee && (
                          <div className="flex justify-between items-center text-body-sm text-muted-steel">
                            <span>Delivery Fee / توصيل</span>
                            <span className="font-mono-tabular text-charcoal-ink font-medium">EGP {Number(deliveryFee || 0).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex justify-between items-center text-body-sm text-muted-steel border-t border-outline-variant/30 pt-2">
                        <span>Total Amount</span>
                        <span className="font-mono-tabular text-charcoal-ink font-medium">EGP {totalAmount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                      {invoiceType === 'sale' && totalProfit !== 0 && (
                        <div className="flex justify-between items-center text-body-sm border-t border-outline-variant/30 pt-2">
                          <span className="text-muted-steel">Est. Profit / الربح</span>
                          <span className={`font-mono-tabular font-bold text-sm ${
                            totalProfit > 0 ? 'text-emerald-600' : 'text-red-500'
                          }`}>
                            {totalProfit > 0 ? '+' : ''}EGP {totalProfit.toLocaleString(undefined, {minimumFractionDigits: 2})}
                          </span>
                        </div>
                      )}
                      <div className="flex justify-between items-center text-body-sm text-muted-steel pt-1">
                        <span>Amount Paid</span>
                        <input type="number" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} placeholder="0.00" className="w-24 bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1 text-sm text-right text-charcoal-ink focus:border-accent outline-none" />
                      </div>
                      <div className="flex justify-between items-center text-label-md text-charcoal-ink border-t border-outline-variant/30 pt-2">
                        <span>Remaining Balance</span>
                        <span className="font-mono-tabular font-medium text-error">EGP {Math.max(0, totalAmount - (parseFloat(amountPaid) || 0)).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                      </div>
                    </>
                  )}
                </div>
                <button onClick={handleSubmit} disabled={submitting || (!selectedParty && !isNewParty) || items.length === 0 || (isNewParty && !newPartyName.trim())}
                  className="w-full bg-accent hover:bg-accent-hover text-on-primary text-label-md py-2.5 rounded-xl flex items-center justify-center gap-2 transition-all duration-200 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer btn-tactile">
                  {submitting ? <Loader2 size={18} className="animate-spin" /> : <><CheckCircle2 size={18} /> Generate Invoice</>}
                </button>
              </div>

              {lastInvoice && (
                <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper relative overflow-hidden animate-scale-in">
                  <div className="absolute top-0 left-0 w-full h-[3px] bg-gradient-to-r from-accent to-accent-muted rounded-t-2xl" />
                  <h3 className="text-h3 text-charcoal-ink mb-4 mt-1">Last Generated Invoice</h3>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-body-sm text-muted-steel border-b border-outline-variant/20 pb-2">
                      <span>Invoice ID</span>
                      <span className="font-mono-tabular text-charcoal-ink">#{lastInvoice.id}</span>
                    </div>
                    <div className="flex justify-between items-center text-body-sm text-muted-steel border-b border-outline-variant/20 pb-2">
                      <span>Status</span>
                      <span className={`text-label-sm px-2 py-0.5 rounded-lg ${lastInvoice.status === 'paid' ? 'bg-accent-surface text-accent' : 'bg-error-container/30 text-error'}`}>{lastInvoice.status}</span>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-outline-variant/30">
                      <span className="text-label-md text-charcoal-ink">Total Amount</span>
                      <span className="text-h2 text-accent font-mono-tabular tracking-tight">EGP {Number(lastInvoice.total_amount).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2">
                    <button onClick={() => handleOpenPrintPreview(lastInvoice)}
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
                      <Printer size={18} />
                      Print Invoice
                    </button>
                    {templates.length > 0 && (
                      <button onClick={handlePrintFromTemplate} disabled={loadingPreview}
                        className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-label-md border border-outline-variant/60 text-charcoal-ink hover:bg-surface-container-low transition-all duration-200 cursor-pointer btn-tactile disabled:opacity-50">
                        {loadingPreview ? <Loader2 size={18} className="animate-spin" /> : <Printer size={18} />}
                        Template
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
              <h3 className="text-h3 text-charcoal-ink">Previous Invoices</h3>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel" />
                  <input 
                    type="text" 
                    placeholder="Search by ID or Type..." 
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                    className="pl-9 pr-4 py-2 bg-surface-container-low border border-outline-variant/60 rounded-xl text-sm focus:border-accent outline-none"
                  />
                </div>
                {selectedIds.size > 0 && (
                  <button onClick={handleBulkPrint}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 transition-all shadow-sm cursor-pointer btn-tactile">
                    <Printer size={16} /> Print Selected ({selectedIds.size})
                  </button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-outline-variant/30 text-label-sm text-muted-steel uppercase tracking-wider">
                    <th className="py-3 px-4 text-left w-10"></th>
                    <th className="py-3 px-4 text-left">ID</th>
                    <th className="py-3 px-4 text-left">Type</th>
                    <th className="py-3 px-4 text-right">Total</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-left">Date</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceHistory.filter(inv => {
                    if (!historySearch) return true;
                    const s = historySearch.toLowerCase();
                    return String(inv.id).includes(s) || inv.invoice_type.replace('_', ' ').toLowerCase().includes(s) || inv.status.toLowerCase().includes(s);
                  }).map((inv) => (
                  <tr key={inv.id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-4">
                      <input type="checkbox" checked={selectedIds.has(inv.id)} onChange={() => toggleSelect(inv.id)}
                        className="w-4 h-4 rounded border-outline-variant/60 text-accent focus:ring-accent/20 cursor-pointer" />
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-charcoal-ink">#{String(inv.id).padStart(5, '0')}</td>
                    <td className="py-3 px-4 capitalize text-muted-steel">{inv.invoice_type.replace('_', ' ')}</td>
                    <td className="py-3 px-4 text-right font-mono-tabular text-charcoal-ink">EGP {Number(inv.total_amount).toLocaleString()}</td>
                    <td className="py-3 px-4 text-center">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-lg ${inv.status === 'paid' ? 'bg-accent-surface text-accent' : inv.status === 'partial' ? 'bg-amber-100 text-amber-700' : 'bg-error-container/30 text-error'}`}>{inv.status}</span>
                    </td>
                    <td className="py-3 px-4 font-mono-tabular text-muted-steel text-xs">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : '-'}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {(inv.invoice_type === 'SALE' || inv.invoice_type === 'PURCHASE') && (
                          <button onClick={() => setEditingInvoice(inv)}
                            className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile"
                            title="Edit">
                            <Edit size={16} />
                          </button>
                        )}
                        <button onClick={() => handleOpenPrintPreview(inv)}
                          className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all cursor-pointer btn-tactile"
                          title="Print">
                          <Printer size={16} />
                        </button>
                        <button onClick={() => setInvoiceToDelete(inv)}
                          className="p-1.5 rounded-xl text-muted-steel hover:bg-error-container/30 hover:text-error transition-all cursor-pointer btn-tactile"
                          title="Delete">
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
                No invoices found.
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
                  <h3 className="text-label-md text-charcoal-ink font-semibold leading-tight">Print Preview</h3>
                  <p className="text-[11px] text-muted-steel mt-0.5">Invoice #{String(invoiceToPrint.id).padStart(5, '0')}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={paperSize}
                  onChange={(e) => setPaperSize(e.target.value)}
                  className="px-3 py-2 rounded-xl text-label-md border border-outline-variant/60 bg-surface-container-lowest text-muted-steel focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all text-sm cursor-pointer"
                >
                  <option value="a4">A4 Paper</option>
                  <option value="a5">A5 Paper</option>
                  <option value="receipt">Receipt (80mm)</option>
                </select>
                <button onClick={handleClosePrintPreview}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile">
                  <X size={16} />
                  Cancel
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
                      console.error('PDF generation failed:', err);
                    } finally {
                      setDownloadingPdf(false);
                    }
                  }}
                  disabled={downloadingPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md bg-charcoal-ink text-white hover:opacity-90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {downloadingPdf ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                  Save PDF
                </button>
                <button onClick={handleConfirmPrint}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile">
                  <Printer size={16} />
                  Confirm Print
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-8 flex justify-center">
              <div ref={invoicePrintRef} className="shadow-2xl rounded-xl overflow-hidden border border-outline-variant/30 self-start">
                <InvoicePrintTemplate
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
              <InvoicePrintTemplate
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
                <h3 className="text-label-md text-charcoal-ink font-semibold">Bulk Print — {bulkInvoicesToPrint.length} invoices</h3>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleClosePrintPreview}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-label-md text-muted-steel border border-outline-variant/60 hover:bg-surface-container-low transition-all cursor-pointer btn-tactile">
                  <X size={16} /> Cancel
                </button>
                <button onClick={handleConfirmPrint}
                  className="flex items-center gap-2 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer btn-tactile">
                  <Printer size={16} /> Print All
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto py-8 flex flex-col items-center gap-8">
              {bulkInvoicesToPrint.map((inv) => (
                <div key={inv.id} className="shadow-2xl rounded-xl overflow-hidden border border-outline-variant/30">
                  <InvoicePrintTemplate
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
                <InvoicePrintTemplate
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
