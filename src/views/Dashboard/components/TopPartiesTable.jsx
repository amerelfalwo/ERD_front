import React from 'react';
import { useTranslation } from 'react-i18next';
import { Users, Truck } from 'lucide-react';

export default function TopPartiesTable({ parties = [] }) {
  const { t } = useTranslation();

  return (
    <div className="bg-surface-container-lowest border border-outline-variant/60 rounded-2xl p-6 shadow-whisper flex flex-col h-full overflow-hidden">
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <Users size={18} strokeWidth={1.8} />
        </div>
        <h3 className="text-h3 text-charcoal-ink font-bold">{t('dashboard.topParties', 'أكبر المتعاملين')}</h3>
      </div>

      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-right border-collapse">
          <thead>
            <tr className="border-b border-outline-variant/50 text-label-sm text-muted-steel uppercase tracking-wider">
              <th className="py-3 px-2 text-right">#</th>
              <th className="py-3 px-2 text-right">الاسم</th>
              <th className="py-3 px-2 text-center">النوع</th>
              <th className="py-3 px-2 text-left">إجمالي التعاملات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 text-body-sm">
            {parties.length === 0 ? (
              <tr>
                <td colSpan="4" className="py-8 text-center text-muted-steel">
                  {t('dashboard.noData', 'لا تتوفر بيانات للفترة المحددة')}
                </td>
              </tr>
            ) : (
              parties.map((party, idx) => {
                const isClient = party.type === 'CLIENT';
                return (
                  <tr key={idx} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="py-3 px-2 text-muted-steel font-mono-tabular font-medium text-right">{idx + 1}</td>
                    <td className="py-3 px-2 font-semibold text-charcoal-ink text-right">{party.party_name}</td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-label-sm font-medium ${
                        isClient 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                          : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20'
                      }`}>
                        {isClient ? <Users size={12} /> : <Truck size={12} />}
                        {isClient ? t('dashboard.client', 'عميل') : t('dashboard.supplier', 'مورد')}
                      </span>
                    </td>
                    <td className="py-3 px-2 font-bold font-mono-tabular text-charcoal-ink text-left">
                      ${Number(party.total_amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
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
