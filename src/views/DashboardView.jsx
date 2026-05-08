import { useState, useEffect } from 'react';
import {
  TrendingUp, Wallet, AlertTriangle, CreditCard,
  Download, Filter, Package, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
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
      <div className="mt-auto">
        <div className="text-h2 text-charcoal-ink font-mono-tabular tracking-tight">{value}</div>
        {trendValue && (
          <div className={`flex items-center gap-1 mt-1 ${isPositive ? 'text-accent' : 'text-error'}`}>
            {isPositive ? <ArrowUpRight size={14} strokeWidth={2.2} /> : <ArrowDownRight size={14} strokeWidth={2.2} />}
            <span className="text-label-sm">{trendValue}</span>
          </div>
        )}
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
        setError('Failed to load dashboard data. Please try again.');
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2"><SkeletonCard /></div>
          <SkeletonCard />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonCard />
          <SkeletonCard />
        </div>
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/60 p-6 h-80 animate-shimmer" />
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4 animate-fade-in-up">
        <div>
          <h2 className="text-h1 text-charcoal-ink">Reports & Analytics</h2>
          <p className="text-body-base text-muted-steel mt-1 max-w-lg">
            Real-time inventory insights and operational metrics.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 px-4 py-2 bg-surface-container-lowest text-on-surface border border-outline-variant/60 rounded-xl text-label-md hover:bg-surface-container-low transition-all duration-200 shadow-whisper cursor-pointer btn-tactile">
            <Download size={16} />
            Export
          </button>
          <button className="flex items-center gap-1.5 px-4 py-2 bg-accent text-on-primary rounded-xl text-label-md hover:bg-accent-hover transition-all duration-200 shadow-sm cursor-pointer btn-tactile">
            <Filter size={16} />
            Filters
          </button>
        </div>
      </div>

      {/* KPI Grid — Asymmetric: span-2 + span-1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 animate-fade-in-up stagger-1">
        <KPICard
          title="Total Stock Value"
          value={`EGP ${Number(analyticsData?.stock_valuation || 0).toLocaleString()}`}
          icon={Wallet} trend={1} trendValue="+4.2% vs last month" accent
          className="md:col-span-2"
        />
        <KPICard
          title="Outstanding Balances"
          value={`EGP ${Number(analyticsData?.outstanding_balances || 0).toLocaleString()}`}
          icon={CreditCard} trend={-1} trendValue="Requires attention"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-fade-in-up stagger-2">
        <KPICard
          title="Total Profit"
          value={`EGP ${Number(analyticsData?.total_profit || 0).toLocaleString()}`}
          icon={TrendingUp} trend={1} trendValue="Stable vs last month" accent
        />
        <KPICard
          title="Active Products"
          value={Number(analyticsData?.total_products || 0).toLocaleString()}
          icon={Package} trend={1} trendValue="Across all batches"
        />
      </div>

      {/* Charts — Asymmetric 8/4 split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8 animate-fade-in-up stagger-3">
        {/* Trend Chart */}
        <div className="lg:col-span-8 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl flex flex-col shadow-whisper">
          <div className="p-6 border-b border-outline-variant/40 flex justify-between items-center">
            <div>
              <h3 className="text-h3 text-charcoal-ink">Sales vs Purchases</h3>
              <p className="text-body-sm text-muted-steel mt-1">Monthly tracking over the year</p>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-accent" />
                <span className="text-label-sm text-muted-steel">Sales</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary-container" />
                <span className="text-label-sm text-muted-steel">Purchases</span>
              </div>
            </div>
          </div>
          <div className="p-6 flex-1 relative min-h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analyticsData?.monthly_sales || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4F46E5" stopOpacity={0.15} />
                    <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="purchaseGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a44100" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#a44100" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.35} vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: 'var(--color-muted-steel)', fontFamily: 'Satoshi' }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--color-muted-steel)', fontFamily: 'JetBrains Mono' }} axisLine={false} tickLine={false} dx={-10} tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : val} />
                <Tooltip content={<CustomTooltip />} />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="#4F46E5" strokeWidth={2.5} fill="url(#salesGrad)" dot={{ r: 3, fill: '#fff', stroke: '#4F46E5', strokeWidth: 2 }} activeDot={{ r: 5, fill: '#4F46E5', stroke: '#fff', strokeWidth: 2 }} />
                <Area type="monotone" dataKey="purchases" name="Purchases" stroke="#a44100" strokeWidth={1.5} fill="url(#purchaseGrad)" dot={false} activeDot={{ r: 4, fill: '#a44100', stroke: '#fff', strokeWidth: 2 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity */}
        <div className="lg:col-span-4 bg-surface-container-lowest border border-outline-variant/60 rounded-2xl flex flex-col shadow-whisper">
          <div className="p-6 border-b border-outline-variant/40">
            <h3 className="text-h3 text-charcoal-ink">Recent Activity</h3>
            <p className="text-body-sm text-muted-steel mt-1">Latest transactions & profit</p>
          </div>
          <div className="p-3 flex-1 flex flex-col gap-0 overflow-y-auto max-h-[340px]">
            {(profitData?.items || []).slice(0, 8).map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-surface-container-low transition-colors duration-200 animate-fade-in-up"
                style={{ animationDelay: `${idx * 50}ms` }}
              >
                <div>
                  <p className="text-label-md text-charcoal-ink">
                    Invoice <span className="font-mono-tabular text-muted-steel">#{item.invoice_id}</span>
                  </p>
                  <p className="text-body-sm text-muted-steel">
                    Batch <span className="font-mono-tabular">#{item.batch_id}</span>
                  </p>
                </div>
                <span className={`font-mono-tabular text-label-md ${parseFloat(item.profit) >= 0 ? 'text-accent' : 'text-error'}`}>
                  {parseFloat(item.profit) >= 0 ? '+' : ''}{Number(item.profit).toLocaleString()}
                </span>
              </div>
            ))}
            {(!profitData?.items || profitData.items.length === 0) && (
              <div className="flex flex-col items-center justify-center py-10 text-muted-steel flex-1">
                <Package size={36} strokeWidth={1.2} className="mb-3 opacity-30" />
                <p className="text-body-sm">No transactions recorded yet</p>
                <p className="text-body-sm text-muted-steel/60 mt-1">Create your first invoice to see activity</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
