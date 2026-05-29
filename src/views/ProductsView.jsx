import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Package, ChevronDown, ChevronUp, X, Loader2, Trash2, Pencil } from 'lucide-react';
import api from '../services/api';
import { notifications } from '@mantine/notifications';

function AddProductModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api.createProduct({ 
        name: name.trim(),
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : 0,
        sell_price: sellPrice ? parseFloat(sellPrice) : 0
      });
      setName('');
      setPurchasePrice('');
      setSellPrice('');
      onCreated();
      onClose();
    } catch (err) { notifications.show({ title: 'Error', message: err?.message || 'Error', color: 'red' }); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-ink/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-whisper-lg w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <h3 className="text-h3 text-charcoal-ink tracking-tight">Add New Product</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Product Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter product name" autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Purchase Price</label>
            <input type="number" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Sell Price</label>
            <input type="number" step="any" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">Cancel</button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Create Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProductModal({ isOpen, onClose, product, onUpdated }) {
  const [name, setName] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellPrice, setSellPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setPurchasePrice(product.purchase_price != null ? String(product.purchase_price) : '');
      setSellPrice(product.sell_price != null ? String(product.sell_price) : '');
    }
  }, [product]);

  if (!isOpen || !product) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api.updateProduct(product.id, { 
        name: name.trim(),
        purchase_price: purchasePrice ? parseFloat(purchasePrice) : 0,
        sell_price: sellPrice ? parseFloat(sellPrice) : 0
      });
      onUpdated();
      onClose();
    } catch (err) { notifications.show({ title: 'Error', message: err?.message || 'Error', color: 'red' }); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-ink/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-whisper-lg w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <h3 className="text-h3 text-charcoal-ink tracking-tight">Edit Product</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Product Name</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter product name" autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Purchase Price</label>
            <input type="number" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Sell Price</label>
            <input type="number" step="any" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">Cancel</button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BatchRow({ batch }) {
  return (
    <div className="grid grid-cols-5 gap-2 py-2.5 px-6 text-body-sm text-muted-steel bg-surface-container-low/30 hover:bg-surface-container-low/60 transition-colors">
      <span className="font-mono-tabular">#{batch.id}</span>
      <span className="truncate">{batch.supplier_name || '—'}</span>
      <span className="font-mono-tabular">{Number(batch.purchase_price).toLocaleString()}</span>
      <span className="font-mono-tabular">{Number(batch.current_selling_price).toLocaleString()}</span>
      <span className="font-mono-tabular">{Number(batch.remaining_quantity).toLocaleString()}</span>
    </div>
  );
}

