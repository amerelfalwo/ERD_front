import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';

// Register Arabic font
Font.register({
  family: 'Tajawal',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1lzaBCw.ttf', fontWeight: 'normal' },
    { src: 'https://fonts.gstatic.com/s/tajawal/v9/Iurn6YBj_oCad4k1l0qxPwj8D8Y.ttf', fontWeight: 'bold' }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Tajawal',
    fontSize: 10,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#eeeeee',
    paddingBottom: 20,
  },
  headerLeft: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    width: '50%',
  },
  headerRight: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    width: '50%',
  },
  logo: {
    width: 100,
    height: 60,
    objectFit: 'contain',
    marginBottom: 10,
  },
  companyName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  companyDetails: {
    fontSize: 10,
    color: '#666666',
    marginBottom: 2,
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0ea5e9',
    marginBottom: 10,
  },
  invoiceInfoBox: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  invoiceInfoRow: {
    flexDirection: 'row-reverse',
    marginBottom: 4,
  },
  invoiceInfoLabel: {
    width: 80,
    color: '#666666',
    fontWeight: 'bold',
  },
  invoiceInfoValue: {
    color: '#1a1a1a',
  },
  customerSection: {
    marginBottom: 30,
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    paddingBottom: 5,
    textAlign: 'right',
  },
  customerRow: {
    flexDirection: 'row-reverse',
    marginBottom: 6,
  },
  customerLabel: {
    width: 100,
    color: '#64748b',
    fontSize: 10,
    textAlign: 'right',
  },
  customerValue: {
    flex: 1,
    color: '#0f172a',
    fontSize: 10,
    fontWeight: 'bold',
    textAlign: 'right',
  },
  table: {
    width: '100%',
    marginBottom: 30,
  },
  tableHeader: {
    flexDirection: 'row-reverse',
    backgroundColor: '#0ea5e9',
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  tableHeaderCell: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 10,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row-reverse',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    padding: 8,
  },
  tableCell: {
    fontSize: 10,
    color: '#334155',
    textAlign: 'right',
  },
  col1: { width: '40%' },
  col2: { width: '20%' },
  col3: { width: '20%' },
  col4: { width: '20%' },
  totalsSection: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
    marginTop: 20,
  },
  totalsBox: {
    width: '50%',
    backgroundColor: '#f8fafc',
    padding: 15,
    borderRadius: 8,
  },
  totalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  totalLabel: {
    color: '#64748b',
    fontWeight: 'bold',
  },
  totalValue: {
    color: '#0f172a',
  },
  grandTotalRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#cbd5e1',
  },
  grandTotalLabel: {
    color: '#0ea5e9',
    fontWeight: 'bold',
    fontSize: 14,
  },
  grandTotalValue: {
    color: '#0ea5e9',
    fontWeight: 'bold',
    fontSize: 14,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: 9,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    paddingTop: 10,
  },
});

