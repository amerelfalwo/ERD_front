import React from 'react';
import { useTranslation } from 'react-i18next';
import { calculateInvoiceTotals } from '../../utils/calculateInvoiceTotals';
import { formatInvoiceDate, formatInvoiceData } from '../../services/invoiceService';
import { useAuth } from '../../context/AuthContext';
import { getLogoUrl } from '../../utils/url';
import styles from './InvoiceDocument.module.css';

/**
 * Doctor M Style Invoice Document Component supporting A4, A5, and Thermal Receipt sizes.
 *
 * @param {import('./invoice.types').InvoiceDocumentProps & { paperSize?: string }} props
 */
export const InvoiceDocument = ({
  data: initialData,
  invoice,
  tenantName,
  partyName,
  partyPhone,
  partyAddress,
  logoUrl,
  defaultFooterText,
  website,
  taxNumber,
  paperSize = 'a4',
  className = '',
  showPrintButton = false,
}) => {
  const { t } = useTranslation();
  const { user } = useAuth();

  let data = initialData;

  if (!data && invoice) {
    const tenantWebsite = website || user?.tenant?.website || invoice?.website || invoice?.tenant?.website || '';
    data = formatInvoiceData({
      ...invoice,
      party_name: partyName || invoice.party_name,
      party_phone: partyPhone || invoice.party_phone,
      party_address: partyAddress || invoice.party_address,
      tenant_name: tenantName || invoice.tenant_name || user?.tenant?.company_name,
      tenant_logo_url: getLogoUrl(logoUrl) || invoice.tenant_logo_url || getLogoUrl(user?.tenant?.logo_url),
      website: tenantWebsite,
      footer_custom_text: invoice.footer_custom_text || defaultFooterText,
    });
  }

  if (!data) {
    return (
      <div className={`${styles.invoiceContainer} ${className}`}>
        <p style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
          {t('invoice.no_data', 'No invoice data available')}
        </p>
      </div>
    );
  }

  // Normalize paper size
  const normSize = String(paperSize).toLowerCase();
  const isReceipt = normSize === 'receipt' || normSize === '80mm' || normSize === '57mm';
  const isA5 = normSize === 'a5';

  let sizeClass = styles.sizeA4;
  if (isA5) sizeClass = styles.sizeA5;
  if (isReceipt) sizeClass = styles.sizeReceipt;

  // Extract props
  const {
    id,
    invoiceNumber = id ? `#${String(id).padStart(5, '0')}` : '',
    invoiceType = 'SALE',
    partyName: dataPartyName = '',
    date = '',
    items = [],
    deliveryFee = data.deliveryFee ?? data.delivery_fee ?? 0,
    discountAmount = data.discountAmount ?? data.discount_amount ?? data.total_discount ?? 0,
    tenantName: dataTenantName = 'DOCTOR M - Dental Supplies',
    tenantLogoUrl = '',
    website: dataWebsite = '',
    footerCustomText = '',
  } = data;

  // Calculate totals
  const totals = calculateInvoiceTotals(items, deliveryFee, discountAmount);
  const itemsTotal = data.itemsTotal ?? totals.itemsTotal;
  const grandTotal = data.grandTotal ?? totals.grandTotal;

  // Determine invoice type title
  const normalizedType = String(invoiceType).toUpperCase();
  let typeWord = 'Sell';
  if (normalizedType === 'PURCHASE') {
    typeWord = 'Purchase';
  } else if (normalizedType === 'RETURN') {
    typeWord = 'Return';
  }

  // Format currency
  const fmtMoney = (val) => {
    const num = Number(val) || 0;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`${styles.invoiceContainer} ${sizeClass} ${className} invoice-print-area`} dir="ltr">
      {showPrintButton && (
        <div className={styles.noPrint} style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
          <button
            onClick={handlePrint}
            style={{
              padding: '0.4rem 1rem',
              backgroundColor: '#000000',
              color: '#ffffff',
              border: 'none',
              borderRadius: '0.25rem',
              cursor: 'pointer',
              fontWeight: '700',
              fontSize: '0.875rem',
            }}
          >
            🖨️ {t('invoice.print', 'Print Invoice')}
          </button>
        </div>
      )}

      {/* Header Section (Stacked layout for Receipt size to prevent text collisions) */}
      <header className={isReceipt ? styles.headerReceipt : styles.header}>
        <div className={styles.headerLeft}>
          {tenantLogoUrl && (
            <img src={tenantLogoUrl} alt="Logo" className={styles.tenantLogo} />
          )}
          <h1 className={styles.tenantName}>{dataTenantName}</h1>
          <p className={styles.headerDate}>{formatInvoiceDate(date)}</p>
        </div>

        <div className={styles.headerCenter}>
          <h2 className={styles.titleType}>{typeWord}</h2>
          <h2 className={styles.titleInvoice}>INVOICE</h2>
        </div>

        <div className={styles.headerRight}>
          <div className={styles.invoiceNumber}>{invoiceNumber}</div>
          {dataPartyName && <p className={styles.partyName}>{dataPartyName}</p>}
        </div>
      </header>

      {/* Items Table */}
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.colTotal}>{t('invoice.total', 'Total')}</th>
            <th className={styles.colQty}>{t('invoice.qty', 'Qty')}</th>
            <th className={styles.colPrice}>{t('invoice.price', 'Price')}</th>
            <th className={styles.colItem}>{t('invoice.item', 'Item')}</th>
          </tr>
        </thead>
        <tbody>
          {items.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ textAlign: 'center', color: '#6b7280', padding: '1.5rem' }}>
                No items in this invoice
              </td>
            </tr>
          ) : (
            items.map((item, idx) => {
              const qty = Number(item.qty ?? item.quantity ?? 0);
              const price = Number(item.price ?? item.unit_price ?? item.sell_price ?? item.purchase_price ?? 0);
              const total = item.total ?? (qty * price);

              return (
                <tr key={item.id || idx} className={styles.itemRow}>
                  <td className={styles.tdTotal}>{fmtMoney(total)}</td>
                  <td className={styles.tdQty}>{qty}</td>
                  <td className={styles.tdPrice}>{fmtMoney(price)}</td>
                  <td className={styles.tdItem}>{item.name}</td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>

      {/* Totals Section */}
      <section className={styles.totalsSection}>
        <table className={styles.totalsTable}>
          <tbody>
            <tr>
              <td className={styles.amountCol}>{fmtMoney(itemsTotal)}</td>
              <td className={styles.labelCol}>{t('invoice.items_total', 'Items Total')}</td>
            </tr>

            {totals.discountAmount > 0 && (
              <tr>
                <td className={styles.amountCol}>-{fmtMoney(totals.discountAmount)}</td>
                <td className={styles.labelCol}>Discount</td>
              </tr>
            )}

            <tr>
              <td className={styles.amountCol}>
                {fmtMoney(totals.deliveryFee)}
              </td>
              <td className={styles.labelCol}>{t('invoice.delivery_fee', 'Delivery Fee')}</td>
            </tr>

            <tr className={styles.grandTotalRow}>
              <td className={styles.amountCol}>EGP {fmtMoney(grandTotal)}</td>
              <td className={styles.labelCol}>{t('invoice.grand_total', 'Grand Total')}</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Solid Black Divider */}
      <hr className={styles.dividerBottom} />

      {/* Footer Section */}
      {(() => {
        const displayWebsite = dataWebsite || website || data?.website || user?.tenant?.website || '';
        const displayTenantName = dataTenantName || tenantName || user?.tenant?.company_name || 'DOCTOR M';
        const displayFooterText = footerCustomText || data?.footerCustomText || data?.footer_custom_text || '';

        return (
          <footer className={styles.footerBox}>
            <h3 className={styles.thankYouText}>
              {displayFooterText || `Thank You For Choosing ${String(displayTenantName).split('-')[0].trim()}`}
            </h3>
            {displayWebsite && (
              <a
                href={displayWebsite.startsWith('http://') || displayWebsite.startsWith('https://') ? displayWebsite : `https://${displayWebsite}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.websiteLink}
              >
                {displayWebsite}
              </a>
            )}
          </footer>
        );
      })()}
    </div>
  );
};

export default InvoiceDocument;
