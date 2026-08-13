import { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Loader2, Plus, Search, Pencil, Trash2, Phone, ArrowRight } from 'lucide-react';
import { ActionIcon, Flex, Tooltip, SimpleGrid, Card, Pagination, Select } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

/* ─── Add / Edit Modal ─── */
function CustomerModal({ isOpen, onClose, customer, onSaved }) {
  const { t } = useTranslation();
  const isEdit = !!customer;
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [initialBalance, setInitialBalance] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (customer) {
      setName(customer.name || '');
      setPhone(customer.phone || '');
      setInitialBalance(customer.initial_balance != null ? String(customer.initial_balance) : '');
    } else {
      setName(''); setPhone(''); setInitialBalance('');
    }
  }, [customer]);

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    const payload = {
      name: name.trim(),
      phone: phone.trim() || null,
      initial_balance: initialBalance ? parseFloat(initialBalance) : 0,
    };
    try {
      if (isEdit) {
        await api.updateCustomer(customer.id, payload);
        notifications.show({ title: t('common.success'), message: t('customers.customerUpdated'), color: 'green' });
      } else {
        await api.createCustomer(payload);
        notifications.show({ title: t('common.success'), message: t('customers.customerCreated'), color: 'green' });
      }
      onSaved();
      onClose();
    } catch (err) {
      notifications.show({
        title: t('common.error'),
        message: err?.response?.data?.detail || err?.message || t('customers.errorSaving'),
        color: 'red'
      });
    }
    finally { setSubmitting(false); }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-ink/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-whisper-lg w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <h3 className="text-h3 text-charcoal-ink tracking-tight">{isEdit ? t('customers.editCustomer') : t('customers.addNewCustomer')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('customers.customerName')}</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('customers.enterCustomerName')} autoFocus
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('customers.phone')}</label>
            <input type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('customers.phonePlaceholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">{t('customers.initialBalance')}</label>
            <input type="number" step="any" value={initialBalance} onChange={e => setInitialBalance(e.target.value)} placeholder="0.00"
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">{t('common.cancel')}</button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              {isEdit ? t('customers.saveChanges') : t('customers.createCustomer')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}



/* ─── Detail Panel (Financial Breakdown) ─── */
function CustomerDetailPanel({ customer }) {
  const { t } = useTranslation();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.getCustomerSummary(customer.id)
      .then(data => { if (!cancelled) setSummary(data); })
      .catch(err => console.error('Summary fetch error:', err))
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [customer.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={18} className="animate-spin text-muted-steel" />
        <span className="ml-2 text-xs text-muted-steel">{t('customers.loadingFinancials')}</span>
      </div>
    );
  }

  if (!summary) {
    return <p className="py-4 text-center text-xs text-muted-steel">{t('customers.couldNotLoad')}</p>;
  }

  const f = summary.financials;
  const cards = [
    { label: t('customers.initial'), value: f.initial_balance, color: 'text-slate-600' },
    { label: t('customers.sales'), value: f.total_purchases, color: 'text-blue-600' },
    { label: t('customers.returns'), value: f.total_returns, color: 'text-amber-600' },
    { label: t('customers.paid'), value: f.total_paid, color: 'text-emerald-600' },
    { label: t('customers.profit'), value: f.total_profit, color: 'text-indigo-600' },
    { label: t('customers.balance'), value: f.balance, color: f.balance > 0 ? 'text-rose-600' : 'text-emerald-600' },
  ];

  return (
    <div className="p-4 bg-surface-container-low/40 border-t border-outline-variant/30">
      <h4 className="text-[11px] text-muted-steel uppercase tracking-wider mb-3">{t('customers.financialBreakdown')}</h4>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {cards.map(c => (
          <div key={c.label} className="bg-surface-container-lowest rounded-lg border border-outline-variant/30 p-2">
            <p className="text-[10px] text-muted-steel uppercase tracking-wider mb-0.5">{c.label}</p>
            <p className={`text-sm font-semibold ${c.color}`}>{Number(c.value).toLocaleString()}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Customer Card ─── */
const CustomerCard = memo(function CustomerCard({ customer, onEdit, onDelete }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  return (
    <Card 
      shadow="xs" 
      radius="lg" 
      padding={0} 
      className="border border-outline-variant/30 overflow-hidden flex flex-col hover:shadow-md transition-shadow bg-surface-container-lowest cursor-pointer"
      onClick={() => navigate(`/customers/${customer.id}`)}
    >
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-1 gap-2">
          <h3 className="text-lg font-medium text-charcoal-ink truncate">{customer.name}</h3>
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap ${customer.calculated_balance > 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'}`}>
            {Number(customer.calculated_balance || 0).toLocaleString()} {t('common.currency')}
          </span>
        </div>

        <div className="flex items-center gap-2 text-muted-steel mb-3 mt-2">
          <Phone size={14} />
          <span className="text-sm">{customer.phone || 'N/A'}</span>
        </div>

        <div className="flex items-center gap-2 mb-4">
           {customer.total_profit != null && (
            <span className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-xs font-medium border border-indigo-100">
              {t('customers.profit') || 'الربح'}: {Number(customer.total_profit).toLocaleString()} {t('common.currency')}
            </span>
          )}
          {customer.payment_status && (
            <span className={`px-2 py-1 rounded text-xs font-medium border ${customer.payment_status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-amber-50 text-amber-600 border-amber-100'}`}>
              {customer.payment_status === 'paid' ? 'خالص' : 'عليه مبلغ'}
            </span>
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/30">
          <Flex gap="sm">
            <Tooltip label={t('common.edit')}>
              <ActionIcon variant="subtle" color="violet" onClick={(e) => { e.stopPropagation(); onEdit(customer); }} radius="md">
                <Pencil size={18} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label={t('common.delete')}>
              <ActionIcon variant="subtle" color="red" onClick={(e) => { e.stopPropagation(); onDelete(customer); }} radius="md">
                <Trash2 size={18} />
              </ActionIcon>
            </Tooltip>
          </Flex>

          <button 
            onClick={(e) => { e.stopPropagation(); navigate(`/customers/${customer.id}`); }}
            className="flex items-center gap-1.5 text-sm font-medium text-accent hover:text-accent-hover transition-colors bg-transparent border-none cursor-pointer"
          >
            {t('customers.viewProfile')}
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </Card>
  );
});

/* ─── Main View ─── */
export default function CustomersView() {
  const { t } = useTranslation();
  const LIMIT = 24;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('a-z'); 

  const [showModal, setShowModal] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState(null);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [deletingCustomer, setDeletingCustomer] = useState(false);

  const handleEditCustomer = useCallback((customer) => {
    setCustomerToEdit(customer);
  }, []);

  const handleDeleteCustomerSelect = useCallback((customer) => {
    setCustomerToDelete(customer);
  }, []);

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const skip = (page - 1) * LIMIT;
      const data = await api.getCustomers(skip, LIMIT);
      const list = Array.isArray(data) ? data : (data?.data || data?.items || []);
      setCustomers(list);
      setHasMore(list.length === LIMIT);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  async function handleDelete() {
    if (!customerToDelete) return;
    setDeletingCustomer(true);
    try {
      await api.deleteCustomer(customerToDelete.id);
      notifications.show({ title: t('common.success'), message: t('customers.customerDeleted'), color: 'green' });
      setCustomerToDelete(null);
      fetchCustomers();
    } catch (err) {
      notifications.show({
        title: t('common.error'),
        message: err?.response?.data?.detail || err?.message || t('customers.errorDeleting'),
        color: 'red'
      });
    }
    finally { setDeletingCustomer(false); }
  }

  const processedCustomers = useMemo(() => {
    let result = [...customers];
    if (search) {
      const lower = search.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(lower) || (c.phone && c.phone.includes(lower)));
    }
    if (sort === 'a-z') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'z-a') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else if (sort === 'balance-high') {
      result.sort((a, b) => (b.calculated_balance || 0) - (a.calculated_balance || 0));
    } else if (sort === 'balance-low') {
      result.sort((a, b) => (a.calculated_balance || 0) - (b.calculated_balance || 0));
    }
    return result;
  }, [customers, search, sort]);

  const { totalCustomers, totalReceivables, overdueAccounts } = useMemo(() => {
    return {
      totalCustomers: customers.length,
      totalReceivables: customers.reduce((sum, c) => sum + (Number(c.calculated_balance) > 0 ? Number(c.calculated_balance) : 0), 0),
      overdueAccounts: customers.filter(c => Number(c.calculated_balance || 0) > 0).length
    };
  }, [customers]);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in-up">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <h2 className="text-h1 text-charcoal-ink whitespace-nowrap">{t('customers.title')}</h2>
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel pointer-events-none" size={18} />
            <input
              type="text"
              placeholder={t('common.search')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Select
            data={[
              { value: 'a-z', label: t('customers.sortAZ') },
              { value: 'z-a', label: t('customers.sortZA') },
              { value: 'balance-high', label: t('customers.sortBalanceHigh') },
              { value: 'balance-low', label: t('customers.sortBalanceLow') },
            ]}
            value={sort}
            onChange={setSort}
            className="flex-1 sm:w-56"
            radius="md"
            styles={{ input: { height: '40px', borderRadius: '0.75rem', borderColor: 'rgba(0,0,0,0.1)' } }}
          />
          <button
            onClick={() => { setCustomerToEdit(null); setShowModal(true); }}
            className="flex items-center gap-2 px-5 py-2 bg-accent text-white rounded-xl text-sm font-medium hover:bg-accent-hover transition-colors shadow-sm cursor-pointer btn-tactile h-[40px] whitespace-nowrap"
          >
            <Plus size={18} /> {t('customers.addCustomer')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-fade-in-up stagger-1">
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col">
          <p className="text-label-sm text-muted-steel uppercase tracking-wider mb-1">{t('customers.totalCustomers')}</p>
          <p className="text-3xl font-semibold text-charcoal-ink">{totalCustomers}</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col">
          <p className="text-label-sm text-muted-steel uppercase tracking-wider mb-1">{t('customers.totalReceivables')}</p>
          <p className="text-3xl font-semibold text-charcoal-ink">{totalReceivables.toLocaleString()} {t('common.currency')}</p>
        </div>
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/50 shadow-sm flex flex-col">
          <p className="text-label-sm text-muted-steel uppercase tracking-wider mb-1">{t('customers.accountsWithBalance')}</p>
          <p className="text-3xl font-semibold text-charcoal-ink">{overdueAccounts}</p>
        </div>
      </div>

      <div className="animate-fade-in-up stagger-3 mt-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 size={32} className="animate-spin text-accent" />
          </div>
        ) : processedCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-steel bg-surface-container-lowest rounded-3xl border border-outline-variant/40 border-dashed">
            <p className="text-body-base text-charcoal-ink">{t('customers.noCustomers')}</p>
            <p className="text-body-sm text-muted-steel mt-1">{t('customers.noCustomersHint')}</p>
          </div>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
            {processedCustomers.map(customer => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onEdit={handleEditCustomer}
                onDelete={handleDeleteCustomerSelect}
              />
            ))}
          </SimpleGrid>
        )}
      </div>

      {(!loading && (page > 1 || hasMore)) && (
        <div className="flex justify-center mt-8 animate-fade-in-up stagger-4">
          <Pagination 
            total={hasMore ? page + 1 : page} 
            value={page} 
            onChange={setPage} 
            color="indigo"
            radius="md"
          />
        </div>
      )}

      {/* Add / Edit modal */}
      <CustomerModal
        isOpen={showModal || !!customerToEdit}
        customer={customerToEdit}
        onClose={() => { setShowModal(false); setCustomerToEdit(null); }}
        onSaved={fetchCustomers}
      />


      {/* Delete confirmation */}
      {customerToDelete && (
        <div className="fixed inset-0 z-[70] bg-charcoal-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-error-container/30 text-error flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-h3 text-charcoal-ink mb-2">{t('customers.deleteCustomer')}</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6" dir="auto"
                dangerouslySetInnerHTML={{ __html: t('customers.confirmDeleteMessage', { name: customerToDelete.name }) }}
              />
              <div className="flex items-center gap-3 justify-end">
                <button onClick={() => setCustomerToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile">
                  {t('common.cancel')}
                </button>
                <button onClick={handleDelete} disabled={deletingCustomer}
                className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50">
                {deletingCustomer ? <Loader2 size={16} className="animate-spin" /> : t('customers.confirmDelete')}
                </button>
            </div>
            </div>
        </div>
        </div>
    )}
    </div>
);
}