export default function InvoicePDF({
  invoice,
  tenantName,
  partyName,
  partyPhone,
  partyAddress,
  logoUrl,
  defaultFooterText,
  taxNumber
}) {
  const getInvoiceTitle = (type) => {
    switch (type) {
      case 'sell': return 'فاتورة مبيعات (ضريبية)';
      case 'purchase': return 'فاتورة مشتريات';
      case 'sell_return': return 'مرتجع مبيعات';
      case 'purchase_return': return 'مرتجع مشتريات';
      default: return 'فاتورة ضريبية';
    }
  };

  const isSale = ['sale', 'SALE'].includes(invoice?.invoice_type);
  let displayItems = invoice?.items || [];
  if (isSale) {
    const grouped = {};
    displayItems.forEach(item => {
      const name = item.product_name || item.batch?.product?.name || 'منتج';
      const price = Number(item.sell_price || item.unit_price || item.purchase_price || 0);
      const key = `${name}_${price}`;
      
      if (!grouped[key]) {
        grouped[key] = {
          ...item,
          product_name: name,
          quantity: Number(item.quantity) || 0,
          unit_price: price,
          sell_price: price
        };
      } else {
        grouped[key].quantity += (Number(item.quantity) || 0);
      }
    });
    displayItems = Object.values(grouped);
  }

  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      return format(new Date(dateString), 'PPP', { locale: ar });
    } catch {
      return dateString.split('T')[0];
    }
  };

  const formatCurrency = (amount) => {
    const val = Number(amount) || 0;
    return val.toLocaleString('ar-EG', { style: 'currency', currency: 'EGP' });
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            {logoUrl ? (
              <Image style={styles.logo} src={logoUrl} />
            ) : null}
            <Text style={styles.companyName}>{tenantName || 'اسم الشركة'}</Text>
            {taxNumber ? (
              <Text style={styles.companyDetails}>الرقم الضريبي: {taxNumber}</Text>
            ) : null}
          </View>
          <View style={styles.headerRight}>
            <Text style={styles.invoiceTitle}>{getInvoiceTitle(invoice?.invoice_type)}</Text>
            <View style={styles.invoiceInfoBox}>
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>رقم الفاتورة:</Text>
                <Text style={styles.invoiceInfoValue}>#{invoice?.id}</Text>
              </View>
              <View style={styles.invoiceInfoRow}>
                <Text style={styles.invoiceInfoLabel}>التاريخ:</Text>
                <Text style={styles.invoiceInfoValue}>{formatDate(invoice?.created_at)}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer / Party Section */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>
            {invoice?.invoice_type?.includes('purchase') ? 'بيانات المورد' : 'بيانات العميل'}
          </Text>
          <View style={styles.customerRow}>
            <Text style={styles.customerLabel}>الاسم:</Text>
            <Text style={styles.customerValue}>{partyName || 'عميل نقدي'}</Text>
          </View>
          {partyPhone ? (
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>رقم الهاتف:</Text>
              <Text style={styles.customerValue}>{partyPhone}</Text>
            </View>
          ) : null}
          {partyAddress ? (
            <View style={styles.customerRow}>
              <Text style={styles.customerLabel}>العنوان:</Text>
              <Text style={styles.customerValue}>{partyAddress}</Text>
            </View>
          ) : null}
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.col1]}>البيان</Text>
            <Text style={[styles.tableHeaderCell, styles.col2]}>الكمية</Text>
            <Text style={[styles.tableHeaderCell, styles.col3]}>السعر</Text>
            <Text style={[styles.tableHeaderCell, styles.col4]}>الإجمالي</Text>
          </View>
          {displayItems?.map((item, index) => {
            const itemName = item.product_name || item.batch?.product?.name || 'منتج';
            const price = item.sell_price || item.unit_price || item.purchase_price || 0;
            const total = Number(item.quantity) * Number(price);
            
            return (
              <View key={index} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.col1]}>{itemName}</Text>
                <Text style={[styles.tableCell, styles.col2]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.col3]}>{formatCurrency(price)}</Text>
                <Text style={[styles.tableCell, styles.col4]}>{formatCurrency(total)}</Text>
              </View>
            );
          })}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsSection}>
          <View style={styles.totalsBox}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>المجموع:</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice?.total_amount - (invoice?.delivery_fee || 0))}</Text>
            </View>
            {invoice?.delivery_fee > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>خدمة التوصيل:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice?.delivery_fee)}</Text>
              </View>
            )}
            <View style={styles.grandTotalRow}>
              <Text style={styles.grandTotalLabel}>الإجمالي الكلي:</Text>
              <Text style={styles.grandTotalValue}>{formatCurrency(invoice?.total_amount)}</Text>
            </View>
            {invoice?.paid_amount > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>المدفوع:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice?.paid_amount)}</Text>
              </View>
            )}
            {invoice?.balance > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>المتبقي:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice?.balance)}</Text>
              </View>
            )}
            {invoice?.previous_balance !== undefined && invoice?.previous_balance > 0 && (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>رصيد سابق:</Text>
                <Text style={styles.totalValue}>{formatCurrency(invoice?.previous_balance)}</Text>
              </View>
            )}
            {invoice?.total_balance_after !== undefined && invoice?.total_balance_after > 0 && (
              <View style={styles.grandTotalRow}>
                <Text style={styles.grandTotalLabel}>إجمالي الحساب:</Text>
                <Text style={styles.grandTotalValue}>{formatCurrency(invoice?.total_balance_after)}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Footer */}
        <Text style={styles.footer}>
          {invoice?.footer_custom_text || defaultFooterText || 'شكراً لتعاملكم معنا'}
        </Text>
      </Page>
    </Document>
  );
}
