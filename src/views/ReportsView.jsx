import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp, TrendingDown, DollarSign, Activity } from 'lucide-react';
import { getNetProfitReport } from '../services/expenseService';

function KPICard({ title, value, icon: Icon, trend, trendValue, accent = false, className = '' }) {
  const isPositive = trend >= 0;
  return (
    <div className={`bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 flex flex-col justify-between min-h-[140px] shadow-sm ${className}`}>
      <div className="flex justify-between items-start">
        <span className="text-label-sm text-muted-steel uppercase tracking-wider">{title}</span>
        <div className={`p-2 rounded-xl ${accent ? 'bg-accent text-on-primary' : 'bg-surface-container-high text-on-surface-variant'}`}>
          <Icon size={18} strokeWidth={1.8} />
        </div>
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <div className="text-h2 text-charcoal-ink font-mono-tabular tracking-tight">{value}</div>
          {trendValue && (
            <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-accent' : 'text-error'}`}>
              <span className="text-label-sm">{trendValue}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const ReportsView = () => {
  const { t } = useTranslation();
  const [report, setReport] = useState({ gross_profit: 0, total_expenses: 0, net_profit: 0 });
  const [loading, setLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await getNetProfitReport(dateFrom, dateTo);
      setReport(data);
    } catch (error) {
      console.error('Failed to fetch net profit report', error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []);

  const handleApplyFilters = () => {
    fetchReport();
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-h1 text-charcoal-ink">{t('nav.reports', 'Reports')}</h2>
          <p className="text-body-base text-muted-steel mt-1 max-w-lg">
            {t('expenses.net_profit_subtitle', 'Financial overview and net profit calculations.')}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={dateFrom} 
            onChange={(e) => setDateFrom(e.target.value)} 
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-1.5 text-label-md text-charcoal-ink" 
          />
          <span className="text-muted-steel">-</span>
          <input 
            type="date" 
            value={dateTo} 
            onChange={(e) => setDateTo(e.target.value)} 
            className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl px-3 py-1.5 text-label-md text-charcoal-ink" 
          />
          <button onClick={() => { setDateFrom(''); setDateTo(''); setTimeout(fetchReport, 0); }} className="px-3 py-1.5 text-label-md text-error hover:bg-error/10 rounded-xl cursor-pointer">
            {t('dashboard.clear', 'Clear')}
          </button>
          <button onClick={handleApplyFilters} className="px-3 py-1.5 bg-accent/10 text-accent hover:bg-accent/20 rounded-xl text-label-md cursor-pointer">
            {t('dashboard.apply', 'Apply')}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 animate-fade-in-up">
        {loading ? (
          <>
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 h-36 animate-shimmer" />
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 h-36 animate-shimmer" />
            <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 h-36 animate-shimmer" />
          </>
        ) : (
          <>
            <KPICard
              title={t('expenses.gross_profit', 'Gross Profit')}
              value={Number(report.gross_profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              icon={TrendingUp}
              trend={1}
            />
            <KPICard
              title={t('expenses.total_expenses', 'Total Expenses')}
              value={Number(report.total_expenses).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              icon={TrendingDown}
              trend={-1}
              className="border-warning/40"
            />
            <KPICard
              title={t('expenses.net_profit', 'Net Profit')}
              value={Number(report.net_profit).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              icon={Activity}
              trend={report.net_profit >= 0 ? 1 : -1}
              accent
              className={report.net_profit < 0 ? 'bg-error/10 border-error/50' : 'bg-accent/10 border-accent/50'}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
