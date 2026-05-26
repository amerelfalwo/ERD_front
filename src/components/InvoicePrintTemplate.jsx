import { Building2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const formatNumber = (n, locale, digits = 2) =>
  Number(n || 0).toLocaleString(locale, { minimumFractionDigits: digits, maximumFractionDigits: digits });

const RAW_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

function resolveLogoUrl(url) {
  if (!url) return null;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  return `${RAW_BASE_URL}${url.startsWith('/') ? '' : '/'}${url}`;
}

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
  if (!invoice) return null;

  const { t, i18n } = useTranslation();
  const numberLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const dateLocale = i18n.language === 'ar' ? 'ar-EG' : 'en-US';
  const dir = i18n.language === 'ar' ? 'rtl' : 'ltr';
  const fmt = (n, digits = 2) => formatNumber(n, numberLocale, digits);

  const isSale     = ['sale', 'SALE'].includes(invoice.invoice_type);
  const isReturn   = ['sale_return', 'purchase_return', 'SALE_RETURN', 'PURCHASE_RETURN'].includes(invoice.invoice_type);

  const invoiceDate   = new Date(invoice.created_at).toLocaleDateString(dateLocale, { year: 'numeric', month: 'short', day: '2-digit' });

  const invoiceNumber = String(invoice.id).padStart(5, '0');
  
  const total         = Number(invoice.total_amount   || 0);
  const paid          = Number(invoice.paid_amount    || 0);
  const balance       = Number(invoice.balance        ?? (total - paid));
  const deliveryFee   = Number(invoice.delivery_fee   || 0);
  const subtotal      = total - deliveryFee;
  const previousBalance = Number(invoice.previous_balance || 0);
  const totalBalanceAfter = Number(invoice.total_balance_after ?? (balance + previousBalance));
  const footerText    = invoice.footer_custom_text || defaultFooterText || null;
  const resolvedLogo  = resolveLogoUrl(logoUrl);

  const badgeLabel = isReturn
    ? t('printTemplate.returnNotice')
    : isSale
      ? t('printTemplate.saleInvoice')
      : t('printTemplate.purchaseInvoice');

  const partyDisplayName = partyName || t('printTemplate.cashCustomer');
  const partyDisplay = partyName ? `${t('printTemplate.doctorPrefix')} ${partyName}` : partyDisplayName;

  const isReceipt = paperSize === 'receipt' || paperSize === '80mm';
  const isA5 = paperSize === 'a5';

  if (isReceipt) {
    return (
      <div
        className="invoice-print-area max-w-[300px] w-[80mm] mx-auto bg-white text-gray-900 print:max-w-none print:w-full print:shadow-none print:m-0"
        style={{ direction: dir, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', fontFamily: '"Readex Pro", sans-serif' }}
      >
        <div className="p-3 text-[12px] leading-relaxed">
          
          {/* Top Section */}
          <div className="flex flex-col items-center mb-4">
            {resolvedLogo ? (
              <img src={resolvedLogo} alt="Logo" className="w-16 h-16 rounded-full object-contain mb-2" style={{ mixBlendMode: 'multiply' }} />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-2">
                <Building2 size={28} className="text-white" />
              </div>
            )}
            
            <h1 className="text-xl font-bold text-center mb-1">{badgeLabel}</h1>
            {tenantName && <p className="text-sm font-semibold text-center mb-1">{tenantName}</p>}
            <p className="text-xs text-gray-600 text-center font-mono">#{invoiceNumber}</p>
          </div>

          <hr className="border-t border-dashed border-gray-400 my-2" />

          {/* Meta Section */}
          <div className="mb-4 text-[11px]">
            <div className="flex flex-col gap-y-1">
              <div className="flex items-baseline gap-x-1.5">
                <span className="font-semibold text-gray-500 shrink-0">{t('printTemplate.purchaseDate')}:</span>
                <span className="font-mono" dir="ltr">{invoiceDate}</span>
              </div>
              <div className="flex items-baseline gap-x-1.5">
                <span className="font-semibold text-gray-500 shrink-0">{t('printTemplate.billedTo')}:</span>
                <span className="font-bold">{partyDisplay}</span>
              </div>
              {partyPhone && (
                <div className="flex items-baseline gap-x-1.5">
                  <span className="font-semibold text-gray-500 shrink-0">{t('printTemplate.mobile')}:</span>
                  <span className="font-mono" style={{ direction: 'ltr', unicodeBidi: 'embed' }}>{partyPhone}</span>
                </div>
              )}
              {partyAddress && (
                <div className="flex items-baseline gap-x-1.5">
                  <span className="font-semibold text-gray-500 shrink-0">{t('printTemplate.addressLabel')}:</span>
                  <span className="break-words">{partyAddress}</span>
                </div>
              )}
            </div>
          </div>

          <hr className="border-t border-dashed border-gray-400 my-2" />

          {/* Items Table */}
          <table className="w-full text-right mb-4 text-[11px]">
            <thead>
              <tr className="border-b border-gray-300">
                <th className="py-1 px-1 font-bold">{t('printTemplate.item')}</th>
                <th className="py-1 px-1 text-center font-bold">{t('printTemplate.qty')}</th>
                <th className="py-1 px-1 text-center font-bold">{t('printTemplate.price')}</th>
                <th className="py-1 px-1 text-left font-bold">{t('printTemplate.total')}</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item, idx) => {
                const qty       = Number(item.quantity);
                const unitPrice = Number(item.unit_price);
                const lineTotal = qty * unitPrice;
                return (
                  <tr key={idx} className="border-b border-gray-100 last:border-b-0 break-inside-avoid">
                    <td className="py-1 px-1 font-semibold">{item.product_name || item.name || `#${item.batch_id}`}</td>
                    <td className="py-1 px-1 text-center font-mono" dir="ltr">{qty}</td>
                    <td className="py-1 px-1 text-center font-mono" dir="ltr">{fmt(unitPrice)}</td>
                    <td className="py-1 px-1 text-left font-mono font-bold" dir="ltr">{fmt(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <hr className="border-t border-dashed border-gray-400 my-2" />

          {/* Totals Section */}
          <div className="flex flex-col space-y-1 mb-4 text-[12px]">
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
            <div className="flex justify-between items-center py-1 mt-1 border-t border-gray-200">
              <span className="font-bold text-sm">{t('printTemplate.grandTotal')}:</span>
              <span className="font-mono font-bold text-sm" dir="ltr">{t('common.currency')} {fmt(total)}</span>
            </div>


            {previousBalance > 0 && (
              <>
                <div className="flex justify-between items-center py-1 mt-1 border-t border-gray-200">
                  <span className="font-bold text-xs text-gray-700">{t('printTemplate.previousBalance')}:</span>
                  <span className="font-mono font-bold text-xs text-gray-700" dir="ltr">{t('common.currency')} {fmt(previousBalance)}</span>
                </div>
                <div className="flex justify-between items-center py-1 mt-1 border-t border-gray-300 bg-gray-100 rounded px-1">
                  <span className="font-bold text-sm">{t('printTemplate.totalAccount')}:</span>
                  <span className="font-mono font-bold text-sm" dir="ltr">{t('common.currency')} {fmt(totalBalanceAfter)}</span>
                </div>
              </>
            )}
          </div>

          <hr className="border-t border-dashed border-gray-400 my-2" />

          {/* Footer */}
          <div className="text-center flex flex-col items-center mt-4 space-y-1 text-[11px]">
            {taxNumber && (
              <div className="bg-gray-100 px-2 py-1 rounded w-full flex justify-between">
                <span className="text-gray-600">{t('printTemplate.taxNumber')}:</span>
                <span className="font-mono font-bold">{taxNumber}</span>
              </div>
            )}
            {footerText ? (
              <p className="font-semibold text-gray-800 mt-2 whitespace-pre-wrap">{footerText}</p>
            ) : (
              <p className="text-[10px] text-gray-500 mt-4">
                {t('printTemplate.thankYou')}
              </p>
            )}
          </div>

        </div>
      </div>
    );
  }

  // --- A4 / A5 Layout ---
  const containerSizeClass = isA5 ? 'max-w-[148mm] w-[148mm]' : 'max-w-[210mm] w-[210mm]';
  const paddingClass       = isA5 ? 'p-6' : 'p-10';
  const baseTextSize       = isA5 ? 'text-sm' : 'text-base';
  const logoSizeClass      = isA5 ? 'w-20 h-20' : 'w-28 h-28';
  const iconSize           = isA5 ? 36 : 48;
  const titleTextSize      = isA5 ? 'text-lg' : 'text-xl';
  const tableTextSize      = isA5 ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`invoice-print-area ${containerSizeClass} mx-auto bg-white text-gray-900 print:max-w-none print:w-full print:shadow-none print:m-0`}
      style={{ direction: dir, printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', fontFamily: '"Readex Pro", sans-serif' }}
    >
      <div className={`${paddingClass} ${baseTextSize} leading-relaxed`}>
        
        {/* Header & Customer Info */}
        <div className="grid grid-cols-3 gap-4 items-start mb-6 border-b border-gray-200 pb-6">
          
          {/* Right: Customer Info & Invoice Number */}
          <div className="text-right">
            <p className="text-gray-500 mb-3">{t('printTemplate.invoiceNumber')}: <span className="font-mono font-semibold text-gray-800">#{invoiceNumber}</span></p>
            <div>
              <h3 className="font-bold text-gray-700 mb-1">{t('printTemplate.customerInfo')}:</h3>
              <p className="font-bold text-gray-800">{partyDisplay}</p>
              {partyPhone && <p className="font-mono text-gray-800 mt-1" dir="ltr">{partyPhone}</p>}
              {partyAddress && <p className="text-gray-800 mt-1 text-sm">{partyAddress}</p>}
            </div>
          </div>

          {/* Center: Invoice Type */}
          <div className="text-center flex flex-col items-center">
            <h2 className={`${titleTextSize} font-bold text-slate-800 mb-1`}>{badgeLabel}</h2>
            {taxNumber && <p className="text-gray-500 mt-1 text-sm">{t('printTemplate.taxNumber')}: <span className="font-mono">{taxNumber}</span></p>}
          </div>

          {/* Left: Logo & Date */}
          <div className="text-left flex flex-col items-end">
            {resolvedLogo ? (
              <img src={resolvedLogo} alt="Logo" className={`${logoSizeClass} rounded-lg object-contain mb-2`} style={{ mixBlendMode: 'multiply' }} />
            ) : (
              <div className={`${logoSizeClass} rounded-lg bg-slate-800 flex items-center justify-center mb-2`}>
                <Building2 size={iconSize} className="text-white" />
              </div>
            )}
            <p className="text-gray-500 text-sm"><span className="font-mono text-gray-800">{invoiceDate}</span></p>

          </div>
          
        </div>

        {/* Items Table */}
        <div className="mb-6 rounded-lg overflow-hidden border border-gray-200">
          <table className="w-full text-right">
            <thead className="bg-slate-50 border-b border-gray-200">
              <tr>
                <th className={`py-3 px-4 font-bold text-gray-700 w-1/2 ${tableTextSize}`}>{t('printTemplate.item')}</th>
                <th className={`py-3 px-4 text-center font-bold text-gray-700 w-1/6 ${tableTextSize}`}>{t('printTemplate.qty')}</th>
                <th className={`py-3 px-4 text-center font-bold text-gray-700 w-1/6 ${tableTextSize}`}>{t('printTemplate.price')}</th>
                <th className={`py-3 px-4 text-left font-bold text-gray-700 w-1/6 ${tableTextSize}`}>{t('printTemplate.total')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoice.items.map((item, idx) => {
                const qty       = Number(item.quantity);
                const unitPrice = Number(item.unit_price);
                const lineTotal = qty * unitPrice;
                return (
                  <tr key={idx} className="bg-white">
                    <td className={`py-3 px-4 font-semibold text-gray-800 ${tableTextSize}`}>{item.product_name || item.name || `#${item.batch_id}`}</td>
                    <td className={`py-3 px-4 text-center font-mono text-gray-600 ${tableTextSize}`} dir="ltr">{qty}</td>
                    <td className={`py-3 px-4 text-center font-mono text-gray-600 ${tableTextSize}`} dir="ltr">{fmt(unitPrice)}</td>
                    <td className={`py-3 px-4 text-left font-mono font-bold text-gray-800 ${tableTextSize}`} dir="ltr">{fmt(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Totals & Footer */}
        <div className="flex flex-col gap-6">
          <div className="flex w-full">
            <div className="w-1/2 mr-auto bg-slate-50 rounded-lg p-4 border border-gray-200">
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">{t('printTemplate.itemsTotal')}:</span>
                <span className="font-mono font-semibold" dir="ltr">{fmt(subtotal)}</span>
              </div>
              {deliveryFee > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">{t('printTemplate.deliveryFee')}:</span>
                  <span className="font-mono font-semibold" dir="ltr">{fmt(deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-t border-gray-200 mt-2">
                <span className={`font-bold ${isA5 ? 'text-lg' : 'text-xl'} text-slate-800`}>{t('printTemplate.grandTotal')}:</span>
                <span className={`font-mono font-bold ${isA5 ? 'text-lg' : 'text-xl'} text-slate-800`} dir="ltr">{t('common.currency')} {fmt(total)}</span>
              </div>




              {/* Previous Balance Logic */}
              {previousBalance > 0 && (
                <>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200 mt-2">
                    <span className="font-bold text-gray-700">{t('printTemplate.previousBalance')}:</span>
                    <span className="font-mono font-bold text-gray-700" dir="ltr">{t('common.currency')} {fmt(previousBalance)}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-t border-gray-200 mt-2 bg-gray-100 rounded px-2">
                    <span className={`font-bold ${isA5 ? 'text-lg' : 'text-xl'} text-slate-900`}>{t('printTemplate.totalAccount')}:</span>
                    <span className={`font-mono font-bold ${isA5 ? 'text-lg' : 'text-xl'} text-slate-900`} dir="ltr">{t('common.currency')} {fmt(totalBalanceAfter)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="text-center w-full mt-4">
            {footerText && (
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100 mb-4 inline-block min-w-[50%]">
                <p className="font-semibold text-gray-700 whitespace-pre-wrap leading-relaxed">{footerText}</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
