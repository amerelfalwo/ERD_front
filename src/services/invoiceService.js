import { api } from './api';
import { calculateInvoiceTotals } from '../utils/calculateInvoiceTotals';

export function formatInvoiceDate(dateVal) {
  if (!dateVal) {
    const d = new Date();
    const month = d.toLocaleString('en-US', { month: 'short' });
    const day = d.getDate();
    const year = d.getFullYear();
    let hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours.toString().padStart(2, '0');
    return `${month} ${day}, ${year} · ${hoursStr}: ${minutes} ${ampm}`;
  }

  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);

  const month = d.toLocaleString('en-US', { month: 'short' });
  const day = d.getDate();
  const year = d.getFullYear();
  let hours = d.getHours();
  const minutes = d.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = hours.toString().padStart(2, '0');

  return `${month} ${day}, ${year} · ${hoursStr}: ${minutes} ${ampm}`;
}

/**
 * Standardized PDF export filename generator: {partyName}-{date}.pdf (e.g. محمد-2026-08-08.pdf)
 */
export function generatePdfFileName(partyName, dateVal) {
  const rawName = (partyName || 'Customer').toString().trim();
  const cleanName = rawName
    .replace(/^Dr\s*\/?\s*/i, '')
    .trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_');

  let dateClean = 'Date';
  if (dateVal) {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      dateClean = d.toISOString().split('T')[0];
    }
  } else {
    dateClean = new Date().toISOString().split('T')[0];
  }

  return `${cleanName}-${dateClean}.pdf`;
}

/**
 * Transforms raw API invoice data into standard InvoiceDocument prop format.
 *
 * @param {Object} rawInvoice
 * @returns {Object} Standardized invoice prop object
 */
export function formatInvoiceData(rawInvoice) {
  if (!rawInvoice) return null;

  const rawItems = rawInvoice.items || rawInvoice.invoice_items || [];
  const items = rawItems.map((item) => {
    const qty = Number(item.quantity ?? item.qty ?? 0);
    const price = Number(
      item.unit_price ?? item.sell_price ?? item.purchase_price ?? item.price ?? 0
    );
    return {
      id: item.id,
      name: item.product_name || item.product?.name || item.name || 'N/A',
      sku: item.product_sku || item.product?.sku || '',
      qty,
      price,
      total: Number((qty * price).toFixed(2)),
    };
  });

  const deliveryFee = Number(rawInvoice.delivery_fee ?? 0);
  const discountAmount = Number(rawInvoice.discount_amount ?? rawInvoice.total_discount ?? 0);
  const calculatedTotals = calculateInvoiceTotals(items, deliveryFee, discountAmount);

  const rawType = (rawInvoice.invoice_type || 'SALE').toUpperCase();
  const invoiceType = rawType === 'SELL' ? 'SALE' : rawType;

  const totalAmount = Number(rawInvoice.total_amount ?? calculatedTotals.grandTotal);
  const paidAmount = Number(rawInvoice.paid_amount ?? rawInvoice.amount_paid ?? 0);

  let paymentStatus = (rawInvoice.status || rawInvoice.payment_status || '').toUpperCase();
  if (!paymentStatus) {
    if (paidAmount >= totalAmount && totalAmount > 0) {
      paymentStatus = 'PAID';
    } else if (paidAmount > 0) {
      paymentStatus = 'PARTIAL';
    } else {
      paymentStatus = 'UNPAID';
    }
  }

  const rawDate = rawInvoice.created_at || rawInvoice.issue_date || rawInvoice.date;
  const dateStr = formatInvoiceDate(rawDate);

  return {
    id: rawInvoice.id,
    invoiceNumber: rawInvoice.invoice_number || rawInvoice.reference_number || `INV-${rawInvoice.id}`,
    invoiceType, // "PURCHASE" | "SALE" | "RETURN"
    partyName: rawInvoice.party_name || rawInvoice.party?.name || '',
    partyPhone: rawInvoice.party_phone || rawInvoice.party?.phone || '',
    partyAddress: rawInvoice.party_address || rawInvoice.party?.address || '',
    date: dateStr,
    items,
    deliveryFee: calculatedTotals.deliveryFee,
    discountAmount: calculatedTotals.discountAmount,
    itemsTotal: calculatedTotals.itemsTotal,
    grandTotal: totalAmount > 0 ? totalAmount : calculatedTotals.grandTotal,
    paymentStatus, // "PAID" | "PARTIAL" | "UNPAID"
    paidAmount,
    tenantName: rawInvoice.tenant_name || rawInvoice.tenant?.name || '',
    tenantLogoUrl: rawInvoice.tenant_logo_url || rawInvoice.tenant?.logo_url || '',
    website: rawInvoice.website ?? rawInvoice.tenant?.website ?? '',
    footerCustomText: rawInvoice.footer_custom_text || '',
    raw: rawInvoice,
  };
}

/**
 * Fetches an invoice by ID from backend (GET /invoices/{id}) and formats it for InvoiceDocument.
 *
 * @param {number|string} invoiceId
 * @returns {Promise<Object>} Standardized invoice data
 */
export async function fetchInvoiceById(invoiceId) {
  const rawInvoice = await api.getInvoice(invoiceId);
  return formatInvoiceData(rawInvoice);
}

export const invoiceService = {
  fetchInvoiceById,
  formatInvoiceData,
};

export default invoiceService;
