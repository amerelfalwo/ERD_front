import { useState, useEffect, useMemo } from 'react';
import { X, Loader2, Search, Filter, ChevronDown, Plus } from 'lucide-react';
import { MantineReactTable, useMantineReactTable } from 'mantine-react-table';
import { ActionIcon, Flex, Tooltip, Menu } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconEdit, IconTrash } from '@tabler/icons-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';

function AddProductModal({ isOpen, onClose, onCreated }) {
  const { t } = useTranslation();
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
    } catch (err) { notifications.show({ title: t('common.error'), message: err?.response?.data?.detail || err?.message || t('products.failedCreate'), color: 'red' }); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-ink/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-whisper-lg w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <h3 className="text-h3 text-charcoal-ink tracking-tight">{t('products.addNewProduct')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('products.productName')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('products.enterProductName')} autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('products.purchasePrice')}</label>
            <input type="number" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('products.sellPrice')}</label>
            <input type="number" step="any" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {t('products.createProduct')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProductModal({ isOpen, onClose, product, onUpdated }) {
  const { t } = useTranslation();
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
    } catch (err) { notifications.show({ title: t('common.error'), message: err?.response?.data?.detail || err?.message || t('products.failedUpdate'), color: 'red' }); }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-ink/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-whisper-lg w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <h3 className="text-h3 text-charcoal-ink tracking-tight">{t('products.editProduct')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('products.productName')}</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder={t('products.enterProductName')} autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('products.purchasePrice')}</label>
            <input type="number" step="any" value={purchasePrice} onChange={(e) => setPurchasePrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('products.sellPrice')}</label>
            <input type="number" step="any" value={sellPrice} onChange={(e) => setSellPrice(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {t('products.saveChanges')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProductsView() {
  const { t } = useTranslation();
  const [products, setProducts] = useState([]);
  const [inventory, setInventory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
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
      notifications.show({ title: t('common.error'), message: err?.response?.data?.detail || err?.message || t('products.failedDelete'), color: 'red' });
    } finally {
      setDeletingProduct(false);
    }
  }

  const inventoryMap = useMemo(() => {
    const map = {};
    if (inventory?.products) inventory.products.forEach((p) => { map[p.product_id] = p; });
    return map;
  }, [inventory]);

  const tableData = useMemo(() => {
    let data = products.map((p) => {
      const invProd = inventoryMap[p.id];
      const totalQty = invProd?.batches?.reduce((sum, b) => sum + parseFloat(b.remaining_quantity || 0), 0) || 0;
      return {
        id: p.id,
        name: p.name,
        purchase_price: p.current_cost ?? p.purchase_price ?? 0,
        sell_price: p.current_selling_price ?? p.sell_price ?? 0,
        quantity: totalQty,
        _original: p,
      };
    });

    if (statusFilter === 'In Stock') {
      data = data.filter(p => p.quantity > 0);
    } else if (statusFilter === 'Out of Stock') {
      data = data.filter(p => p.quantity === 0);
    }

    return data;
  }, [products, inventoryMap, statusFilter]);

  const columns = useMemo(() => [
    {
      accessorKey: 'id',
      header: t('common.id'),
      size: 80,
    },
    {
      accessorKey: 'name',
      header: t('products.productName'),
      size: 250,
    },
    {
      accessorKey: 'purchase_price',
      header: t('products.purchasePrice'),
      size: 140,
      Cell: ({ cell }) => `${Number(cell.getValue()).toLocaleString()} ${t('common.currency')}`,
    },
    {
      accessorKey: 'sell_price',
      header: t('products.sellPrice'),
      size: 140,
      Cell: ({ cell }) => `${Number(cell.getValue()).toLocaleString()} ${t('common.currency')}`,
    },
    {
      accessorKey: 'quantity',
      header: t('common.quantity'),
      size: 120,
      Cell: ({ cell }) => Number(cell.getValue()).toLocaleString(),
    },
    {
      accessorKey: 'status',
      header: t('common.status'),
      size: 120,
      enableSorting: false,
      enableColumnFilter: false,
      Cell: ({ row }) => {
        const qty = row.original.quantity;
        return (
          <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-wide ${qty > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
            {qty > 0 ? t('products.inStock') : t('products.outOfStock')}
          </span>
        );
      },
    },
  ], [t]);

  const table = useMantineReactTable({
    columns,
    data: tableData,
    enableRowActions: true,
    positionActionsColumn: 'last',
    state: { isLoading: loading, globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    enableTopToolbar: false,
    initialState: {
      density: 'md',
      pagination: { pageSize: 25 },
    },
    mantineTableProps: {
      highlightOnHover: true,
      withTableBorder: false,
      withColumnBorders: false,
      withRowBorders: true,
    },
    mantinePaperProps: {
      shadow: 'sm',
      radius: 'xl',
      withBorder: true,
      className: "border-outline-variant/40 overflow-hidden",
    },
    mantineTableBodyRowProps: {
      className: 'group',
    },
    renderRowActions: ({ row }) => (
      <Flex gap="xs" className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <Tooltip label={t('common.edit')}>
          <ActionIcon
            variant="subtle"
            color="violet"
            onClick={() => setProductToEdit(row.original._original)}
          >
            <IconEdit size={18} />
          </ActionIcon>
        </Tooltip>
        <Tooltip label={t('common.delete')}>
          <ActionIcon
            variant="subtle"
            color="red"
            onClick={() => setProductToDelete(row.original._original)}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </Flex>
    ),
    renderEmptyRowsFallback: () => (
      <div className="flex flex-col items-center justify-center py-16 text-muted-steel">
        <p className="text-body-base text-charcoal-ink">{t('products.noProducts')}</p>
        <p className="text-body-sm text-muted-steel mt-1">{t('products.noProductsHint')}</p>
      </div>
    ),
  });

  return (
    <div className="space-y-6">
      <div className="animate-fade-in-up">
        <h2 className="text-h1 text-charcoal-ink">{t('products.title')}</h2>
        <p className="text-body-base text-muted-steel mt-1">{t('products.subtitle')}</p>
      </div>

      <div className="animate-fade-in-up stagger-1 mb-2 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-1">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel pointer-events-none" size={18} />
            <input
              type="text"
              placeholder={t('products.searchProducts')}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </div>
          <Menu shadow="md" width={150} position="bottom-start" radius="md">
            <Menu.Target>
              <button className="flex items-center gap-2 px-4 py-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm text-charcoal-ink hover:bg-surface-container-low transition-colors cursor-pointer whitespace-nowrap">
                {statusFilter === 'All' ? t('common.status') : statusFilter === 'In Stock' ? t('products.inStock') : t('products.outOfStock')} <ChevronDown size={16} className="text-muted-steel" />
              </button>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Item onClick={() => setStatusFilter('All')}>{t('common.all')}</Menu.Item>
              <Menu.Item onClick={() => setStatusFilter('In Stock')}>{t('products.inStock')}</Menu.Item>
              <Menu.Item onClick={() => setStatusFilter('Out of Stock')}>{t('products.outOfStock')}</Menu.Item>
            </Menu.Dropdown>
          </Menu>
          <button 
            onClick={() => table.setShowColumnFilters(!table.getState().showColumnFilters)}
            className={`flex items-center justify-center w-10 h-10 border rounded-xl transition-colors cursor-pointer ${table.getState().showColumnFilters ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-surface-container-lowest border-outline-variant/60 text-muted-steel hover:text-charcoal-ink hover:bg-surface-container-low'}`}
          >
            <Filter size={18} />
          </button>
        </div>
        
        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm cursor-pointer btn-tactile"
        >
          <Plus size={18} /> {t('products.addProduct')}
        </button>
      </div>

      <div className="animate-fade-in-up stagger-2">
        <MantineReactTable table={table} />
      </div>

      <AddProductModal isOpen={showModal} onClose={() => setShowModal(false)} onCreated={fetchProducts} />
      <EditProductModal isOpen={!!productToEdit} product={productToEdit} onClose={() => setProductToEdit(null)} onUpdated={fetchProducts} />
      
      {productToDelete && (
        <div className="fixed inset-0 z-[70] bg-charcoal-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-error-container/30 text-error flex items-center justify-center mb-4">
                <IconTrash size={24} />
              </div>
              <h3 className="text-h3 text-charcoal-ink mb-2">{t('products.deleteProduct')}</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6" dir="auto">
                {t('products.confirmDeleteMessage', { name: productToDelete.name })}
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setProductToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleDeleteProduct}
                  disabled={deletingProduct}
                  className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {deletingProduct ? <Loader2 size={16} className="animate-spin" /> : t('products.confirmDelete')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
