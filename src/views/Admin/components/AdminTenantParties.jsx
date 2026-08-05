import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Search, Edit, Trash2, TrendingUp, TrendingDown 
} from 'lucide-react';
import api from '../../../services/api';

export default function AdminTenantParties({ tenantId }) {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchParties();
  }, [tenantId]);

  const fetchParties = async () => {
    setLoading(true);
    try {
      const data = await api.getAdminParties(tenantId);
      setParties(data);
    } catch (err) {
      setError(err.message || 'Failed to load parties');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (party) => {
    const newName = window.prompt(t('common.edit') + ' Name:', party.name);
    if (!newName) return;
    try {
      await api.updateAdminParty(tenantId, party.id, { name: newName });
      setParties(parties.map(p => p.id === party.id ? { ...p, name: newName } : p));
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredParties = parties.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <div className="p-8 flex justify-center"><div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="bg-surface-container rounded-3xl p-6 border border-outline-variant/30 shadow-whisper">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
            <Users size={20} />
          </div>
          <h3 className="text-h4 font-bold">{t('nav.parties', 'Parties')}</h3>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'right-3' : 'left-3'} text-muted-steel`} size={18} />
            <input
              type="text"
              placeholder={t('common.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full sm:w-64 bg-surface-container-lowest border border-outline-variant rounded-xl py-2 ${isRTL ? 'pr-10 pl-4' : 'pl-10 pr-4'} text-body-sm focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent transition-all`}
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-body-sm">
          {error}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/40">
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Name</th>
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Type</th>
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Balance</th>
              <th className={`py-3 px-4 text-label-sm font-semibold text-muted-steel ${isRTL ? 'text-right' : 'text-left'}`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredParties.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-muted-steel text-body-sm">
                  {t('common.noData')}
                </td>
              </tr>
            ) : (
              filteredParties.map((party) => {
                const balance = parseFloat(party.balance || 0);
                return (
                  <tr key={party.id} className="border-b border-outline-variant/20 hover:bg-surface-container-highest/50 transition-colors">
                    <td className="py-3 px-4 text-body-sm font-medium">{party.name}</td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                        party.party_type === 'customer'
                          ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                          : 'bg-rose-50 text-rose-600 border border-rose-100'
                      }`}>
                        {party.party_type === 'customer' ? t('parties.customer') : t('parties.supplier')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-body-sm font-semibold">
                      <span className={`flex items-center gap-1 ${
                        balance > 0 ? 'text-emerald-600' : balance < 0 ? 'text-rose-600' : 'text-muted-steel'
                      }`}>
                        {balance > 0 ? <TrendingUp size={14} /> : balance < 0 ? <TrendingDown size={14} /> : null}
                        {Math.abs(balance).toLocaleString()} EGP
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(party)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
