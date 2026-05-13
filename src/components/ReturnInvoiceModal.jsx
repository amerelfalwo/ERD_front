import { useState } from 'react';
import { Loader2, X } from 'lucide-react';

export default function ReturnInvoiceModal({ invoice, onClose, onSaved }) {
  const [returnItems, setReturnItems] = useState(
    invoice.items.map(item => ({
      invoice_item_id: item.id,
      product_name: item.product_name || `Item #${item.batch_id}`,
      purchased_qty: item.quantity,
      return_qty: 0,
      unit_price: item.unit_price
    }))
  );
  const [submitting, setSubmitting] = useState(false);

  const handleQtyChange = (id, val) => {
    setReturnItems(prev => prev.map(i => {
      if (i.invoice_item_id === id) {
        return { ...i, return_qty: Math.max(0, Math.min(i.purchased_qty, Number(val))) };
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
        throw new Error(error.detail || 'Failed to process return');
      }
      onSaved();
    } catch (err) {
      alert(err.message || 'Error processing return');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-charcoal-ink/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/60 w-full max-w-2xl overflow-hidden animate-fade-in-up">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4 border-b border-outline-variant/30 pb-3">
            <h3 className="text-h3 text-charcoal-ink">Process Return (إسترجاع) - #{String(invoice.id).padStart(5, '0')}</h3>
            <button onClick={onClose} className="p-1 text-muted-steel hover:text-charcoal-ink"><X size={20}/></button>
          </div>
          <div className="max-h-[60vh] overflow-y-auto mb-4">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-outline-variant/30 text-muted-steel">
                  <th className="py-2">Product</th>
                  <th className="py-2 text-center">Purchased</th>
                  <th className="py-2 text-center">Return Qty</th>
                </tr>
              </thead>
              <tbody>
                {returnItems.map(item => (
                  <tr key={item.invoice_item_id} className="border-b border-outline-variant/20">
                    <td className="py-3">{item.product_name}</td>
                    <td className="py-3 text-center">{item.purchased_qty}</td>
                    <td className="py-3 text-center">
                      <input 
                        type="number" 
                        min="0" 
                        max={item.purchased_qty} 
                        value={item.return_qty}
                        onChange={e => handleQtyChange(item.invoice_item_id, e.target.value)}
                        className="w-20 mx-auto bg-surface-container-low border border-outline-variant/60 rounded-lg px-2 py-1 text-center text-charcoal-ink focus:border-accent outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex justify-end gap-3">
            <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-label-md text-muted-steel hover:bg-surface-container-low transition-all cursor-pointer">Cancel</button>
            <button onClick={handleSubmit} disabled={submitting || returnItems.every(i => i.return_qty === 0)} className="px-5 py-2.5 rounded-xl text-label-md bg-accent text-on-primary hover:bg-accent-hover shadow-sm transition-all cursor-pointer flex items-center gap-2">
              {submitting ? <Loader2 size={16} className="animate-spin"/> : 'Confirm Return'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
