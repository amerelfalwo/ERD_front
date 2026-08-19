import { useState } from 'react';
import { notifications } from '@mantine/notifications';
import { useTranslation } from 'react-i18next';
import { Loader2, X } from 'lucide-react';

export default function ReturnInvoiceModal({ invoice, onClose, onSaved }) {
  const { t } = useTranslation();
  const [returnItems, setReturnItems] = useState(
    invoice.items.map(item => {
      const alreadyReturned = Number(item.already_returned_qty || 0);
      const remainingQty = Math.max(0, Number(item.quantity) - alreadyReturned);
      return {
        invoice_item_id: item.id,
        product_name: item.product_name || `Item #${item.batch_id}`,
        purchased_qty: item.quantity,
        already_returned_qty: alreadyReturned,
        remaining_qty: remainingQty,
        return_qty: 0,
        unit_price: item.unit_price
      };
    })
  );
  const [submitting, setSubmitting] = useState(false);

  const handleQtyChange = (id, val) => {
    setReturnItems(prev => prev.map(i => {
      if (i.invoice_item_id === id) {
        const numVal = val === '' ? 0 : Number(val);
        return { ...i, return_qty: Math.max(0, Math.min(i.remaining_qty, numVal)) };
      }
      return i;
    }));
  };

  const handleSubmit = async () => {
    const payload = {
      items: returnItems.filter(i => i.return_qty > 0).map(i => ({
        invoice_item_id: i.invoice_item_id,
        quantity: i.return_qty
      }))
    };
    if (payload.items.length === 0) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('access_token');
      const baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/invoices/${invoice.id}/return`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        throw new Error(error.detail || t('returnInvoice.failed'));
      }
      onSaved();
    } catch (err) {
      notifications.show({ title: 'Error', message: err.message || t('returnInvoice.error'), color: 'red' });
    } finally {
      setSubmitting(false);
    }
  };

  const totalReturnSum = returnItems.reduce((sum, i) => sum + (Number(i.return_qty || 0) * Number(i.unit_price || 0)), 0);

  return (
    <div className="fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-3xl overflow-hidden animate-fade-in-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-outline-variant/30 pb-3">
            <h3 className="text-h3 text-charcoal-ink font-semibold">
              {t('returnInvoice.title', { id: String(invoice.id).padStart(5, '0') })}
            </h3>
            <button onClick={onClose} className="p-1 text-muted-steel hover:text-charcoal-ink transition-colors"><X size={20}/></button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto mb-4">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-outline-variant/30 text-muted-steel text-xs uppercase tracking-wider">
                  <th className="py-2.5 px-3 text-left font-medium">{t('returnInvoice.product')}</th>
                  <th className="py-2.5 px-3 text-center font-medium">{t('returnInvoice.purchased')}</th>
                  <th className="py-2.5 px-3 text-center font-medium">{t('returnInvoice.returned')}</th>
                  <th className="py-2.5 px-3 text-center font-medium">{t('returnInvoice.available')}</th>
                  <th className="py-2.5 px-3 text-right font-medium">سعر الوحدة</th>
                  <th className="py-2.5 px-3 text-right font-medium">{t('returnInvoice.returnQty')}</th>
                  <th className="py-2.5 px-3 text-right font-medium">قيمة المرتجع</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map(item => {
                  const itemReturnValue = Number(item.return_qty || 0) * Number(item.unit_price || 0);
                  return (
                  <tr key={item.invoice_item_id} className="border-b border-outline-variant/20 hover:bg-surface-container-low/40 transition-colors">
                    <td className="py-3 px-3 text-left font-medium text-charcoal-ink">{item.product_name}</td>
                    <td className="py-3 px-3 text-center text-muted-steel">{item.purchased_qty}</td>
                    <td className="py-3 px-3 text-center">
                      {item.already_returned_qty > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                          {item.already_returned_qty}
                        </span>
                      ) : (
                        <span className="text-muted-steel/40">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-center font-semibold text-accent">{item.remaining_qty}</td>
                    <td className="py-3 px-3 text-right font-mono-tabular text-muted-steel">
                      EGP {Number(item.unit_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex flex-col items-end gap-0.5">
                        <input 
                          type="number" 
                          min="0" 
                          max={item.remaining_qty} 
                          value={item.return_qty || ''}
                          disabled={item.remaining_qty === 0}
                          onChange={e => handleQtyChange(item.invoice_item_id, e.target.value)}
                          placeholder="0"
                          className={`w-20 text-center bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1 text-charcoal-ink focus:border-accent outline-none transition-all ${
                            item.remaining_qty === 0 ? 'opacity-50 cursor-not-allowed bg-surface-container-low/50' : 'hover:border-outline-variant'
                          }`}
                        />
                        {item.remaining_qty > 0 && (
                          <span className="text-[10px] text-muted-steel font-medium pr-1">
                            {t('returnInvoice.max', { qty: item.remaining_qty })}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right font-mono-tabular font-semibold text-charcoal-ink">
                      EGP {itemReturnValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="bg-surface-container-low p-3.5 rounded-xl border border-outline-variant/30 flex justify-between items-center mb-4">
            <span className="text-sm font-medium text-charcoal-ink">إجمالي قيمة المرتجع:</span>
            <span className="text-base font-bold font-mono-tabular text-accent">
              EGP {totalReturnSum.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="flex justify-end gap-3 border-t border-outline-variant/30 pt-4">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer">
              {t('returnInvoice.cancel')}
            </button>
            <button onClick={handleSubmit} disabled={submitting || returnItems.every(i => i.return_qty === 0)} className="px-5 py-2.5 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer flex items-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin"/> : t('returnInvoice.confirmReturn')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

