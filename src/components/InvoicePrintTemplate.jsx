import { Building2 } from 'lucide-react';

// ── Paper size config ────────────────────────────────────────────────────────
const PAPER = {
  a4:      { width: '210mm', minHeight: '297mm', px: '40px', pt: '40px', pb: '24px', fontSize: '14px' },
  a5:      { width: '148mm', minHeight: '210mm', px: '28px', pt: '28px', pb: '18px', fontSize: '12px' },
  receipt: { width: '80mm',  minHeight: '0',     px: '12px', pt: '16px', pb: '12px', fontSize: '11px' },
};

const fmt = (n, digits = 2) =>
  Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits });

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
  paperSize = 'a4',
}) {
  if (!invoice) return null;

  const cfg        = PAPER[paperSize] || PAPER.a4;
  const isReceipt  = paperSize === 'receipt';
  const isA5       = paperSize === 'a5';
  const isSale     = ['sale', 'SALE'].includes(invoice.invoice_type);
  const isReturn   = ['sale_return', 'purchase_return', 'SALE_RETURN', 'PURCHASE_RETURN'].includes(invoice.invoice_type);

  const invoiceDate   = new Date(invoice.created_at).toLocaleDateString('ar-EG', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const invoiceNumber = String(invoice.id).padStart(5, '0');
  const total         = Number(invoice.total_amount   || 0);
  const paid          = Number(invoice.paid_amount    || 0);
  const balance       = Number(invoice.balance        ?? (total - paid));
  const prevBalance   = Number(invoice.previous_balance ?? 0);
  const totalAfter    = Number(invoice.total_balance_after ?? balance);
  const deliveryFee   = Number(invoice.delivery_fee   || 0);
  const subtotal      = total - deliveryFee;
  const footerText    = invoice.footer_custom_text || defaultFooterText || null;
  const resolvedLogo  = resolveLogoUrl(logoUrl);

  // Badge colours
  const badgeBg    = isReturn ? '#fef2f2' : isSale ? '#f0fdf4' : '#eff6ff';
  const badgeColor = isReturn ? '#dc2626' : isSale ? '#16a34a' : '#2563eb';
  const badgeBorder= isReturn ? '#fecaca' : isSale ? '#bbf7d0' : '#bfdbfe';
  const badgeLabel = isReturn ? 'إشعار مرتجع' : isSale ? 'فاتورة بيع' : 'فاتورة شراء';

  const logoSize = isReceipt ? '60px' : isA5 ? '86px' : '110px';

  return (
    <div
      id="invoice-print-area"
      style={{
        width: cfg.width,
        minHeight: cfg.minHeight,
        backgroundColor: '#ffffff',
        color: '#111827',
        fontFamily: "'Tajawal', 'Cairo', 'Inter', sans-serif",
        fontSize: cfg.fontSize,
        direction: 'rtl',
        margin: '0 auto',
        printColorAdjust: 'exact',
        WebkitPrintColorAdjust: 'exact',
        pageBreakAfter: 'always',
      }}
    >
      <div style={{ padding: `${cfg.pt} ${cfg.px} ${cfg.pb}` }}>

        {/* ════════════════════ HEADER ════════════════════ */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: isReceipt ? '12px' : '20px',
          paddingBottom: isReceipt ? '12px' : '20px',
          borderBottom: isReceipt ? '1px dashed #9ca3af' : '2px solid #e5e7eb',
        }}>
          {/* Right: party info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <p style={{ margin: 0, fontSize: isReceipt ? '11px' : '12px', color: '#9ca3af', fontWeight: 500, letterSpacing: '0.03em' }}>
              فاتورة باسم
            </p>
            <p style={{ margin: 0, fontSize: isReceipt ? '15px' : isA5 ? '18px' : '22px', fontWeight: 800, color: '#111827' }}>
              Dr. / {partyName || 'نقدي'}
            </p>
            {partyPhone && (
              <p style={{ margin: 0, fontSize: isReceipt ? '11px' : '12px', color: '#6b7280' }}>
                هاتف: <span dir="ltr">{partyPhone}</span>
              </p>
            )}
            {partyAddress && (
              <p style={{ margin: 0, fontSize: isReceipt ? '11px' : '12px', color: '#6b7280' }}>
                عنوان: {partyAddress}
              </p>
            )}
          </div>

          {/* Left: Logo block — logo centered above company name + date */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
            minWidth: isReceipt ? '90px' : isA5 ? '140px' : '170px',
          }}>
            {resolvedLogo ? (
              <img
                src={resolvedLogo}
                alt="Logo"
                style={{
                  height: isReceipt ? '64px' : isA5 ? '90px' : '110px',
                  width: 'auto',
                  maxWidth: isReceipt ? '110px' : isA5 ? '160px' : '200px',
                  objectFit: 'contain',
                  display: 'block',
                  printColorAdjust: 'exact',
                  WebkitPrintColorAdjust: 'exact',
                }}
              />
            ) : (
              <div style={{
                width: isReceipt ? '64px' : isA5 ? '90px' : '110px',
                height: isReceipt ? '64px' : isA5 ? '90px' : '110px',
                borderRadius: '14px',
                backgroundColor: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                printColorAdjust: 'exact',
                WebkitPrintColorAdjust: 'exact',
              }}>
                <Building2 size={isReceipt ? 26 : 42} color="#ffffff" strokeWidth={1.5} />
              </div>
            )}
            {tenantName && (
              <p style={{
                margin: 0,
                fontSize: isReceipt ? '11px' : '13px',
                fontWeight: 700,
                color: '#1e293b',
                textAlign: 'center',
              }}>
                {tenantName}
              </p>
            )}
            <p style={{
              margin: 0,
              fontSize: isReceipt ? '11px' : '13px',
              fontWeight: 600,
              color: '#374151',
              textAlign: 'center',
              direction: 'ltr',
            }}>
              {invoiceDate}
            </p>
          </div>

        </div>

        {/* ════════════════════ BADGE ════════════════════ */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: isReceipt ? '10px' : '18px' }}>
          <div style={{
            padding: isReceipt ? '3px 12px' : '5px 20px',
            borderRadius: '999px',
            backgroundColor: badgeBg,
            color: badgeColor,
            border: `1px solid ${badgeBorder}`,
            fontWeight: 700,
            fontSize: isReceipt ? '11px' : '13px',
            printColorAdjust: 'exact',
            WebkitPrintColorAdjust: 'exact',
          }}>
            {badgeLabel} — #{invoiceNumber}
          </div>
        </div>

        {/* ════════════════════ ITEMS TABLE ════════════════════ */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '14px', fontSize: isReceipt ? '11px' : 'inherit' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8fafc', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
              {!isReceipt && (
                <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #d1d5db', width: '28px' }}>#</th>
              )}
              <th style={{ padding: '8px 6px', textAlign: 'right', fontWeight: 700, color: '#374151', borderBottom: '2px solid #d1d5db' }}>الصنف</th>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #d1d5db', width: '50px' }}>كمية</th>
              <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #d1d5db', width: '70px' }}>سعر</th>
              {!isReceipt && (
                <th style={{ padding: '8px 6px', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '2px solid #d1d5db', width: '80px' }}>إجمالي</th>
              )}
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item, idx) => {
              const qty       = Number(item.quantity);
              const unitPrice = Number(item.unit_price);
              const lineTotal = qty * unitPrice;
              return (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', breakInside: 'avoid' }}>
                  {!isReceipt && (
                    <td style={{ padding: '7px 6px', color: '#9ca3af', fontFamily: 'monospace', textAlign: 'center' }}>{idx + 1}</td>
                  )}
                  <td style={{ padding: '7px 6px', fontWeight: 600, color: '#1f2937' }}>
                    {item.product_name || item.name || `#${item.batch_id}`}
                  </td>
                  <td style={{ padding: '7px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#374151' }} dir="ltr">{qty}</td>
                  <td style={{ padding: '7px 6px', textAlign: 'center', fontFamily: 'monospace', color: '#374151' }} dir="ltr">{fmt(unitPrice)}</td>
                  {!isReceipt && (
                    <td style={{ padding: '7px 6px', textAlign: 'center', fontFamily: 'monospace', fontWeight: 700, color: '#111827' }} dir="ltr">{fmt(lineTotal)}</td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* ════════════════════ TOTALS BLOCK ════════════════════ */}
        <div style={{
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          marginBottom: '16px',
          printColorAdjust: 'exact',
          WebkitPrintColorAdjust: 'exact',
        }}>
          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', backgroundColor: '#f8fafc' }}>
            <span style={{ fontWeight: 600, color: '#374151' }}>إجمالي الأصناف</span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#111827' }} dir="ltr">EGP {fmt(subtotal)}</span>
          </div>

          {/* Delivery */}
          {deliveryFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 14px', borderTop: '1px solid #e5e7eb' }}>
              <span style={{ color: '#6b7280' }}>رسوم التوصيل</span>
              <span style={{ fontFamily: 'monospace', color: '#374151' }} dir="ltr">{fmt(deliveryFee)}</span>
            </div>
          )}

          {/* Grand total */}
          {deliveryFee > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderTop: '1px solid #e5e7eb', backgroundColor: '#f1f5f9' }}>
              <span style={{ fontWeight: 700, color: '#111827' }}>الإجمالي الكلي</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '15px', color: '#111827' }} dir="ltr">EGP {fmt(total)}</span>
            </div>
          )}

          {/* Paid */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '10px 14px', borderTop: '1px solid #e5e7eb',
            backgroundColor: paid >= total ? '#f0fdf4' : '#fefce8',
            printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
          }}>
            <span style={{ fontWeight: 600, color: paid >= total ? '#15803d' : '#92400e' }}>
              المدفوع
            </span>
            <span style={{ fontFamily: 'monospace', fontWeight: 700, color: paid >= total ? '#15803d' : '#92400e' }} dir="ltr">
              EGP {fmt(paid)}
            </span>
          </div>

          {/* Remaining balance */}
          {balance > 0 && (
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderTop: '1px solid #e5e7eb',
              backgroundColor: '#fef2f2',
              printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
            }}>
              <span style={{ fontWeight: 700, color: '#dc2626' }}>المتبقي</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: '#dc2626' }} dir="ltr">
                EGP {fmt(balance)}
              </span>
            </div>
          )}
        </div>

        {/* ════════════════════ FINANCIAL SUMMARY ════════════════════ */}
        {!isReceipt && (
          <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '2px solid #e5e7eb' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
              {/* Previous balance */}
              <div style={{
                textAlign: 'center', padding: '10px', borderRadius: '8px',
                backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
                printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
              }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>الرصيد السابق</p>
                <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700, color: '#374151' }} dir="ltr">
                  {fmt(prevBalance)}
                </p>
              </div>
              {/* Invoice total */}
              <div style={{
                textAlign: 'center', padding: '10px', borderRadius: '8px',
                backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
                printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
              }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#6b7280', fontWeight: 600 }}>إجمالي الفاتورة</p>
                <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700, color: '#374151' }} dir="ltr">
                  {fmt(total)}
                </p>
              </div>
              {/* Total outstanding */}
              <div style={{
                textAlign: 'center', padding: '10px', borderRadius: '8px',
                backgroundColor: totalAfter > 0 ? '#1e293b' : '#14532d',
                printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
              }}>
                <p style={{ margin: '0 0 4px 0', fontSize: '11px', color: '#9ca3af', fontWeight: 600 }}>
                  {totalAfter > 0 ? 'الرصيد المستحق' : 'مسدد بالكامل'}
                </p>
                <p style={{ margin: 0, fontFamily: 'monospace', fontWeight: 700, color: '#ffffff', fontSize: '15px' }} dir="ltr">
                  EGP {fmt(totalAfter)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Receipt: simple outstanding */}
        {isReceipt && totalAfter > 0 && (
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '8px 10px', borderRadius: '6px', marginTop: '8px',
            backgroundColor: '#1e293b', printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
          }}>
            <span style={{ color: '#d1d5db', fontSize: '11px', fontWeight: 600 }}>الرصيد المستحق</span>
            <span style={{ color: '#ffffff', fontFamily: 'monospace', fontWeight: 700 }} dir="ltr">EGP {fmt(totalAfter)}</span>
          </div>
        )}

        {/* ════════════════════ FOOTER ════════════════════ */}
        <div style={{ marginTop: isReceipt ? '14px' : '22px', paddingTop: '12px', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
          {taxNumber && (
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '5px 14px', borderRadius: '6px', marginBottom: '10px',
              backgroundColor: '#f1f5f9', border: '1px solid #e2e8f0',
              printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact',
            }}>
              <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>رقم الحساب / الضريبي:</span>
              <span style={{ fontSize: '13px', color: '#1e293b', fontWeight: 700, fontFamily: 'monospace' }} dir="ltr">{taxNumber}</span>
            </div>
          )}
          {footerText && (
            <p style={{ margin: '0 0 6px 0', fontSize: isReceipt ? '11px' : '13px', fontWeight: 600, color: '#374151', lineHeight: 1.6 }} dir="auto">
              {footerText}
            </p>
          )}
          <p style={{ margin: 0, fontSize: '10px', color: '#9ca3af' }}>
            شكراً لتعاملكم معنا — هذه الوثيقة منشأة آلياً
          </p>
        </div>

      </div>
    </div>
  );
}
