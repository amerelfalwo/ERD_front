import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-charcoal-ink text-white px-4 py-3 rounded-xl shadow-whisper-lg text-body-sm border border-white/10">
      <p className="font-semibold mb-1 text-accent-muted">{label}</p>
      {payload.map((entry, idx) => (
        <div key={idx} className="flex items-center justify-between gap-4 my-0.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="opacity-80">{entry.name}:</span>
          </div>
          <span className="font-mono-tabular font-bold">${Number(entry.value || 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

export default function SalesPurchasesTrendChart({ data = [] }) {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === 'ar';

  const formattedData = data.map((item) => ({
    period: item.period,
    sales: Number(item.sales || 0),
    purchases: Number(item.purchases || 0)
  }));

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper flex flex-col h-full">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h3 className="text-h3 text-charcoal-ink font-bold">{t('dashboard.salesVsPurchases', 'Sales vs Purchases Trend')}</h3>
          <p className="text-body-sm text-muted-steel mt-0.5">Comparison over time</p>
        </div>
      </div>

      <div className="w-full h-[320px] flex-1">
        {formattedData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-muted-steel text-body-sm">
            {t('dashboard.noData', 'No data available for selected period')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={formattedData} margin={{ top: 10, right: isRtl ? 10 : 20, left: isRtl ? 20 : 10, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-outline-variant)" strokeOpacity={0.3} vertical={false} />
              <XAxis
                dataKey="period"
                tick={{ fontSize: 11, fill: 'var(--color-muted-steel)' }}
                axisLine={false}
                tickLine={false}
                dy={10}
                reversed={isRtl}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--color-muted-steel)' }}
                axisLine={false}
                tickLine={false}
                orientation={isRtl ? 'right' : 'left'}
                tickFormatter={(val) => (val >= 1000 ? `$${(val / 1000).toFixed(0)}k` : `$${val}`)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '15px', fontSize: '12px' }} />
              <Area
                type="monotone"
                dataKey="sales"
                name={t('dashboard.totalSales', 'Total Sales')}
                stroke="#4F46E5"
                strokeWidth={3}
                fillOpacity={1}
                fill="url(#colorSales)"
              />
              <Area
                type="monotone"
                dataKey="purchases"
                name={t('dashboard.totalPurchases', 'Total Purchases')}
                stroke="#3B82F6"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                fillOpacity={1}
                fill="url(#colorPurchases)"
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
