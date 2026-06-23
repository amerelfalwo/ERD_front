import React, { useState } from 'react';
import { X, RotateCcw, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { notifications } from '@mantine/notifications';

export default function SupplierReturnProductModal({ supplierId, product, onClose, onSaved }) {
  const { t } = useTranslation();
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState(product.last_purchase_price ? String(product.last_purchase_price) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const maxQuantity = product.supplier_stock || 0;

  const handleSubmit = async () => {
    setError('');
    const qty = Number(quantity);
    const price = Number(unitPrice);

    if (!qty || qty <= 0) {
      setError(t('partyDashboard.enterValidQty', 'Please enter a valid quantity'));
      return;
    }
    if (qty > maxQuantity) {
      setError(t('partyDashboard.exceedsStock', 'Return quantity exceeds available stock'));
      return;
    }
    if (!price || price <= 0) {
      setError(t('partyDashboard.enterValidPrice', 'Please enter a valid unit price'));
      return;
    }

    setIsSubmitting(true);
    try {
      await api.createSupplierStockReturn(supplierId, {
        items: [
          {
            product_id: product.id,
            quantity: qty,
            unit_price: price,
          },
        ],
      });
      notifications.show({
        title: 'Success',
        message: t('partyDashboard.returnSuccess', 'Return processed successfully'),
        color: 'green',
      });
      onSaved();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to process return');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-charcoal-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-md overflow-hidden animate-fade-in-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-status-error/10 text-status-error flex items-center justify-center">
                <RotateCcw size={20} />
              </div>
              <h3 className="text-h3 text-charcoal-ink">{t('partyDashboard.returnProduct', 'Return Product')}</h3>
            </div>
            <button onClick={onClose} className="p-2 text-muted-steel hover:bg-surface-container-low rounded-xl transition-all btn-tactile">
              <X size={20} />
            </button>
          </div>

          <div className="mb-6 space-y-4">
            <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
              <p className="text-label-sm text-muted-steel mb-1">{t('partyDashboard.product')}</p>
              <p className="text-charcoal-ink font-semibold">{product.name}</p>
              <div className="mt-2 flex justify-between items-center text-sm">
                <span className="text-muted-steel">{t('partyDashboard.availableStock', 'Available Stock')}:</span>
                <span className="font-mono-tabular text-accent font-medium">{maxQuantity}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-label-sm text-charcoal-ink mb-1.5">{t('partyDashboard.returnQty', 'Return Qty')}</label>
                <input
                  type="number"
                  min="0"
                  max={maxQuantity}
                  step="0.01"
                  value={quantity}
                  onChange={(e) => { setQuantity(e.target.value); setError(''); }}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant focus:border-accent focus:ring-1 focus:ring-accent rounded-xl outline-none transition-all text-charcoal-ink font-mono-tabular"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="block text-label-sm text-charcoal-ink mb-1.5">{t('partyDashboard.unitPrice', 'Return Price')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={unitPrice}
                  onChange={(e) => { setUnitPrice(e.target.value); setError(''); }}
                  className="w-full px-4 py-2.5 bg-surface-container-lowest border border-outline-variant focus:border-accent focus:ring-1 focus:ring-accent rounded-xl outline-none transition-all text-charcoal-ink font-mono-tabular"
                  placeholder="0.00"
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-error-container/20 border border-error/20 rounded-xl">
                <p className="text-error text-xs font-medium">{error}</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer btn-tactile"
            >
              {t('common.cancel', 'Cancel')}
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || !quantity || !unitPrice || Number(quantity) <= 0 || Number(quantity) > maxQuantity}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-label-md bg-status-error text-white hover:bg-status-error/90 shadow-sm transition-all cursor-pointer btn-tactile disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting && <Loader2 size={16} className="animate-spin" />}
              {t('partyDashboard.confirmReturn', 'Confirm Return')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
