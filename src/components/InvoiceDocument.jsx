import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

// Register Arabic font
Font.register({
  family: 'Tajawal',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/tajawal/v9/Iura6YBj_oCad4k1nzSBC45I.ttf', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/tajawal/v9/IurZ6YBj_oCad4k1l-q8P6F77B0.ttf', fontWeight: 700 }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Tajawal',
    fontSize: 12,
    color: '#333'
  },
  header: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    paddingBottom: 10
  },
  logo: {
    width: 80,
    height: 80,
    objectFit: 'contain'
  },
  companyInfo: {
    textAlign: 'right'
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    marginBottom: 5
  },
  titleInfo: {
    textAlign: 'left'
  },
  invoiceTitle: {
    fontSize: 24,
    fontWeight: 700,
    color: '#1e3a8a',
    marginBottom: 5
  },
  partyInfoContainer: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    marginBottom: 20,
    padding: 10,
    backgroundColor: '#f9fafb',
    borderRadius: 5
  },
  partyInfo: {
    textAlign: 'right'
  },
  sectionTitle: {
    fontWeight: 700,
    marginBottom: 5,
    color: '#4b5563'
  },
  table: {
    display: 'table',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginBottom: 20
  },
  tableRow: {
    flexDirection: 'row-reverse',
  },
  tableHeader: {
    backgroundColor: '#f3f4f6',
    fontWeight: 700,
  },
  tableCol: {
    width: '25%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    textAlign: 'right'
  },
  tableColDescription: {
    width: '50%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    textAlign: 'right'
  },
  tableColNum: {
    width: '12.5%',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderLeftWidth: 0,
    borderTopWidth: 0,
    padding: 5,
    textAlign: 'right'
  },
  totalsContainer: {
    flexDirection: 'row', // keeps it LTR so totals align to the left
    justifyContent: 'flex-start',
    marginBottom: 30
  },
  totalsTable: {
    width: '50%',
  },
  totalsRow: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6'
  },
  totalsRowBold: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    paddingVertical: 5,
    fontWeight: 700,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb'
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    textAlign: 'center',
    color: '#6b7280',
    fontSize: 10,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 10
  }
});

const InvoiceDocument = ({ 
  invoice, 
  tenantName, 
  partyName, 
  partyPhone, 
  partyAddress, 
  logoUrl, 
  defaultFooterText, 
  taxNumber 
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('ar-EG');
  };

  const formatCurrency = (amount) => {
    if (amount === undefined || amount === null) return '0.00';
    return Number(amount).toFixed(2);
  };

  const isSale = invoice?.invoice_type === 'sale';
  const invoiceTypeName = isSale ? 'فاتورة مبيعات' : 'فاتورة مشتريات';
  const partyTypeName = isSale ? 'بيانات العميل' : 'بيانات المورد';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.companyInfo}>
            {logoUrl && <Image src={logoUrl} style={styles.logo} />}
            <Text style={styles.companyName}>{tenantName || 'اسم الشركة'}</Text>
            {taxNumber && <Text>الرقم الضريبي: {taxNumber}</Text>}
          </View>
          <View style={styles.titleInfo}>
            <Text style={styles.invoiceTitle}>{invoiceTypeName}</Text>
            <Text>رقم الفاتورة: {invoice?.id}</Text>
            <Text>التاريخ: {formatDate(invoice?.created_at)}</Text>
          </View>
        </View>

        {/* Party Info Section */}
        <View style={styles.partyInfoContainer}>
          <View style={styles.partyInfo}>
            <Text style={styles.sectionTitle}>{partyTypeName}</Text>
            <Text>الاسم: {partyName || 'غير محدد'}</Text>
            {partyPhone && <Text>الجوال: {partyPhone}</Text>}
            {partyAddress && <Text>العنوان: {partyAddress}</Text>}
          </View>
        </View>

        {/* Items Table */}
        <View style={styles.table}>
          {/* Table Header */}
          <View style={[styles.tableRow, styles.tableHeader]}>
            <View style={styles.tableColDescription}><Text>الصنف</Text></View>
            <View style={styles.tableColNum}><Text>الكمية</Text></View>
            <View style={styles.tableColNum}><Text>السعر</Text></View>
            <View style={styles.tableCol}><Text>الإجمالي</Text></View>
          </View>
          
          {/* Table Rows */}
          {invoice?.items?.map((item, index) => (
            <View style={styles.tableRow} key={index}>
              <View style={styles.tableColDescription}>
                <Text>{item.product_name || item.name || 'صنف غير معروف'}</Text>
              </View>
              <View style={styles.tableColNum}>
                <Text>{item.quantity || item.qty}</Text>
              </View>
              <View style={styles.tableColNum}>
                <Text>{formatCurrency(item.unit_price || item.price)}</Text>
              </View>
              <View style={styles.tableCol}>
                <Text>{formatCurrency((item.quantity || item.qty) * (item.unit_price || item.price))}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals Section */}
        <View style={styles.totalsContainer}>
          <View style={styles.totalsTable}>
            <View style={styles.totalsRow}>
              <Text>المجموع الفرعي:</Text>
              <Text>{formatCurrency(invoice?.total_amount)}</Text>
            </View>
            {invoice?.delivery_fee > 0 && (
              <View style={styles.totalsRow}>
                <Text>رسوم التوصيل:</Text>
                <Text>{formatCurrency(invoice?.delivery_fee)}</Text>
              </View>
            )}
            <View style={styles.totalsRowBold}>
              <Text>الإجمالي الكلي:</Text>
              <Text>{formatCurrency((invoice?.total_amount || 0) + (invoice?.delivery_fee || 0))}</Text>
            </View>
            
            <View style={styles.totalsRow}>
              <Text>المدفوع:</Text>
              <Text>{formatCurrency(invoice?.paid_amount)}</Text>
            </View>

            <View style={styles.totalsRow}>
              <Text>المتبقي:</Text>
              <Text>{formatCurrency(((invoice?.total_amount || 0) + (invoice?.delivery_fee || 0)) - (invoice?.paid_amount || 0))}</Text>
            </View>

            {invoice?.previous_balance !== 0 && (
              <>
                <View style={styles.totalsRow}>
                  <Text>الرصيد السابق:</Text>
                  <Text>{formatCurrency(invoice?.previous_balance)}</Text>
                </View>
                <View style={styles.totalsRowBold}>
                  <Text>إجمالي الرصيد المستحق:</Text>
                  <Text>{formatCurrency(invoice?.total_balance_after)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Footer Section */}
        <View style={styles.footer}>
          <Text>{invoice?.footer_custom_text || defaultFooterText || 'شكراً لتعاملكم معنا'}</Text>
        </View>
      </Page>
    </Document>
  );
};

export default InvoiceDocument;
