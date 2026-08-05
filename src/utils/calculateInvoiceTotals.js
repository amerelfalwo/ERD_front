/**
 * Calculates Items Total, Delivery Fee, and Grand Total for an invoice.
 * Single source of truth for frontend invoice total calculations.
 *
 * @param {Array<{ qty?: number, quantity?: number, price?: number, unit_price?: number, sell_price?: number, purchase_price?: number }>} items
 * @param {number|string} [deliveryFee=0]
 * @returns {{ itemsTotal: number, deliveryFee: number, grandTotal: number }}
 */
export function calculateInvoiceTotals(items = [], deliveryFee = 0, discountAmount = 0) {
  const parsedDeliveryFee = Math.max(0, Number(deliveryFee) || 0);
  const parsedDiscountAmount = Math.max(0, Number(discountAmount) || 0);

  const itemsTotal = items.reduce((sum, item) => {
    const qty = Number(item.qty ?? item.quantity ?? 0);
    const price = Number(item.price ?? item.unit_price ?? item.sale_price ?? item.sell_price ?? item.selling_price ?? item.purchase_price ?? 0);
    return sum + (qty * price);
  }, 0);

  const grandTotal = Math.max(0, itemsTotal + parsedDeliveryFee - parsedDiscountAmount);

  return {
    itemsTotal: Number(itemsTotal.toFixed(2)),
    deliveryFee: Number(parsedDeliveryFee.toFixed(2)),
    discountAmount: Number(parsedDiscountAmount.toFixed(2)),
    grandTotal: Number(grandTotal.toFixed(2)),
  };
}

export default calculateInvoiceTotals;
