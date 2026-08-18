import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, ShoppingCart,
  Download, Filter, RefreshCw, AlertTriangle, FileText, Activity, Package, Users
} from 'lucide-react';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';

import { getDashboardData } from '../../services/dashboardService';
import KpiCard from './components/KpiCard';
import TopProductsTable from './components/TopProductsTable';
import LowStockAlertList from './components/LowStockAlertList';
import TopPartiesTable from './components/TopPartiesTable';

const SalesPurchasesTrendChart = React.lazy(() => import('./components/SalesPurchasesTrendChart'));
const ProfitTrendChart = React.lazy(() => import('./components/ProfitTrendChart'));

export default function DashboardPage() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  // Quick Period & Date Filters
  const [activeFilter, setActiveFilter] = useState('month'); // today | week | month | year | custom
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCustomRange, setShowCustomRange] = useState(false);

  const applyPeriodFilter = (type) => {
    setActiveFilter(type);
    const now = new Date();
    if (type === 'today') {
      const todayStr = format(now, 'yyyy-MM-dd');
      setDateFrom(todayStr);
      setDateTo(todayStr);
      setShowCustomRange(false);
    } else if (type === 'week') {
      setDateFrom(format(startOfWeek(now, { weekStartsOn: 6 }), 'yyyy-MM-dd'));
      setDateTo(format(endOfWeek(now, { weekStartsOn: 6 }), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'month') {
      setDateFrom(format(startOfMonth(now), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(now), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'year') {
      setDateFrom(format(startOfYear(now), 'yyyy-MM-dd'));
      setDateTo(format(endOfYear(now), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'custom') {
      setShowCustomRange(true);
    }
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardData(dateFrom || null, dateTo || null);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError(err.response?.data?.detail || t('dashboard.fetchError', 'فشل في تحميل بيانات لوحة التحكم'));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, t]);

  useEffect(() => {
    applyPeriodFilter('month');
  }, []);

  useEffect(() => {
    if (activeFilter !== 'custom') {
      fetchDashboard();
    }
  }, [activeFilter, fetchDashboard]);

  const exportCsv = () => {
    if (!data) return;
    let csv = `Metric,Value\n`;
    csv += `Total Sales,${data.kpis.total_sales}\n`;
    csv += `Total Purchases,${data.kpis.total_purchases}\n`;
    csv += `Total Inventory Value,${data.kpis.total_inventory_value || 0}\n`;
    csv += `Gross Profit,${data.kpis.gross_profit}\n`;
    csv += `Net Profit,${data.kpis.net_profit}\n`;
    csv += `Customer Receivables,${data.kpis.customer_receivables || 0}\n`;
    csv += `Supplier Payables,${data.kpis.supplier_payables || 0}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard-report-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  const fmtCurr = (val) => `EGP ${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  const kpis = data?.kpis || {};

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in-up">
      {/* ── Page Header ── */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-h1 text-charcoal-ink font-bold tracking-tight">{t('dashboard.title', 'لوحة التحكم القيادية')}</h1>
          <p className="text-body-sm text-muted-steel mt-1">
            {t('dashboard.subtitle', 'نظرة شاملة ومحدثة فورياً للأداء المالي، المخزون، والديون')}
          </p>
        </div>

        {/* Quick Period Filters & Export */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="bg-surface-container-low p-1 rounded-2xl border border-outline-variant/60 flex items-center gap-1">
            {[
              { id: 'today', label: 'اليوم' },
              { id: 'week', label: 'هذا الأسبوع' },
              { id: 'month', label: 'هذا الشهر' },
              { id: 'year', label: 'هذه السنة' },
              { id: 'custom', label: 'مخصص' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => applyPeriodFilter(item.id)}
                className={`px-3 py-1.5 rounded-xl text-label-sm font-medium transition-all cursor-pointer ${
                  activeFilter === item.id
                    ? 'bg-accent text-on-primary shadow-sm font-bold'
                    : 'text-muted-steel hover:text-charcoal-ink hover:bg-surface-container'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <button
            onClick={fetchDashboard}
            className="p-2.5 rounded-xl border border-outline-variant/60 bg-surface-container-lowest text-muted-steel hover:text-charcoal-ink hover:bg-surface-container-low transition-all cursor-pointer"
            title="تحديث البيانات"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant/60 rounded-xl text-label-md text-charcoal-ink font-medium hover:bg-surface-container-low transition-all cursor-pointer"
          >
            <Download size={16} />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomRange && (
        <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-4 flex flex-wrap items-center gap-4 animate-fade-in-up">
          <div className="flex items-center gap-2">
            <span className="text-label-sm text-muted-steel">من:</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-label-md text-charcoal-ink"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-label-sm text-muted-steel">إلى:</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-label-md text-charcoal-ink"
            />
          </div>
          <button
            onClick={fetchDashboard}
            className="px-4 py-2 bg-accent text-on-primary rounded-xl text-label-md font-semibold hover:bg-accent-hover transition-all"
          >
            تطبيق
          </button>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-error/10 border border-error/30 text-error p-4 rounded-2xl flex items-center gap-3">
          <AlertTriangle size={20} />
          <p className="text-body-sm font-medium">{error}</p>
        </div>
      )}

      {/* ── KPI Cards Grid ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-36 animate-shimmer" />
          ))
        ) : (
          <>
            <KpiCard
              title={t('dashboard.totalSales', 'إجمالي المبيعات')}
              value={fmtCurr(kpis.total_sales)}
              icon={ShoppingCart}
              variant="accent"
              subtitle={`${kpis.total_invoices_count || 0} فاتورة`}
            />
            <KpiCard
              title={t('dashboard.totalPurchases', 'إجمالي المشتريات')}
              value={fmtCurr(kpis.total_purchases)}
              icon={Wallet}
              variant="info"
            />
            <KpiCard
              title="قيمة المخزون الإجمالية"
              value={fmtCurr(kpis.total_inventory_value)}
              icon={Package}
              variant="success"
              subtitle="تقييم الأصول بسعر التكلفة"
            />
            <KpiCard
              title={t('dashboard.grossProfit', 'إجمالي الأرباح')}
              value={fmtCurr(kpis.gross_profit)}
              icon={TrendingUp}
              variant="success"
            />
            <KpiCard
              title={t('dashboard.netProfit', 'صافي الربح')}
              value={fmtCurr(kpis.net_profit)}
              icon={Activity}
              variant={kpis.net_profit < 0 ? 'danger' : 'accent'}
              subtitle={`مصروفات: ${fmtCurr(kpis.total_expenses)}`}
            />
            <KpiCard
              title="ديون العملاء (مستحقات)"
              value={fmtCurr(kpis.customer_receivables)}
              icon={Users}
              variant="warning"
              subtitle={`مستحقات للموردين: ${fmtCurr(kpis.supplier_payables)}`}
            />
          </>
        )}
      </div>

      {/* ── Charts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[380px]">
        {loading ? (
          <>
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-80 animate-shimmer" />
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-80 animate-shimmer" />
          </>
        ) : (
          <React.Suspense fallback={<div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-80 animate-shimmer col-span-2" />}>
            <SalesPurchasesTrendChart data={data?.trend || []} />
            <ProfitTrendChart data={data?.trend || []} />
          </React.Suspense>
        )}
      </div>

      {/* ── Detail Tables & Alerts Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {loading ? (
          <>
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-72 animate-shimmer" />
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-72 animate-shimmer" />
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-72 animate-shimmer" />
          </>
        ) : (
          <>
            <TopProductsTable products={data?.top_products || []} />
            <LowStockAlertList products={data?.low_stock_products || []} />
            <TopPartiesTable parties={data?.top_parties || []} />
          </>
        )}
      </div>
    </div>
  );
}