function ProductRow({ product, inventoryProduct, onDelete, onEdit }) {
  const [expanded, setExpanded] = useState(false);
  const [batches, setBatches] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);

  const totalQty = inventoryProduct?.batches?.reduce((sum, b) => sum + parseFloat(b.remaining_quantity || 0), 0) || 0;
  
  const displayPurchasePrice = product.current_cost ?? product.purchase_price ?? 0;
  const displaySellPrice = product.current_selling_price ?? product.sell_price ?? 0;

  async function toggleExpand() {
    if (!expanded && batches.length === 0) {
      setLoadingBatches(true);
      try { const data = await api.getBatchesByProduct(product.id); setBatches(data); }
      catch { setBatches([]); }
      finally { setLoadingBatches(false); }
    }
    setExpanded(!expanded);
  }

  return (
    <div className="border-b border-outline-variant/30 last:border-0">
      <div className="grid grid-cols-12 gap-2 items-center py-3.5 px-6 cursor-pointer hover:bg-surface-container-low/50 transition-colors duration-200 group" onClick={toggleExpand}>
        <div className="col-span-1 font-mono-tabular text-label-sm text-muted-steel">{product.id}</div>
        <div className="col-span-2 min-w-0">
          <span className="text-label-md text-charcoal-ink truncate block" dir="auto">{product.name}</span>
        </div>
        <div className="col-span-2 min-w-0">
          <span className="text-body-sm text-muted-steel truncate block" dir="auto">{product.supplier_name || '—'}</span>
        </div>
        <div className="col-span-2 font-mono-tabular text-body-sm text-muted-steel text-right">{Number(displayPurchasePrice).toLocaleString()}</div>
        <div className="col-span-1 font-mono-tabular text-body-sm text-muted-steel text-right">{Number(displaySellPrice).toLocaleString()}</div>
        <div className="col-span-2 font-mono-tabular text-body-sm text-muted-steel text-right">{totalQty.toLocaleString()}</div>
        <div className="col-span-2 flex items-center justify-end gap-2">
          <span className={`text-label-sm px-2 py-0.5 rounded-lg ${totalQty > 0 ? 'bg-accent-surface text-accent' : 'bg-error-container/30 text-error'}`}>
            {totalQty > 0 ? 'In Stock' : 'Out'}
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(product); }}
            className="p-1.5 rounded-xl text-muted-steel hover:bg-surface-container-low hover:text-accent transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer btn-tactile"
          >
            <Pencil size={16} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(product); }}
            className="p-1.5 rounded-xl text-muted-steel hover:bg-error-container/30 hover:text-error transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer btn-tactile"
          >
            <Trash2 size={16} />
          </button>
          <div className="text-muted-steel group-hover:text-charcoal-ink transition-colors">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </div>
      {expanded && (
        <div className="bg-surface-container-low/20 border-t border-outline-variant/20 animate-fade-in-up">
          <div className="grid grid-cols-5 gap-2 py-2.5 px-6 text-label-sm uppercase tracking-wider text-muted-steel/70">
            <span>Batch ID</span><span>Supplier</span><span>In Price</span><span>Selling Price</span><span>Remaining</span>
          </div>
          {loadingBatches ? (
            <div className="py-3 px-6 space-y-1.5">{[1,2].map(i => <div key={i} className="h-8 rounded-lg animate-shimmer" />)}</div>
          ) : batches.length > 0 ? (
            batches.map((b) => <BatchRow key={b.id} batch={b} />)
          ) : (
            <div className="text-center py-4 text-body-sm text-muted-steel">No batches found</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProductsView() {
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [stockFilter, setStockFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [showModal, setShowModal] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [productToEdit, setProductToEdit] = useState(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  async function fetchProducts() {
    await Promise.resolve();
    setLoading(true);
    try {
      const [prods, inv] = await Promise.all([api.getProducts(), api.getInventoryReport()]);
      setProducts(prods); setInventory(inv);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchProducts(); }, []);

  async function handleDeleteProduct() {
    if (!productToDelete) return;
    setDeletingProduct(true);
    try {
      await api.deleteProduct(productToDelete.id);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      notifications.show({ title: 'Error', message: err?.message || 'Error', color: 'red' });
    } finally {
      setDeletingProduct(false);
    }
  }

  const inventoryMap = useMemo(() => {
    const map = {};
    if (inventory?.products) inventory.products.forEach((p) => { map[p.product_id] = p; });
    return map;
  }, [inventory]);

  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        if (!p.name.toLowerCase().includes(search.toLowerCase())) return false;
        if (stockFilter !== 'all') {
          const invProd = inventoryMap[p.id];
          const totalQty = invProd?.batches?.reduce((sum, b) => sum + parseFloat(b.remaining_quantity || 0), 0) || 0;
          if (stockFilter === 'in_stock' && totalQty <= 0) return false;
          if (stockFilter === 'out_of_stock' && totalQty > 0) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        return 0;
      });
  }, [products, search, stockFilter, sortBy, inventoryMap]);

  const selectClass = "px-4 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-muted-steel focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200 appearance-none min-w-[120px] cursor-pointer";

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-h1 text-charcoal-ink">Product Inventory</h2>
          <p className="text-body-base text-muted-steel mt-1">Manage your product catalog and track stock levels.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
          <Plus size={18} strokeWidth={2.5} /> Add Product
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up stagger-1">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
          />
        </div>
        <div className="flex gap-2">
          <select value={stockFilter} onChange={(e) => setStockFilter(e.target.value)} className={selectClass}>
            <option value="all">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
          </select>
        </div>
      </div>

      <div className="animate-fade-in-up stagger-2 bg-surface-container-lowest rounded-2xl shadow-whisper border border-outline-variant/60 overflow-hidden">
        <div className="grid grid-cols-12 gap-2 items-center py-3 px-6 border-b border-outline-variant/40 bg-surface-container-low/30">
          <span className="col-span-1 text-label-sm uppercase tracking-wider text-muted-steel/70">ID</span>
          <span className="col-span-2 text-label-sm uppercase tracking-wider text-muted-steel/70">Product Name</span>
          <span className="col-span-2 text-label-sm uppercase tracking-wider text-muted-steel/70">Supplier</span>
          <span className="col-span-2 text-label-sm uppercase tracking-wider text-muted-steel/70 text-right">In Price</span>
          <span className="col-span-1 text-label-sm uppercase tracking-wider text-muted-steel/70 text-right">Sell</span>
          <span className="col-span-2 text-label-sm uppercase tracking-wider text-muted-steel/70 text-right">Quantity</span>
          <span className="col-span-2 text-label-sm uppercase tracking-wider text-muted-steel/70 text-right">Status</span>
        </div>
        {loading ? (
          <div>{[1,2,3,4,5].map((i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-center py-3.5 px-6 border-b border-outline-variant/20">
              <div className="col-span-1"><div className="w-8 h-4 rounded-lg animate-shimmer" /></div>
              <div className="col-span-2"><div className="w-24 h-4 rounded-lg animate-shimmer" /></div>
              <div className="col-span-2"><div className="w-20 h-4 rounded-lg animate-shimmer" /></div>
              <div className="col-span-2"><div className="w-16 h-4 rounded-lg animate-shimmer ml-auto" /></div>
              <div className="col-span-1"><div className="w-12 h-4 rounded-lg animate-shimmer ml-auto" /></div>
              <div className="col-span-2"><div className="w-12 h-4 rounded-lg animate-shimmer ml-auto" /></div>
              <div className="col-span-2"><div className="w-16 h-4 rounded-lg animate-shimmer ml-auto" /></div>
            </div>
          ))}</div>
        ) : filteredProducts.length > 0 ? (
          filteredProducts.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              inventoryProduct={inventoryMap[product.id]}
              onDelete={setProductToDelete}
              onEdit={setProductToEdit}
            />
          ))
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-muted-steel">
            <Package size={40} strokeWidth={1.2} className="mb-4 opacity-30" />
            <p className="text-body-base text-charcoal-ink">No products found</p>
            <p className="text-body-sm text-muted-steel mt-1">Add your first product to get started</p>
          </div>
        )}
      </div>

      <AddProductModal isOpen={showModal} onClose={() => setShowModal(false)} onCreated={fetchProducts} />
      <EditProductModal isOpen={!!productToEdit} product={productToEdit} onClose={() => setProductToEdit(null)} onUpdated={fetchProducts} />
      
      {productToDelete && (
        <div className="fixed inset-0 z-[70] bg-charcoal-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-error-container/30 text-error flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-h3 text-charcoal-ink mb-2">Delete Product</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6" dir="auto">
                Are you sure you want to delete {productToDelete.name}? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProduct}
                  disabled={deletingProduct}
                  className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {deletingProduct ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
