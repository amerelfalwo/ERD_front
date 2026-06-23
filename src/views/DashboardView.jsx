import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, Wallet, AlertTriangle, CreditCard,
  Download, Filter, Package, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import api from '../services/api';
import { SkeletonCard } from '../components/Skeleton';

/* ── KPI Card ── */
function KPICard({ title, value, icon: Icon, trend, trendValue, accent = false, className = '' }) {
  const isPositive = trend >= 0;
  return (
    <div className={`bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 flex flex-col justify-between min-h-[140px] card-lift shadow-whisper ${className}`}>
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
              {isPositive ? <ArrowUpRight size={14} strokeWidth={2.2} /> : <ArrowDownRight size={14} strokeWidth={2.2} />}
              <span className="text-label-sm">{trendValue}</span>
            </div>
          )}
        </div>
        <svg width="60" height="24" viewBox="0 0 60 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="opacity-80">
          <path d="M2 20 C 15 15, 25 22, 40 10 C 50 2, 55 8, 58 4" stroke={isPositive ? "url(#spark-positive)" : "url(#spark-negative)"} strokeWidth="2.5" fill="none" strokeLinecap="round" />
          <defs>
            <linearGradient id="spark-positive" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="1" />
            </linearGradient>
            <linearGradient id="spark-negative" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#EF4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#EF4444" stopOpacity="1" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );
}

/* ── Chart Tooltip ── */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-charcoal-ink text-white px-4 py-2.5 rounded-xl shadow-whisper-lg text-body-sm border border-white/5">
      <p className="font-medium mb-1 text-accent-muted">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="opacity-70">{entry.name}:</span>
          <span className="font-mono-tabular font-medium">{Number(entry.value).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardView() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profitData, setProfitData] = useState(null);
  const [analyticsData, setAnalyticsData] = useState(null);

  useEffect(() => {
    async function fetchData() {
      await Promise.resolve();
      try {
        setError(null);
        const [profit, analytics] = await Promise.all([
          api.getProfitReport(),
          api.getDashboardAnalytics(),
        ]);
        setProfitData(profit);
        setAnalyticsData(analytics);
      } catch (err) {
        setError(t('dashboard.error'));
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-error animate-fade-in-up">
        <AlertTriangle size={40} strokeWidth={1.2} className="mb-4 opacity-60" />
        <p className="text-body-base">{error}</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          <div className="lg:col-span-3 bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 h-96 animate-shimmer" />
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 h-96 animate-shimmer" />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-h1 text-charcoal-ink">{t('dashboard.title')}</h2>
          <p className="text-body-base text-muted-steel mt-1 max-w-lg">
            {t('dashboard.subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/60 rounded-xl text-label-md hover:bg-surface-container-low transition-all duration-200 shadow-whisper cursor-pointer btn-tactile">
            <Download size={16} />
            {t('dashboard.export')}
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-accent text-on-primary rounded-xl text-label-md hover:bg-accent-hover transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
            <Filter size={16} />
            {t('dashboard.filters')}
          </button>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8 animate-fade-in-up stagger-1">
        <KPICard
          title={t('dashboard.totalProfits')}
          value={`$${Number(analyticsData?.total_profit || 0).toLocaleString()}`}
          icon={TrendingUp} trend={1} trendValue="+12%" accent
        />
        <KPICard
          title={t('dashboard.customerReceivables')}
          value={`$${Number(analyticsData?.customer_receivables || 0).toLocaleString()}`}
          icon={CreditCard} trend={1} trendValue="+4%"
        />
        <KPICard
          title={t('dashboard.supplierPayables')}
          value={`$${Number(analyticsData?.supplier_payables || 0).toLocaleString()}`}
          icon={Wallet} trend={-1} trendValue="-2%"
        />
        <KPICard
          title={t('dashboard.totalInventoryValue')}
          value={`$${Number(analyticsData?.stock_valuation || 0).toLocaleString()}`}
          icon={Package} trend={1} trendValue="+8%" accent
        />
      </div>

      {/* Charts & Tables — Side by Side on Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8 animate-fade-in-up stagger-3">
        {/* Financial Performance Chart (60%) */}
        <div className="lg:col-span-3 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl flex flex-col shadow-whisper">
          <div className="p-6 border-b border-outline-variant/40 flex justify-between items-center">
            <div>
              <h3 className="text-h3 text-charcoal-ink">{t('dashboard.financialPerformance')}</h3>
              <p className="text-body-sm text-muted-steel mt-1">{t('dashboard.salesPurchasesProfits')}</p>
            </div>
          </div>
          <div className="p-6 min-h-[360px] flex-1">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={(analyticsData?.monthly_sales || []).map(m => ({ ...m, profit: Number(m.sales) - Number(m.purchases) }))} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.35} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-muted-steel)', fontFamily: 'Satoshi' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-steel)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', fontFamily: 'Satoshi', color: 'var(--color-muted-steel)' }} />
                <Bar dataKey="sales" name={t('dashboard.sales')} fill="#4F46E5" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Bar dataKey="purchases" name={t('dashboard.purchases')} fill="#93C5FD" radius={[4, 4, 0, 0]} maxBarSize={40} />
                <Line type="monotone" dataKey="profit" name={t('dashboard.profits')} stroke="#4F46E5" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3, fill: '#fff', stroke: '#4F46E5', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Transactions List (40%) */}
        <div className="lg:col-span-2 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl flex flex-col shadow-whisper overflow-hidden">
          <div className="p-6 border-b border-outline-variant/40">
            <h3 className="text-h3 text-charcoal-ink">{t('dashboard.recentTransactions')}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {(analyticsData?.recent_transactions || []).map((item, idx) => {
              const amount = Number(item.value);
              const isPositive = !item.description.toLowerCase().includes('purchase') && !item.description.toLowerCase().includes('expense');
              
              return (
                <div key={idx} className="flex items-center justify-between p-4 border-b border-outline-variant/20 last:border-0 hover:bg-surface-container-low/50 transition-colors rounded-xl mx-2 my-1">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${isPositive ? 'bg-accent/10 text-accent' : 'bg-warning/10 text-warning'}`}>
                      {isPositive ? <ArrowUpRight size={18} /> : <ArrowDownRight size={18} />}
                    </div>
                    <div>
                      <p className="text-body-sm font-medium text-charcoal-ink">{item.description}</p>
                      <p className="text-label-sm text-muted-steel mt-0.5">{item.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-body-sm font-mono-tabular font-medium ${isPositive ? 'text-charcoal-ink' : 'text-charcoal-ink'}`}>
                      {isPositive ? '+' : '-'}${Math.abs(amount).toLocaleString()}
                    </p>
                    <p className="text-label-sm mt-0.5 flex items-center justify-end gap-1">
                      {item.status === 'Pending' ? (
                        <span className="text-warning flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-warning"></span> {t('dashboard.pending')}</span>
                      ) : (
                        <span className="text-accent flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-accent"></span> {t('dashboard.completed')}</span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
            {(!analyticsData?.recent_transactions || analyticsData.recent_transactions.length === 0) && (
              <div className="p-8 text-center text-muted-steel">
                <Package size={36} strokeWidth={1.2} className="mx-auto mb-3 opacity-30" />
                <p className="text-body-sm">{t('dashboard.noTransactions')}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

