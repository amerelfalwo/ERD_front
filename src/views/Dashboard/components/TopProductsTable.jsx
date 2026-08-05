import React from 'react';
import { useTranslation } from 'react-i18next';
import { Package } from 'lucide-react';

export default function TopProductsTable({ products = [] }) {
  const { t } = useTranslation();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-accent/10 text-accent">
          <Package size={18} strokeWidth={1.8} />
        </div>
        <h3 className="text-h3 text-charcoal-ink font-bold">{t('dashboard.topProducts', 'Top Products')}</h3>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/50 text-label-sm text-muted-steel uppercase tracking-wider">
              <th className="py-3 px-2 text-right">#</th>
              <th className="py-3 px-2 text-right">{t('dashboard.product', 'المنتج')}</th>
              <th className="py-3 px-2 text-center">{t('dashboard.qtySold', 'الكمية المباعة')}</th>
              <th className="py-3 px-2 text-left">{t('dashboard.revenue', 'الإيراد')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 text-body-sm">
            {products.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-muted-steel">
                  {t('dashboard.noData', 'لا تتوفر بيانات للفترة المحددة')}
                </td>
              </tr>
            ) : (
              products.map((prod, idx) => (
                <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="py-3 px-2 text-muted-steel font-mono-tabular font-medium text-right">{idx + 1}</td>
                  <td className="py-3 px-2 font-semibold text-charcoal-ink text-right">{prod.product_name}</td>
                  <td className="py-3 px-2 text-center font-mono-tabular text-muted-steel">{Number(prod.qty_sold).toLocaleString()}</td>
                  <td className="py-3 px-2 font-bold font-mono-tabular text-accent text-left">
                    ${Number(prod.revenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
