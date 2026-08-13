import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp, TrendingDown, Wallet, CreditCard, ShoppingCart,
  Download, Filter, RefreshCw, AlertTriangle, FileText, Activity
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
    const today = new Date();

    if (type === 'today') {
      const formatted = format(today, 'yyyy-MM-dd');
      setDateFrom(formatted);
      setDateTo(formatted);
      setShowCustomRange(false);
    } else if (type === 'week') {
      setDateFrom(format(startOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd')); // Saturday start
      setDateTo(format(endOfWeek(today, { weekStartsOn: 6 }), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'month') {
      setDateFrom(format(startOfMonth(today), 'yyyy-MM-dd'));
      setDateTo(format(endOfMonth(today), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'year') {
      setDateFrom(format(startOfYear(today), 'yyyy-MM-dd'));
      setDateTo(format(endOfYear(today), 'yyyy-MM-dd'));
      setShowCustomRange(false);
    } else if (type === 'custom') {
      setShowCustomRange(true);
    }
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getDashboardData(dateFrom, dateTo);
      setData(res);
    } catch (err) {
      console.error('Failed to load dashboard', err);
      setError(t('dashboard.error', 'فشل تحميل بيانات لوحة التحكم. يرجى المحاولة مرة أخرى.'));
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, t]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const handleExportCSV = () => {
    if (!data?.kpis) return;
    let csv = "data:text/csv;charset=utf-8,";
    csv += "Metric,Value\n";
    csv += `Total Sales,${data.kpis.total_sales}\n`;
    csv += `Total Purchases,${data.kpis.total_purchases}\n`;
    csv += `Gross Profit,${data.kpis.gross_profit}\n`;
    csv += `Total Expenses,${data.kpis.total_expenses}\n`;
    csv += `Net Profit,${data.kpis.net_profit}\n`;
    csv += `Outstanding Balance,${data.kpis.outstanding_balance}\n`;
    csv += `Total Invoices,${data.kpis.total_invoices_count}\n`;

    const encoded = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encoded);
    link.setAttribute("download", `dashboard_report_${format(new Date(), 'yyyyMMdd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const kpis = data?.kpis || {};
  const fmtCurr = (val) => `$${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-h1 text-charcoal-ink font-extrabold tracking-tight">
            {t('dashboard.title', 'لوحة التحكم والتحليلات')}
          </h1>
          <p className="text-body-base text-muted-steel mt-1">
            {t('dashboard.subtitle', 'رؤى المخزون والمقاييس التشغيلية في الوقت الفعلي')}
          </p>
        </div>

        {/* ── Controls & Quick Period Selectors ── */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="bg-surface-container-high p-1 rounded-xl flex items-center gap-1 border border-outline-variant/60 shadow-whisper">
            <button
              onClick={() => applyPeriodFilter('today')}
              className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
                activeFilter === 'today' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('dashboard.today', 'اليوم')}
            </button>
            <button
              onClick={() => applyPeriodFilter('week')}
              className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
                activeFilter === 'week' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('dashboard.week', 'الأسبوع')}
            </button>
            <button
              onClick={() => applyPeriodFilter('month')}
              className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
                activeFilter === 'month' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('dashboard.month', 'الشهر')}
            </button>
            <button
              onClick={() => applyPeriodFilter('year')}
              className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
                activeFilter === 'year' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('dashboard.year', 'السنة')}
            </button>
            <button
              onClick={() => applyPeriodFilter('custom')}
              className={`px-3 py-1.5 rounded-lg text-label-md transition-all font-medium cursor-pointer ${
                activeFilter === 'custom' ? 'bg-accent text-on-primary shadow-sm' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {t('dashboard.custom', 'مخصص')}
            </button>
          </div>

          <button
            onClick={fetchDashboard}
            title="تحديث البيانات"
            className="p-2.5 bg-surface-container-lowest border border-outline-variant/60 rounded-xl hover:bg-surface-container-low transition-colors text-on-surface-variant cursor-pointer"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 bg-accent text-on-primary rounded-xl text-label-md font-semibold hover:bg-accent-hover transition-all shadow-sm cursor-pointer"
          >
            <Download size={16} />
            تصدير CSV
          </button>
        </div>
      </div>

      {/* Custom Date Range Picker */}
      {showCustomRange && (
        <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/60 flex flex-wrap items-center gap-4 animate-fade-in shadow-whisper">
          <div>
            <label className="block text-label-sm text-muted-steel mb-1">من تاريخ</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-label-md text-charcoal-ink"
            />
          </div>
          <div>
            <label className="block text-label-sm text-muted-steel mb-1">إلى تاريخ</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="bg-surface-container-high border border-outline-variant/60 rounded-xl px-3 py-2 text-label-md text-charcoal-ink"
            />
          </div>
          <div className="flex items-end self-end">
            <button
              onClick={fetchDashboard}
              className="px-4 py-2 bg-accent text-on-primary rounded-xl text-label-md font-semibold hover:bg-accent-hover transition-all"
            >
              تطبيق الفلتر
            </button>
          </div>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {loading ? (
          <>
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-36 animate-shimmer" />
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-36 animate-shimmer" />
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-36 animate-shimmer" />
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-36 animate-shimmer" />
            <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 h-36 animate-shimmer" />
          </>
        ) : (
          <>
            <KpiCard
              title={t('dashboard.totalSales', 'إجمالي المبيعات')}
              value={fmtCurr(kpis.total_sales)}
              icon={ShoppingCart}
              variant="accent"
              subtitle={`${kpis.total_invoices_count || 0} ${t('dashboard.totalInvoices', 'فاتورة')}`}
            />
            <KpiCard
              title={t('dashboard.totalPurchases', 'إجمالي المشتريات')}
              value={fmtCurr(kpis.total_purchases)}
              icon={Wallet}
              variant="info"
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
              title={t('dashboard.outstandingBalance', 'مستحقات العملاء')}
              value={fmtCurr(kpis.outstanding_balance)}
              icon={CreditCard}
              variant="warning"
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
