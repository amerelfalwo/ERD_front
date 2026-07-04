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

  const isSell     = ['sell', 'SELL'].includes(invoice.invoice_type);
  const isReturn   = ['sell_return', 'SELL_RETURN', 'purchase_return', 'PURCHASE_RETURN'].includes(invoice.invoice_type);
  const isPurchase = ['purchase', 'PURCHASE'].includes(invoice.invoice_type);

  let displayItems = invoice.items || [];
  const grouped = {};
  displayItems.forEach(item => {
    const name = item.product_name || item.name || `#${item.batch_id}`;
    const key = name;
    const qty = Number(item.quantity) || 0;
    const price = Number(item.unit_price || 0);

    if (!grouped[key]) {
      grouped[key] = {
        ...item,
        product_name: name,
        quantity: qty,
        unit_price: price,
        _lineTotal: qty * price,
      };
    } else {
      grouped[key].quantity += qty;
      grouped[key]._lineTotal += qty * price;
    }
  });
  displayItems = Object.values(grouped);

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

  let formattedPartyName = partyName;
  if (partyName) {
    const trimmed = partyName.trim();
    const startsWithPrefix =
      trimmed.startsWith('د/') ||
      trimmed.toLowerCase().startsWith('dr.');
    if (!startsWithPrefix) {
      const prefix = t('printTemplate.doctorPrefix') || '';
      formattedPartyName = prefix ? `${prefix} ${trimmed}` : trimmed;
    } else {
      formattedPartyName = trimmed;
    }
  }

  const badgeLabel = isReturn
    ? t('printTemplate.returnNotice')
    : isPurchase
      ? t('printTemplate.purchaseInvoice')
      : t('printTemplate.saleInvoice');

  const isReceipt = paperSize === 'receipt' || paperSize === '80mm';
  const isA5 = paperSize === 'a5';

  if (isReceipt) {
    return (
      <div
        className="invoice-print-area max-w-[300px] w-[80mm] mx-auto bg-white text-gray-900 print:max-w-none print:w-full print:shadow-none print:m-0"
        style={{ direction: 'rtl', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', fontFamily: '"Readex Pro", sans-serif' }}
      >
        <div className="p-4 text-[12px] leading-relaxed flex flex-col min-h-full">
          <div className="grid grid-cols-3 items-start gap-2 mb-3">
            <div className="text-right text-[12px] flex flex-col">
              <p className="text-[10px] text-gray-600 font-mono mb-2">#{invoiceNumber}</p>
              <p className="font-bold text-gray-900">{formattedPartyName || t('printTemplate.cashCustomer')}</p>
              {partyPhone && <p className="font-mono text-[11px] text-gray-600 mt-0.5" style={{ direction: 'ltr', unicodeBidi: 'embed', textAlign: 'right' }}>{partyPhone}</p>}
            </div>
            <div className="text-center">
              <h1 className="text-sm font-black uppercase tracking-wide leading-tight">{badgeLabel}</h1>
            </div>
            <div className="flex flex-col items-end gap-0.5">
              {resolvedLogo ? (
                <img src={resolvedLogo} alt="Logo" className="w-10 h-10 object-contain grayscale" />
              ) : (
                <div className="w-9 h-9 rounded-full border-2 border-gray-800 flex items-center justify-center">
                  <Building2 size={16} className="text-gray-800" />
                </div>
              )}
              {tenantName && <p className="text-[11px] font-bold w-full text-left" dir="ltr">{tenantName}</p>}
              <p className="text-[10px] font-mono text-gray-500 w-full text-left" dir="ltr">{invoiceDate} · {invoiceTime}</p>
            </div>
          </div>

          <hr className="border-t-[1.5px] border-dashed border-gray-400 my-2" />

          <table className="w-full text-right mb-3 text-[11px] border-collapse">
            <thead>
              <tr className="border-y-[1.5px] border-dashed border-gray-800">
                <th className="py-1.5 px-1 font-bold text-right">{t('printTemplate.item')}</th>
                <th className="py-1.5 px-1 text-center font-bold">{t('printTemplate.price') || 'السعر'}</th>
                <th className="py-1.5 px-1 text-center font-bold">{t('printTemplate.qty')}</th>
                <th className="py-1.5 px-1 text-left font-bold">{t('printTemplate.total')}</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, idx) => (
                <tr key={idx} className="break-inside-avoid">
                  <td className="py-1.5 px-1 font-semibold text-right">{item.product_name}</td>
                  <td className="py-1.5 px-1 text-center font-mono" dir="ltr">{fmt(item.unit_price)}</td>
                  <td className="py-1.5 px-1 text-center font-mono" dir="ltr">{item.quantity}</td>
                  <td className="py-1.5 px-1 text-left font-mono font-bold" dir="ltr">{fmt(item._lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex flex-col space-y-1 mt-auto text-[12px] pt-4">
            <hr className="border-t-[1.5px] border-dashed border-gray-400 mb-2" />
            {deliveryFee > 0 && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('printTemplate.itemsTotal')}:</span>
                  <span className="font-mono" dir="ltr">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('printTemplate.deliveryFee')}:</span>
                  <span className="font-mono" dir="ltr">{fmt(deliveryFee)}</span>
                </div>
              </>
            )}
            <div className="flex justify-between items-center py-1.5 border-t-[1.5px] border-dashed border-gray-400">
              <span className="font-bold text-sm">{t('printTemplate.grandTotal')}:</span>
              <span className="font-mono font-bold text-sm" dir="ltr">EGP {fmt(total)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-700 text-[11px]">{t('printTemplate.paidAmount')}:</span>
              <span className="font-mono text-[11px] text-gray-700" dir="ltr">EGP {fmt(paid)}</span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <span className="text-gray-700 text-[11px]">{t('printTemplate.remainingAmount')}:</span>
              <span className="font-mono text-[11px] text-gray-700" dir="ltr">EGP {fmt(balance)}</span>
            </div>
            {previousBalance !== 0 && (
              <>
                <div className="flex justify-between items-center py-0.5 mt-1 border-t border-gray-300 pt-1">
                  <span className="text-[11px] text-gray-600">{t('printTemplate.previousBalance')}:</span>
                  <span className="font-mono text-[11px] text-gray-600" dir="ltr">EGP {fmt(previousBalance)}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 bg-gray-100 rounded px-1.5">
                  <span className="font-bold text-sm">{t('printTemplate.totalAccount')}:</span>
                  <span className="font-mono font-bold text-sm" dir="ltr">EGP {fmt(totalBalanceAfter)}</span>
                </div>
              </>
            )}

            <div className="text-center flex flex-col items-center mt-3 space-y-1.5 text-[11px] pt-2 border-t-[1.5px] border-dashed border-gray-400">
              {taxNumber && (
                <div className="border border-gray-300 px-2 py-1 rounded w-full flex justify-between">
                  <span className="text-gray-600 font-bold">{t('printTemplate.taxNumber')}:</span>
                  <span className="font-mono font-bold">{taxNumber}</span>
                </div>
              )}
              {footerText ? (
                <p className="font-bold text-gray-800 mt-1 whitespace-pre-wrap">{footerText}</p>
              ) : (
                <p className="text-[11px] font-bold text-gray-600 mt-2">
                  {t('printTemplate.thankYou')}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  const containerSizeClass = isA5 ? 'w-[148mm] min-h-[210mm] print:h-[210mm]' : 'w-[210mm] min-h-[297mm] print:h-[297mm]';
  const paddingClass       = isA5 ? 'p-6' : 'p-10';
  const baseTextSize       = isA5 ? 'text-sm' : 'text-base';
  const logoSizeClass      = isA5 ? 'w-16 h-16' : 'w-20 h-20';
  const iconSize           = isA5 ? 30 : 40;
  const titleTextSize      = isA5 ? 'text-lg' : 'text-2xl';
  const tableTextSize      = isA5 ? 'text-xs' : 'text-sm';

  return (
    <div
      className={`invoice-print-area ${containerSizeClass} mx-auto bg-white text-gray-900 print:max-w-none print:w-full print:shadow-none print:m-0`}
      style={{ direction: 'rtl', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact', fontFamily: '"Readex Pro", sans-serif' }}
    >
      <div className={`${paddingClass} ${baseTextSize} leading-relaxed flex flex-col h-full`}>
        <div className="grid grid-cols-3 items-start mb-6 pb-5 border-b-2 border-gray-800 gap-4">
          <div className="text-right flex flex-col pt-1">
            <p className="font-mono font-semibold text-gray-600 text-sm mb-6">#{invoiceNumber}</p>
            <p className={`font-bold text-gray-900 ${isA5 ? 'text-base' : 'text-lg'}`}>
              {formattedPartyName || t('printTemplate.cashCustomer')}
            </p>
            {partyPhone && (
              <p className="font-mono text-gray-600 text-sm mt-1" dir="ltr" style={{ textAlign: 'right' }}>{partyPhone}</p>
            )}
            {partyAddress && (
              <p className="text-gray-600 text-sm mt-0.5">{partyAddress}</p>
            )}
          </div>

          <div className="flex flex-col items-center justify-start text-center">
            <h2 className={`${titleTextSize} font-black text-gray-900 uppercase tracking-wide`}>{badgeLabel}</h2>
          </div>

          <div className="flex flex-col items-end gap-1">
            {resolvedLogo ? (
              <img src={resolvedLogo} alt="Logo" className={`${logoSizeClass} object-contain`} />
            ) : (
              <div className={`${logoSizeClass} rounded-xl bg-gray-800 flex items-center justify-center shadow-sm`}>
                <Building2 size={iconSize} className="text-white" />
              </div>
            )}
            {tenantName && <p className="font-bold text-gray-800 mt-1 w-full text-left" dir="ltr">{tenantName}</p>}
            <p className="font-mono text-gray-500 text-sm w-full text-left" dir="ltr">{invoiceDate} · {invoiceTime}</p>
          </div>
        </div>

        <div className="mb-6">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="border-y-2 border-gray-800">
                <th className={`py-3 px-3 font-bold text-gray-900 text-right ${tableTextSize}`}>{t('printTemplate.item')}</th>
                <th className={`py-3 px-3 text-center font-bold text-gray-900 ${tableTextSize}`}>{t('printTemplate.price') || 'السعر'}</th>
                <th className={`py-3 px-3 text-center font-bold text-gray-900 ${tableTextSize}`}>{t('printTemplate.qty')}</th>
                <th className={`py-3 px-3 text-left font-bold text-gray-900 ${tableTextSize}`}>{t('printTemplate.total')}</th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, idx) => (
                <tr key={idx}>
                  <td className={`py-3 px-3 font-semibold text-gray-900 text-right ${tableTextSize}`}>{item.product_name}</td>
                  <td className={`py-3 px-3 text-center font-mono text-gray-700 ${tableTextSize}`} dir="ltr">{fmt(item.unit_price)}</td>
                  <td className={`py-3 px-3 text-center font-mono text-gray-700 ${tableTextSize}`} dir="ltr">{item.quantity}</td>
                  <td className={`py-3 px-3 text-left font-mono font-bold text-gray-900 ${tableTextSize}`} dir="ltr">{fmt(item._lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col mt-auto w-full pt-8">
          <div className="flex w-full">
            <div className="w-1/2 mr-auto">
              <table className="w-full text-sm border-collapse">
                <tbody>
                  {deliveryFee > 0 && (
                    <>
                      <tr>
                        <td className="py-1.5 font-semibold text-gray-600">{t('printTemplate.itemsTotal')}</td>
                        <td className="py-1.5 text-left font-mono text-gray-800" dir="ltr">{fmt(subtotal)}</td>
                      </tr>
                      <tr className="border-b border-gray-200">
                        <td className="py-1.5 pb-2 font-semibold text-gray-600">{t('printTemplate.deliveryFee')}</td>
                        <td className="py-1.5 pb-2 text-left font-mono text-gray-800" dir="ltr">{fmt(deliveryFee)}</td>
                      </tr>
                    </>
                  )}
                  <tr className="border-b-2 border-gray-800">
                    <td className={`py-2.5 font-black text-gray-900 ${isA5 ? 'text-base' : 'text-lg'}`}>{t('printTemplate.grandTotal')}</td>
                    <td className={`py-2.5 text-left font-mono font-black text-gray-900 ${isA5 ? 'text-base' : 'text-lg'}`} dir="ltr">EGP {fmt(total)}</td>
                  </tr>
                  <tr>
                    <td className="py-1.5 pt-2 font-semibold text-gray-600">{t('printTemplate.paidAmount')}</td>
                    <td className="py-1.5 pt-2 text-left font-mono text-gray-700" dir="ltr">EGP {fmt(paid)}</td>
                  </tr>
                  <tr className={previousBalance !== 0 ? 'border-b border-gray-200' : ''}>
                    <td className="py-1.5 font-semibold text-gray-600">{t('printTemplate.remainingAmount')}</td>
                    <td className="py-1.5 text-left font-mono text-gray-700" dir="ltr">EGP {fmt(balance)}</td>
                  </tr>
                  {previousBalance !== 0 && (
                    <>
                      <tr>
                        <td className="py-1.5 pt-2 font-semibold text-gray-500">{t('printTemplate.previousBalance')}</td>
                        <td className="py-1.5 pt-2 text-left font-mono text-gray-500" dir="ltr">EGP {fmt(previousBalance)}</td>
                      </tr>
                      <tr>
                        <td colSpan={2} className="pt-2">
                          <div className="flex justify-between items-center py-2.5 bg-gray-800 text-white rounded-lg px-4">
                            <span className={`font-black ${isA5 ? 'text-base' : 'text-lg'}`}>{t('printTemplate.totalAccount')}</span>
                            <span className={`font-mono font-black ${isA5 ? 'text-base' : 'text-lg'}`} dir="ltr">EGP {fmt(totalBalanceAfter)}</span>
                          </div>
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-center w-full border-t-2 border-gray-800 mt-6 pt-4">
            {taxNumber && (
              <p className="text-gray-500 text-sm mb-2">
                {t('printTemplate.taxNumber')}: <span className="font-mono font-bold">{taxNumber}</span>
              </p>
            )}
            {footerText ? (
              <p className="font-semibold text-gray-700 whitespace-pre-wrap">{footerText}</p>
            ) : (
              <p className="font-semibold text-gray-500">
                {t('printTemplate.thankYou')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}