import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getLogoUrl } from '../utils/url';

const fmt = (n, digits = 2) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default function InvoicePrintTemplate({
  invoice,
  tenantName,
  partyName,
  partyPhone,
  partyAddress,
  logoUrl,
  defaultFooterText,
  taxNumber,
  paperSize = '80mm',
}) {
  const { t } = useTranslation();
  if (!invoice) return null;

  const isSale     = ['sale', 'SALE'].includes(invoice.invoice_type);
  const isReturn   = ['sale_return', 'purchase_return', 'SALE_RETURN', 'PURCHASE_RETURN'].includes(invoice.invoice_type);

  const invoiceDate   = new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  const invoiceTime   = new Date(invoice.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const invoiceNumber = String(invoice.id).padStart(5, '0');
  
  const total         = Number(invoice.total_amount   || 0);
  const paid          = Number(invoice.paid_amount    || 0);
  const balance       = Number(invoice.balance        ?? (total - paid));
  const deliveryFee   = Number(invoice.delivery_fee   || 0);
  const subtotal      = total - deliveryFee;
  const previousBalance = Number(invoice.previous_balance || 0);
  const totalBalanceAfter = Number(invoice.total_balance_after ?? (balance + previousBalance));
  const footerText    = invoice.footer_custom_text || defaultFooterText || null;
  const resolvedLogo  = getLogoUrl(logoUrl);

  const badgeLabel = isReturn ? t('printTemplate.returnNotice') : isSale ? t('printTemplate.saleInvoice') : t('printTemplate.purchaseInvoice');

  const isReceipt = paperSize === 'receipt' || paperSize === '80mm';
  const isA5 = paperSize === 'a5';

  if (isReceipt) {
    return (
      <div
        className="invoice-print-area max-w-[300px] w-[80mm] mx-auto bg-white text-gray-900 print:max-w-none print:w-full print:shadow-none print:m-0"
        style={{ direction: 'rtl', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', fontFamily: '"Readex Pro", sans-serif' }}
      >
        <div className="p-4 text-[12px] leading-relaxed">
          
          {/* Top Section */}
          <div className="flex flex-col items-center mb-4">
            {resolvedLogo ? (
              <img src={resolvedLogo} alt="Logo" className="w-16 h-16 object-contain mb-2 grayscale" />
            ) : (
              <div className="w-14 h-14 rounded-full border-2 border-gray-800 flex items-center justify-center mb-2">
                <Building2 size={24} className="text-gray-800" />
              </div>
            )}
            
            <h1 className="text-xl font-bold text-center mb-1">{badgeLabel}</h1>
            {tenantName && <p className="text-sm font-bold text-center mb-1">{tenantName}</p>}
            <p className="text-xs text-gray-600 text-center font-mono">#{invoiceNumber}</p>
          </div>

          <hr className="border-t-[1.5px] border-dashed border-gray-400 my-3" />

          {/* Meta Section */}
          <div className="mb-4 text-[12px]">
            <div className="flex flex-col gap-y-1.5">
              <div className="flex items-baseline justify-between gap-x-2">
                <span className="font-semibold text-gray-600 shrink-0">{t('printTemplate.purchaseDate')}:</span>
                <span className="font-mono text-left" dir="ltr">{invoiceDate} {invoiceTime}</span>
              </div>
              <div className="flex items-baseline justify-between gap-x-2">
                <span className="font-semibold text-gray-600 shrink-0">{t('printTemplate.billedTo')}:</span>
                <span className="font-bold text-left">{t('printTemplate.doctorPrefix')} {partyName || t('printTemplate.cashCustomer')}</span>
              </div>
              {partyPhone && (
                <div className="flex items-baseline justify-between gap-x-2">
                  <span className="font-semibold text-gray-600 shrink-0">{t('printTemplate.mobile')}:</span>
                  <span className="font-mono text-left" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{partyPhone}</span>
                </div>
              )}
              {partyAddress && (
                <div className="flex items-baseline justify-between gap-x-2">
                  <span className="font-semibold text-gray-600 shrink-0">{t('printTemplate.addressLabel')}:</span>
                  <span className="break-words text-left">{partyAddress}</span>
                </div>
              )}
            </div>
          </div>

          <hr className="border-t-[1.5px] border-dashed border-gray-400 my-3" />

          {/* Items Table */}
          <table className="w-full text-right mb-4 text-[11px] border-collapse">
            <thead>
              <tr className="border-b-[1.5px] border-dashed border-gray-400">
                <th className="py-1.5 px-1 font-bold">{t('printTemplate.item')}</th>
                <th className="py-1.5 px-1 text-center font-bold">{t('printTemplate.qty')}</th>
                <th className="py-1.5 px-1 text-center font-bold">{t('printTemplate.price')}</th>
                <th className="py-1.5 px-1 text-left font-bold">{t('printTemplate.total')}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => {
                const qty       = Number(item.quantity);
                const unitPrice = Number(item.unit_price);
                const lineTotal = qty * unitPrice;
                return (
                  <tr key={idx} className="border-b border-dashed border-gray-300 last:border-0 break-inside-avoid">
                    <td className="py-1.5 px-1 font-semibold">{item.product_name || item.name || `#${item.batch_id}`}</td>
                    <td className="py-1.5 px-1 text-center font-mono" dir="ltr">{qty}</td>
                    <td className="py-1.5 px-1 text-center font-mono" dir="ltr">{fmt(unitPrice)}</td>
                    <td className="py-1.5 px-1 text-left font-mono font-bold" dir="ltr">{fmt(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <hr className="border-t-[1.5px] border-dashed border-gray-400 my-3" />

          {/* Totals Section */}
          <div className="flex flex-col space-y-1.5 mb-4 text-[12px]">
            <div className="flex justify-between">
              <span className="text-gray-600">{t('printTemplate.itemsTotal')}:</span>
              <span className="font-mono font-bold" dir="ltr">{fmt(subtotal)}</span>
            </div>
            {deliveryFee > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">{t('printTemplate.deliveryFee')}:</span>
                <span className="font-mono" dir="ltr">{fmt(deliveryFee)}</span>
              </div>
            )}
            <div className="flex justify-between items-center py-1.5 mt-1 border-t-[1.5px] border-dashed border-gray-400">
              <span className="font-bold text-sm">{t('printTemplate.grandTotal')}:</span>
              <span className="font-mono font-bold text-sm" dir="ltr">EGP {fmt(total)}</span>
            </div>


            <div className="flex justify-between items-center py-1 mt-1 border-t border-gray-300">
              <span className="font-bold text-[11px] text-gray-700">{t('printTemplate.previousBalance')}:</span>
              <span className="font-mono font-bold text-[11px] text-gray-700" dir="ltr">EGP {fmt(previousBalance)}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 mt-1 border-t border-gray-400 bg-gray-100 rounded px-1.5">
              <span className="font-bold text-sm">{t('printTemplate.totalAccount')}:</span>
              <span className="font-mono font-bold text-sm" dir="ltr">EGP {fmt(totalBalanceAfter)}</span>
            </div>
          </div>

          <hr className="border-t-[1.5px] border-dashed border-gray-400 my-3" />

          {/* Footer */}
          <div className="text-center flex flex-col items-center mt-4 space-y-2 text-[11px]">
            {taxNumber && (
              <div className="border border-gray-300 px-2 py-1.5 rounded w-full flex justify-between">
                <span className="text-gray-600 font-bold">{t('printTemplate.taxNumber')}:</span>
                <span className="font-mono font-bold">{taxNumber}</span>
              </div>
            )}
            {footerText ? (
              <p className="font-bold text-gray-800 mt-2 whitespace-pre-wrap">{footerText}</p>
            ) : (
              <p className="text-[11px] font-bold text-gray-600 mt-4">
                {t('printTemplate.thankYou')}
              </p>
            )}
          </div>

        </div>
      </div>
    );
  }

  // --- A4 / A5 Layout ---
  const containerSizeClass = isA5 ? 'w-[148mm] min-h-[210mm] print:min-h-0' : 'w-[210mm] min-h-[297mm] print:min-h-0';
  const paddingClass       = isA5 ? 'p-6' : 'p-10';
  const baseTextSize       = isA5 ? 'text-sm' : 'text-base';
  const logoSizeClass      = isA5 ? 'w-20 h-20' : 'w-28 h-28';
  const iconSize           = isA5 ? 36 : 48;
  const titleTextSize      = isA5 ? 'text-xl' : 'text-3xl';
  const tableTextSize      = isA5 ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`invoice-print-area ${containerSizeClass} mx-auto bg-white text-gray-900 print:max-w-none print:w-full print:shadow-none print:m-0`}
      style={{ direction: 'rtl', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', fontFamily: '"Readex Pro", sans-serif' }}
    >
      <div className={`${paddingClass} ${baseTextSize} leading-relaxed flex flex-col h-full`}>
        
        {/* Header & Customer Info */}
        <div className="grid grid-cols-3 gap-4 items-start mb-8 border-b-2 border-gray-800 pb-6">
          
          {/* Right: Customer Info & Invoice Number */}
          <div className="text-right">
            <p className="text-gray-600 mb-3">{t('printTemplate.invoiceNumber')}: <span className="font-mono font-bold text-gray-900">#{invoiceNumber}</span></p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-1">{t('printTemplate.customerInfo')}</h3>
              <p className="font-bold text-lg text-gray-900">{t('printTemplate.doctorPrefix')} {partyName || t('printTemplate.cashCustomer')}</p>
              {partyPhone && <p className="font-mono font-semibold text-gray-700 mt-1" dir="ltr">{partyPhone}</p>}
              {partyAddress && <p className="text-gray-700 mt-1 text-sm">{partyAddress}</p>}
            </div>
          </div>

          {/* Center: Invoice Type */}
          <div className="text-center flex flex-col items-center justify-center h-full">
            <h2 className={`${titleTextSize} font-black text-gray-900 mb-2 uppercase tracking-wide`}>{badgeLabel}</h2>
            {taxNumber && <p className="text-gray-600 mt-1 font-bold bg-gray-100 px-3 py-1 rounded-md border border-gray-200">{t('printTemplate.taxNumber')}: <span className="font-mono">{taxNumber}</span></p>}
          </div>

          {/* Left: Logo & Date */}
          <div className="text-left flex flex-col items-end">
            {resolvedLogo ? (
              <img src={resolvedLogo} alt="Logo" className={`${logoSizeClass} object-contain mb-3`} />
            ) : (
              <div className={`${logoSizeClass} rounded-xl bg-gray-800 flex items-center justify-center mb-3 shadow-sm`}>
                <Building2 size={iconSize} className="text-white" />
              </div>
            )}
            <div className="text-right">
              <p className="text-gray-600 font-bold mb-1">{tenantName}</p>
              <p className="text-gray-500 text-sm">{t('invoices.history')} : <span className="font-mono font-semibold text-gray-800">{invoiceDate}</span></p>
              <p className="font-mono font-semibold text-gray-800 text-sm">{invoiceTime}</p>
            </div>
          </div>
          
        </div>

        {/* Items Table */}
        <div className="mb-8 flex-1">
          <table className="w-full text-right border-collapse border-2 border-gray-800">
            <thead className="bg-gray-100 border-b-2 border-gray-800">
              <tr>
                <th className={`py-3 px-4 font-bold text-gray-900 border border-gray-800 w-1/2 ${tableTextSize}`}>{t('printTemplate.item')}</th>
                <th className={`py-3 px-4 text-center font-bold text-gray-900 border border-gray-800 w-1/6 ${tableTextSize}`}>{t('printTemplate.qty')}</th>
                <th className={`py-3 px-4 text-center font-bold text-gray-900 border border-gray-800 w-1/6 ${tableTextSize}`}>{t('printTemplate.price')}</th>
                <th className={`py-3 px-4 text-left font-bold text-gray-900 border border-gray-800 w-1/6 ${tableTextSize}`}>{t('printTemplate.total')}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => {
                const qty       = Number(item.quantity);
                const unitPrice = Number(item.unit_price);
                const lineTotal = qty * unitPrice;
                return (
                  <tr key={idx} className="bg-white hover:bg-gray-50 transition-colors">
                    <td className={`py-3 px-4 font-bold text-gray-900 border border-gray-300 ${tableTextSize}`}>{item.product_name || item.name || `#${item.batch_id}`}</td>
                    <td className={`py-3 px-4 text-center font-mono font-semibold text-gray-800 border border-gray-300 ${tableTextSize}`} dir="ltr">{qty}</td>
                    <td className={`py-3 px-4 text-center font-mono font-semibold text-gray-800 border border-gray-300 ${tableTextSize}`} dir="ltr">{fmt(unitPrice)}</td>
                    <td className={`py-3 px-4 text-left font-mono font-bold text-gray-900 border border-gray-300 ${tableTextSize}`} dir="ltr">{fmt(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Footer */}
        <div className="flex flex-col gap-6 mt-auto">
          <div className="flex w-full">
            {/* The totals box, pushed to the left using margin-right auto since direction is RTL */}
            <div className="w-1/2 mr-auto bg-gray-50 rounded-xl p-5 border-2 border-gray-800 shadow-sm">
              <div className="flex justify-between mb-3 border-b border-gray-200 pb-2">
                <span className="text-gray-700 font-bold">{t('printTemplate.itemsTotal')}:</span>
                <span className="font-mono font-bold text-gray-900" dir="ltr">{fmt(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between mb-3 border-b border-gray-200 pb-2">
                  <span className="text-gray-700 font-bold">{t('printTemplate.deliveryFee')}:</span>
                  <span className="font-mono font-bold text-gray-900" dir="ltr">{fmt(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b-2 border-gray-800 mb-2">
                <span className={`font-black ${isA5 ? 'text-lg' : 'text-xl'} text-gray-900`}>{t('printTemplate.grandTotal')}:</span>
                <span className={`font-mono font-black ${isA5 ? 'text-lg' : 'text-xl'} text-gray-900`} dir="ltr">EGP {fmt(total)}</span>
              </div>

              {/* Previous Balance Logic */}
              <div className="flex justify-between items-center py-2 border-b border-gray-200">
                <span className="font-bold text-gray-600">{t('printTemplate.previousBalance')}:</span>
                <span className="font-mono font-bold text-gray-700" dir="ltr">EGP {fmt(previousBalance)}</span>
              </div>
              <div className="flex justify-between items-center py-3 mt-2 bg-gray-800 text-white rounded-lg px-4 shadow-inner">
                <span className={`font-black ${isA5 ? 'text-lg' : 'text-xl'}`}>{t('printTemplate.totalAccount')}:</span>
                <span className={`font-mono font-black ${isA5 ? 'text-lg' : 'text-xl'}`} dir="ltr">EGP {fmt(totalBalanceAfter)}</span>
              </div>
            </div>
          </div>

          <div className="text-center w-full mt-4 border-t-2 border-dashed border-gray-300 pt-6">
            {footerText ? (
              <p className="font-bold text-gray-800 whitespace-pre-wrap leading-relaxed text-lg">{footerText}</p>
            ) : (
              <p className="font-bold text-gray-500 text-lg">
                {t('printTemplate.thankYou')}
              </p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

