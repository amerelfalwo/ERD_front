import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Users, X, Loader2, Eye, DollarSign, User, Building2, BarChart2, Phone, MapPin, Trash2, TrendingUp } from 'lucide-react';
import api from '../services/api';

function AddPartyModal({ isOpen, onClose, onCreated }) {
  const [name, setName] = useState('');
  const [partyType, setPartyType] = useState('client');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api.createParty({ name: name.trim(), party_type: partyType, phone: phone.trim() || null, address: address.trim() || null });
      setName('');
      setPartyType('client');
      setPhone('');
      setAddress('');
      onCreated();
      onClose();
    } catch (err) {
      alert(err?.message || 'Error creating party');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-ink/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-whisper-lg w-full max-w-md animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40">
          <h3 className="text-h3 text-charcoal-ink tracking-tight">Add New Party</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Party Name</label>
            <input
              type="text" value={name} onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
              placeholder="Enter name" autoFocus
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Type</label>
            <div className="flex gap-2">
              {['client', 'supplier'].map((t) => (
                <button key={t} type="button" onClick={() => setPartyType(t)}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-label-md border transition-all duration-200 cursor-pointer btn-tactile capitalize
                    ${partyType === t
                      ? (t === 'client' ? 'border-accent bg-accent text-on-primary shadow-sm' : 'border-tertiary-container bg-tertiary-container text-on-tertiary-container shadow-sm')
                      : 'border-outline-variant/60 bg-surface-container-lowest text-muted-steel hover:border-outline'
                    }`}
                >
                  {t === 'client' ? <User size={16} /> : <Building2 size={16} />}
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Phone Number</label>
            <div className="relative">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel" />
              <input
                type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
                placeholder="e.g. 01xxxxxxxxx"
              />
            </div>
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1.5 uppercase tracking-wider">Address</label>
            <div className="relative">
              <MapPin size={15} className="absolute left-3 top-3 text-muted-steel" />
              <textarea
                value={address} onChange={(e) => setAddress(e.target.value)} rows={2}
                className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200 resize-none"
                placeholder="Street, City"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-4">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">Cancel</button>
            <button type="submit" disabled={submitting || !name.trim()}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
              {submitting && <Loader2 size={16} className="animate-spin" />}
              Create Party
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function StatementModal({ isOpen, onClose, partyId, partyName }) {
  const [statement, setStatement] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen || !partyId) return;
    setLoading(true);
    api.getStatement(partyId)
      .then(setStatement)
      .catch(() => setStatement(null))
      .finally(() => setLoading(false));
  }, [isOpen, partyId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-charcoal-ink/15 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface-container-lowest rounded-2xl border border-outline-variant/60 shadow-whisper-lg w-full max-w-xl animate-scale-in max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-outline-variant/40 shrink-0">
          <div>
            <h3 className="text-h3 text-charcoal-ink tracking-tight">Account Statement</h3>
            <p className="text-body-sm text-muted-steel mt-1" dir="auto">{partyName}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-xl text-muted-steel hover:bg-surface-container-low transition-colors cursor-pointer btn-tactile">
            <X size={18} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-10 rounded-lg animate-shimmer" />)}
            </div>
          ) : statement?.transactions?.length > 0 ? (
            <div className="space-y-2">
              <div className="grid grid-cols-4 gap-2 text-label-sm uppercase tracking-wider text-muted-steel pb-2 border-b border-outline-variant/40">
                <span className="col-span-2">Date / Reference</span>
                <span className="text-right">Amount</span>
                <span className="text-right">Balance</span>
              </div>
              {statement.transactions.map((item, idx) => (
                <div key={idx} className="grid grid-cols-4 gap-2 text-body-sm py-2.5 border-b border-outline-variant/20 hover:bg-surface-container-low/50 transition-colors rounded-lg px-1.5 -mx-1.5">
                  <div className="col-span-2 flex flex-col justify-center">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-tabular text-muted-steel">{item.date}</span>
                      <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md ${item.type === 'INVOICE' ? 'bg-accent-surface text-accent' : 'bg-success/20 text-success'}`}>
                        {item.type}
                      </span>
                    </div>
                    <span className="text-charcoal-ink font-medium mt-0.5 text-xs">{item.reference}</span>
                  </div>
                  <span className={`font-mono-tabular text-right flex items-center justify-end ${item.type === 'PAYMENT' ? 'text-success' : 'text-charcoal-ink'}`}>
                    {item.type === 'PAYMENT' ? '-' : ''}{Number(item.amount).toLocaleString(undefined, {minimumFractionDigits: 2})}
                  </span>
                  <span className="font-mono-tabular font-medium text-right text-charcoal-ink flex items-center justify-end">{Number(item.balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-4 mt-2 border-t border-outline-variant/40">
                <span className="text-label-md text-muted-steel">Total Balance</span>
                <span className="text-h2 font-mono-tabular text-charcoal-ink">EGP {Number(statement.total_balance).toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-muted-steel">
              <DollarSign size={36} strokeWidth={1.2} className="mb-3 opacity-30" />
              <p className="text-body-base text-charcoal-ink">No transactions found</p>
              <p className="text-body-sm text-muted-steel/60 mt-1">This party has no recorded invoices</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PartiesView() {
  const navigate = useNavigate();
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [balanceFilter, setBalanceFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name_asc');
  const [showModal, setShowModal] = useState(false);
  const [statementModal, setStatementModal] = useState({ open: false, partyId: null, partyName: '' });
  const [balances, setBalances] = useState({});
  const [profits, setProfits] = useState({});
  const [partyToDelete, setPartyToDelete] = useState(null);
  const [deletingParty, setDeletingParty] = useState(false);

  async function fetchParties() {
    await Promise.resolve();
    setLoading(true);
    try {
      const data = await api.getParties();
      setParties(data);
      const balanceMap = {};
      for (const party of data) {
        try {
          const bal = await api.getPartyBalance(party.id);
          balanceMap[party.id] = bal.balance || bal.total_balance || '0';
        } catch { balanceMap[party.id] = '0'; }
      }
      setBalances(balanceMap);

      try {
        const profitData = await api.getPartyProfits();
        const profitMap = {};
        for (const row of profitData) {
          profitMap[row.party_id] = { profit: row.total_profit, revenue: row.total_revenue, count: row.invoice_count };
        }
        setProfits(profitMap);
      } catch { /* profits are optional */ }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchParties(); }, []);

  async function handleDeleteParty() {
    if (!partyToDelete) return;
    setDeletingParty(true);
    try {
      await api.deleteParty(partyToDelete.id);
      setPartyToDelete(null);
      fetchParties();
    } catch (err) {
      alert(err?.message || 'Error');
    } finally {
      setDeletingParty(false);
    }
  }

  const filteredParties = useMemo(() => {
    return parties
      .filter((p) => {
        const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
        const matchesType = filter === 'all' || p.party_type === filter;
        if (!matchesSearch || !matchesType) return false;
        if (balanceFilter === 'has_balance') return parseFloat(balances[p.id] || 0) > 0;
        if (balanceFilter === 'zero_balance') return parseFloat(balances[p.id] || 0) === 0;
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
        if (sortBy === 'name_desc') return b.name.localeCompare(a.name);
        const balA = parseFloat(balances[a.id] || 0), balB = parseFloat(balances[b.id] || 0);
        if (sortBy === 'balance_desc') return balB - balA;
        if (sortBy === 'balance_asc') return balA - balB;
        const profA = profits[a.id]?.profit || 0, profB = profits[b.id]?.profit || 0;
        if (sortBy === 'profit_desc') return profB - profA;
        return 0;
      });
  }, [parties, search, filter, balanceFilter, sortBy, balances, profits]);

  const selectClass = "px-4 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-muted-steel focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200 appearance-none min-w-[120px] cursor-pointer";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-h1 text-charcoal-ink">Financial Parties</h2>
          <p className="text-body-base text-muted-steel mt-1">Manage clients and suppliers and track balances.</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
          <Plus size={18} strokeWidth={2.5} /> Add Party
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-in-up stagger-1">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-steel" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search parties..."
            className="w-full pl-9 pr-4 py-2 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-sm text-charcoal-ink placeholder:text-outline focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all duration-200"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex gap-1 bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-1">
            {['all', 'client', 'supplier'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-lg text-label-md capitalize transition-all duration-200 cursor-pointer btn-tactile
                  ${filter === f ? 'bg-accent text-on-primary shadow-sm' : 'text-muted-steel hover:bg-surface-container-low'}`}>
                {f === 'all' ? 'All' : f + 's'}
              </button>
            ))}
          </div>
          <select value={balanceFilter} onChange={(e) => setBalanceFilter(e.target.value)} className={selectClass}>
            <option value="all">All Balances</option>
            <option value="has_balance">Has Balance</option>
            <option value="zero_balance">Zero Balance</option>
          </select>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className={selectClass}>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="balance_desc">Highest Balance</option>
            <option value="balance_asc">Lowest Balance</option>
            <option value="profit_desc">Most Profitable</option>
          </select>
        </div>
      </div>

      {/* Cards */}
      <div className="animate-fade-in-up stagger-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 flex flex-col justify-between min-h-[150px] shadow-whisper">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl animate-shimmer" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-4 rounded w-2/3 animate-shimmer" />
                    <div className="h-3 rounded w-1/3 animate-shimmer" />
                  </div>
                </div>
                <div className="h-4 rounded w-1/2 animate-shimmer mt-auto" />
              </div>
            ))
          : filteredParties.length > 0 ? (
            filteredParties.map((party, idx) => (
              <div key={party.id}
                onClick={() => navigate(`/parties/${party.id}`)}
                className="group bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 card-lift shadow-whisper flex flex-col justify-between min-h-[150px] animate-fade-in-up cursor-pointer hover:border-accent/40 hover:shadow-md transition-all duration-200"
                style={{ animationDelay: `${idx * 40}ms` }}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${party.party_type === 'client' ? 'bg-accent-surface text-accent' : 'bg-tertiary-container/20 text-tertiary'}`}>
                      {party.party_type === 'client' ? <User size={18} strokeWidth={1.8} /> : <Building2 size={18} strokeWidth={1.8} />}
                    </div>
                <div>
                    <p className="text-label-md text-charcoal-ink" dir="auto">{party.name}</p>
                    <span className={`text-label-sm uppercase tracking-wider ${party.party_type === 'client' ? 'text-accent' : 'text-tertiary'}`}>{party.party_type}</span>
                    {party.phone && (
                      <p className="text-[11px] text-muted-steel mt-0.5 flex items-center gap-1">
                        <Phone size={10} />{party.phone}
                      </p>
                    )}
                  </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setStatementModal({ open: true, partyId: party.id, partyName: party.name }); }}
                      className="p-1.5 rounded-xl text-muted-steel hover:bg-accent-surface hover:text-accent transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer btn-tactile">
                      <Eye size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setPartyToDelete(party); }}
                      className="p-1.5 rounded-xl text-muted-steel hover:bg-error-container/30 hover:text-error transition-all duration-200 opacity-0 group-hover:opacity-100 cursor-pointer btn-tactile">
                      <Trash2 size={18} />
                    </button>
                    <div className="p-1.5 rounded-xl text-accent bg-accent-surface opacity-0 group-hover:opacity-100 transition-all duration-200">
                      <BarChart2 size={18} />
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-outline-variant/30 mt-auto">
                  <span className="text-label-sm text-muted-steel uppercase tracking-wider">Balance</span>
                  <span className="text-h3 font-mono-tabular text-charcoal-ink">EGP {Number(balances[party.id] || 0).toLocaleString()}</span>
                </div>
                {profits[party.id]?.profit > 0 && (
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-label-sm text-muted-steel uppercase tracking-wider flex items-center gap-1"><TrendingUp size={11} />Profit</span>
                    <span className="text-label-md font-mono-tabular text-emerald-600 font-semibold">EGP {Number(profits[party.id].profit).toLocaleString(undefined, {minimumFractionDigits: 0, maximumFractionDigits: 0})}</span>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-steel bg-surface-container-low/30 rounded-2xl border border-dashed border-outline-variant/60">
              <Users size={40} strokeWidth={1.2} className="mb-4 opacity-30" />
              <p className="text-body-base text-charcoal-ink">No parties found</p>
              <p className="text-body-sm text-muted-steel mt-1">Add clients or suppliers to get started</p>
            </div>
          )}
      </div>

      <AddPartyModal isOpen={showModal} onClose={() => setShowModal(false)} onCreated={fetchParties} />
      <StatementModal isOpen={statementModal.open} onClose={() => setStatementModal({ open: false, partyId: null, partyName: '' })} partyId={statementModal.partyId} partyName={statementModal.partyName} />
      {partyToDelete && (
        <div className="fixed inset-0 z-[70] bg-charcoal-ink/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
            <div className="p-6">
              <div className="w-12 h-12 rounded-xl bg-error-container/30 text-error flex items-center justify-center mb-4">
                <Trash2 size={24} />
              </div>
              <h3 className="text-h3 text-charcoal-ink mb-2">Delete Party</h3>
              <p className="text-muted-steel text-sm leading-relaxed mb-6" dir="auto">
                Are you sure you want to delete {partyToDelete.name}? This action cannot be undone.
              </p>
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={() => setPartyToDelete(null)}
                  className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteParty}
                  disabled={deletingParty}
                  className="px-5 py-2.5 rounded-xl text-label-md bg-error text-white hover:bg-error/90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50"
                >
                  {deletingParty ? <Loader2 size={16} className="animate-spin" /> : 'Confirm Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
