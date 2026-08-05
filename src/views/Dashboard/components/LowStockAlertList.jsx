import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ShieldAlert } from 'lucide-react';

export default function LowStockAlertList({ products = [] }) {
  const { t } = useTranslation();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle size={18} strokeWidth={1.8} />
          </div>
          <h3 className="text-h3 text-charcoal-ink font-bold">{t('dashboard.lowStockAlerts', 'تنبيهات المخزون المنخفض')}</h3>
        </div>
        {products.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-label-sm font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            {products.length} تنبيهات
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-3">
        {products.length === 0 ? (
          <div className="py-8 text-center text-muted-steel flex flex-col items-center justify-center">
            <ShieldAlert size={32} strokeWidth={1.2} className="mb-2 text-emerald-500 opacity-60" />
            <p className="text-body-sm">جميع مستويات المخزون ممتازة!</p>
          </div>
        ) : (
          products.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between p-3.5 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors"
            >
              <div>
                <p className="text-body-sm font-bold text-charcoal-ink">{item.product_name}</p>
                <p className="text-label-sm text-muted-steel mt-0.5">
                  {t('dashboard.minStock', 'الحد الأدنى')}: <span className="font-mono-tabular font-semibold">{item.min_stock}</span>
                </p>
              </div>
              <div className="text-right">
                <span className="px-2.5 py-1 rounded-lg text-label-md font-mono-tabular font-bold bg-rose-500/20 text-rose-700 dark:text-rose-300">
                  {t('dashboard.remainingQty', 'المتبقي')}: {Number(item.remaining_qty)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
