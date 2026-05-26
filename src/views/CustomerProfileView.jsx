import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Printer, FileText, ChevronDown, ChevronRight, Check, X as XIcon, Download } from 'lucide-react';
import { Card, Table, ActionIcon, Button, Text, Badge, Modal, NumberInput, TextInput, SimpleGrid, Collapse, Group, Select, ScrollArea, Tooltip } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCash, IconPencil, IconReceiptRefund, IconFileInvoice, IconCoin, IconScale, IconUser, IconArrowDown, IconCornerDownLeft, IconTrendingUp } from '@tabler/icons-react';
import api from '../services/api';


export default function CustomerProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 0, notes: '' });
  const [expandedInvoice, setExpandedInvoice] = useState(null);
  const [printingInvoice, setPrintingInvoice] = useState(null);

  // Return Invoice States
  const [returnModal, setReturnModal] = useState(false);
  const [selectedReturnInvoice, setSelectedReturnInvoice] = useState(null);
  const [returnType, setReturnType] = useState('full_return');
  const [returnItems, setReturnItems] = useState({});



  // Inline Editing State
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineItems, setInlineItems] = useState([]);
  const [inlineSaving, setInlineSaving] = useState(false);

  // Row-level Payment Modal
  const [rowPaymentModal, setRowPaymentModal] = useState(false);
  const [rowPaymentInvoice, setRowPaymentInvoice] = useState(null);
  const [rowPaymentAmount, setRowPaymentAmount] = useState(0);
  const [rowPaymentNotes, setRowPaymentNotes] = useState('');



  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const customersRes = await api.getCustomers(0, 10000);
      const customersList = customersRes.data || customersRes.items || customersRes;
      const found = customersList.find(c => String(c.id) === String(id));
      setCustomer(found);

      const invRes = await api.getInvoices(id);
      const invList = invRes.data || invRes.items || invRes;
      if (Array.isArray(invList)) {
        setInvoices(invList);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const normalizeType = (value) => String(value || '').toLowerCase();
  const isSaleType = (value) => value === 'sale' || value === 'sell';
  const isSaleReturnType = (value) => value === 'sale_return' || value === 'sell_return';

  // ─── Financial Calculations using useMemo ───
  const financials = useMemo(() => {
    const initialBalance = Number(customer?.initial_balance || 0);
    const saleInvoices = invoices.filter(inv => isSaleType(normalizeType(inv.invoice_type)));
    const grossSales = saleInvoices.reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    const totalReturns = invoices
      .filter(inv => isSaleReturnType(normalizeType(inv.invoice_type)))
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    
    const grossInvoices = grossSales + initialBalance;
    const netInvoices = grossInvoices - totalReturns;
    
    const totalRemainingBalance = saleInvoices.reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
    const totalPaid = grossSales - totalRemainingBalance;
    const remaining = netInvoices - totalPaid;

    // Profits: sum of (selling_price - cost_price) * qty for each sale item
    const profits = saleInvoices.reduce((sum, inv) => {
      if (!inv.items) return sum;
      return sum + inv.items.reduce((iSum, item) => {
        const sellPrice = Number(item.sell_price ?? item.unit_price ?? 0);
        const costPrice = Number(item.purchase_price ?? 0);
        const qty = Number(item.quantity || 0);
        return iSum + (sellPrice - costPrice) * qty;
      }, 0);
    }, 0);
    
    return { grossInvoices, totalInvoices: netInvoices, totalPaid, remaining, totalReturns, initialBalance, profits };
  }, [customer, invoices]);

  const calcInvoiceProfit = (inv) => {
    if (!inv.items || !isSaleType(normalizeType(inv.invoice_type))) return null;
    return inv.items.reduce((sum, item) => {
      const sell = Number(item.sell_price ?? item.unit_price ?? 0);
      const cost = Number(item.purchase_price ?? 0);
      return sum + (sell - cost) * Number(item.quantity || 0);
    }, 0);
  };

  const returnsByInvoice = useMemo(() => {
    const map = {};
    invoices.forEach(inv => {
      if (isSaleReturnType(normalizeType(inv.invoice_type)) && inv.original_invoice_id) {
        if (!map[inv.original_invoice_id]) map[inv.original_invoice_id] = 0;
        map[inv.original_invoice_id] += Number(inv.total_amount || 0);
      }
    });
    return map;
  }, [invoices]);

  const handlePayment = async () => {
    try {
      await api.createCustomerPayment(id, {
        amount: paymentData.amount,
        notes: paymentData.notes
      });
      setPaymentModal(false);
      setPaymentData({ amount: 0, notes: '' });
      fetchData();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.detail || err?.message || 'Failed to process payment',
        color: 'red'
      });
    }
  };

  const handlePrint = useCallback((inv) => {
    setPrintingInvoice(inv);
    setTimeout(() => window.print(), 350);
  }, []);

  const handleOpenReturn = (invoice) => {
    setSelectedReturnInvoice(invoice);
    setReturnType('full_return');
    setReturnItems({});
    setReturnModal(true);
  };

  const handleReturnItemChange = (invoiceItemId, quantity, maxQty) => {
    const val = Math.max(0, Math.min(Number(quantity) || 0, maxQty));
    setReturnItems(prev => ({
      ...prev,
      [invoiceItemId]: val
    }));
  };

  const handleSubmitReturn = async () => {
    try {
      setLoading(true);
      const itemsPayload = [];
      if (returnType === 'full_return') {
        selectedReturnInvoice.items.forEach(item => {
          const maxReturnQty = (item.quantity || 0) - (item.already_returned_qty || 0);
          if (maxReturnQty > 0) {
            itemsPayload.push({
              invoice_item_id: item.id,
              quantity: maxReturnQty
            });
          }
        });
      } else {
        Object.entries(returnItems).forEach(([itemId, qty]) => {
          if (qty > 0) {
            itemsPayload.push({
              invoice_item_id: parseInt(itemId),
              quantity: qty
            });
          }
        });
        if (itemsPayload.length === 0) {
          notifications.show({
            title: 'Warning',
            message: 'Please select at least one item to return',
            color: 'yellow'
          });
          setLoading(false);
          return;
        }
      }

      await api.processReturn(selectedReturnInvoice.id, {
        items: itemsPayload
      });
      
      setReturnModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({
        title: 'Error processing return',
        message: err?.response?.data?.detail || err?.message || 'Failed to process return',
        color: 'red'
      });
    } finally {
      setLoading(false);
    }
  };

  // ─── Inline Editing Handlers ───
  const startInlineEdit = (inv) => {
    setInlineEditId(inv.id);
    setInlineItems((inv.items || []).map(it => ({
      id: it.id, product_name: it.product_name || `Product #${it.product_id}`,
      batch_id: it.batch_id, quantity: Number(it.quantity), unit_price: Number(it.unit_price || it.price || 0)
    })));
  };
  const cancelInlineEdit = () => { setInlineEditId(null); setInlineItems([]); };
  const updateInlineItem = (idx, field, val) => {
    setInlineItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: Number(val) || 0 } : it));
  };
  const saveInlineEdit = async () => {
    try {
      setInlineSaving(true);
      await api.updateInvoice(inlineEditId, {
        items: inlineItems.map(it => ({ batch_id: it.batch_id, quantity: it.quantity, unit_price: it.unit_price }))
      });
      cancelInlineEdit();
      fetchData();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.detail || err?.message || 'فشل حفظ التعديلات',
        color: 'red'
      });
    }
    finally { setInlineSaving(false); }
  };

  // ─── Row-level Payment Handler ───
  const openRowPayment = (inv) => {
    setRowPaymentInvoice(inv);
    setRowPaymentAmount(0);
    setRowPaymentNotes('');
    setRowPaymentModal(true);
  };
  const handleRowPayment = async () => {
    try {
      await api.addPayment({ invoice_id: rowPaymentInvoice.id, party_id: rowPaymentInvoice.party_id, amount: rowPaymentAmount });
      setRowPaymentModal(false);
      fetchData();
    } catch (err) {
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.detail || err?.message || 'فشل الدفع',
        color: 'red'
      });
    }
  };

  // ─── PDF Export Handler ───
  const handleDownloadPdf = useCallback(async (inv) => {
    setPrintingInvoice(inv);
    await new Promise(r => setTimeout(r, 350));
    const el = document.getElementById('printable-invoice');
    if (!el) { setPrintingInvoice(null); return; }
    el.style.left = '0';
    el.style.position = 'absolute';
    try {
      const { default: html2pdf } = await import('html2pdf.js');
      await html2pdf().set({
        margin: 8, filename: `invoice-${inv.id}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      }).from(el).save();
    } catch (err) {
      console.error('PDF error', err);
      notifications.show({
        title: 'Error',
        message: err?.response?.data?.detail || err?.message || 'فشل تحميل الـ PDF',
        color: 'red'
      });
    }
    finally {
      el.style.left = '-9999px';
      el.style.position = 'fixed';
      setPrintingInvoice(null);
    }
  }, []);

  useEffect(() => {
    const cleanup = () => setPrintingInvoice(null);
    window.addEventListener('afterprint', cleanup);
    return () => window.removeEventListener('afterprint', cleanup);
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/customers')} color="gray">
          Back to Customers
        </Button>
        <div className="mt-8 text-center text-muted-steel">Customer not found.</div>
      </div>
    );
  }

  const initials = customer.name ? customer.name.substring(0, 2).toUpperCase() : 'C';

  const getTypeColor = (type) => {
    switch (normalizeType(type)) {
      case 'sale': return 'blue';
      case 'sale_return': return 'red';
      case 'purchase': return 'teal';
      case 'purchase_return': return 'orange';
      default: return 'gray';
    }
  };

  const getTypeLabel = (type) => {
    switch (normalizeType(type)) {
      case 'sale': return 'بيع';
      case 'sale_return': return 'مرتجع بيع';
      case 'purchase': return 'شراء';
      case 'purchase_return': return 'مرتجع شراء';
      default: return type || 'N/A';
    }
  };

  const fmtCurrency = (val) => {
    return `${Number(val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ج.م`;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12 animate-fade-in-up">
      <Button variant="subtle" color="gray" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/customers')} className="mb-2">
        العودة للعملاء
      </Button>

      {/* ─── Top Statistics: 5-Card Grid ─── */}
      <SimpleGrid cols={{ base: 1, sm: 2, lg: 5 }} spacing="lg">
        {/* Card 1: Customer Info */}
        <Card shadow="sm" radius="lg" padding="xl" className="border border-outline-variant/30 bg-surface-container-lowest flex flex-col items-center justify-center text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-accent to-indigo-400"></div>
          <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center text-2xl font-bold text-accent mb-3">
            {initials}
          </div>
          <Text fw={700} size="xl" className="text-charcoal-ink">{customer.name}</Text>
          {customer.phone && <Text size="sm" className="text-muted-steel">{customer.phone}</Text>}
          <Button 
            leftSection={<IconCash size={16} />} 
            color="teal" 
            onClick={() => setPaymentModal(true)}
            size="sm"
            radius="md"
            className="mt-4 shadow-sm w-full"
            variant="light"
          >
            تحصيل دفعة
          </Button>
        </Card>

        {/* Card 2: Total Invoices */}
        <Card shadow="sm" radius="lg" padding="xl" className="border border-outline-variant/30 bg-surface-container-lowest flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <IconFileInvoice size={20} className="text-blue-600" />
            </div>
            <Text size="sm" fw={600} className="text-muted-steel">إجمالي الفواتير</Text>
          </div>
          <Text size="2rem" fw={800} className="text-charcoal-ink">{fmtCurrency(financials.totalInvoices)}</Text>
          {financials.initialBalance > 0 && (
            <Text size="xs" className="text-muted-steel mt-1">يشمل حساب سابق: {fmtCurrency(financials.initialBalance)}</Text>
          )}
          {financials.totalReturns > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <IconArrowDown size={14} className="text-red-500" />
              <Text size="xs" fw={600} className="text-red-500">مرتجعات: {fmtCurrency(financials.totalReturns)}</Text>
            </div>
          )}
        </Card>

        {/* Card 3: Total Paid */}
        <Card shadow="sm" radius="lg" padding="xl" className="border border-outline-variant/30 bg-surface-container-lowest flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
              <IconCoin size={20} className="text-emerald-600" />
            </div>
            <Text size="sm" fw={600} className="text-muted-steel">إجمالي المدفوعات</Text>
          </div>
          <Text size="2rem" fw={800} className="text-emerald-600">{fmtCurrency(financials.totalPaid)}</Text>
        </Card>

        {/* Card 4: Remaining / Debt */}
        <Card shadow="sm" radius="lg" padding="xl" className="border border-outline-variant/30 bg-surface-container-lowest flex flex-col justify-center relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1 ${financials.remaining > 0 ? 'bg-gradient-to-r from-red-400 to-red-600' : 'bg-gradient-to-r from-emerald-400 to-emerald-600'}`}></div>
          <div className="flex items-center gap-2 mb-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${financials.remaining > 0 ? 'bg-red-50' : 'bg-emerald-50'}`}>
              <IconScale size={20} className={financials.remaining > 0 ? 'text-red-600' : 'text-emerald-600'} />
            </div>
            <Text size="sm" fw={600} className="text-muted-steel">المتبقي / المديونية</Text>
          </div>
          <Text size="2rem" fw={800} className={financials.remaining > 0 ? 'text-red-600' : 'text-emerald-600'}>
            {fmtCurrency(financials.remaining)}
          </Text>
        </Card>

        {/* Card 5: Profits */}
        <Card shadow="sm" radius="lg" padding="xl" className="border border-outline-variant/30 bg-surface-container-lowest flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-purple-400 to-purple-600"></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center">
              <IconTrendingUp size={20} className="text-purple-600" />
            </div>
            <Text size="sm" fw={600} className="text-muted-steel">الأرباح</Text>
          </div>
          <Text size="2rem" fw={800} className="text-purple-600">
            {fmtCurrency(financials.profits)}
          </Text>
        </Card>
      </SimpleGrid>

      {/* ─── Invoices Table ─── */}
      <Card shadow="sm" radius="lg" padding="xl" className="border border-outline-variant/30 bg-surface-container-lowest">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-charcoal-ink">فواتير العميل</h2>
          <Badge size="lg" variant="light" color="gray">{invoices.length} فاتورة</Badge>
        </div>
        <div className="overflow-x-auto">
          <Table striped highlightOnHover verticalSpacing="md" className="min-w-[800px]">
            <Table.Thead>
              <Table.Tr>
                <Table.Th className="w-10"></Table.Th>
                <Table.Th className="text-muted-steel">رقم الفاتورة</Table.Th>
                <Table.Th className="text-muted-steel">التاريخ</Table.Th>
                <Table.Th className="text-muted-steel">النوع</Table.Th>
                <Table.Th className="text-muted-steel">الإجمالي</Table.Th>
                <Table.Th className="text-muted-steel">الربح</Table.Th>
                <Table.Th className="text-muted-steel">المتبقي</Table.Th>
                <Table.Th className="text-muted-steel">الحالة</Table.Th>
                <Table.Th className="text-muted-steel text-right">إجراءات</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {invoices.length > 0 ? invoices.map((inv) => {
                const returnedAmount = returnsByInvoice[inv.id] || 0;
                const netTotal = Number(inv.total_amount || 0) - returnedAmount;

                return (
                <React.Fragment key={inv.id}>
                  <Table.Tr className={expandedInvoice === inv.id ? 'bg-blue-50/50' : ''}>
                    <Table.Td>
                      <ActionIcon 
                        variant="subtle" 
                        color="gray" 
                        onClick={() => setExpandedInvoice(expandedInvoice === inv.id ? null : inv.id)}
                      >
                        {expandedInvoice === inv.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                      </ActionIcon>
                    </Table.Td>
                    <Table.Td className="font-medium text-charcoal-ink">#{inv.id}</Table.Td>
                    <Table.Td className="text-muted-steel">{new Date(inv.created_at || inv.date).toLocaleDateString()}</Table.Td>
                    <Table.Td>
                      <Badge color={getTypeColor(inv.invoice_type)} variant="light" size="md" radius="sm">
                        {getTypeLabel(inv.invoice_type)}
                      </Badge>
                    </Table.Td>
                    <Table.Td className="font-mono-tabular font-medium text-charcoal-ink">
                      {fmtCurrency(netTotal)}
                    </Table.Td>
                    <Table.Td>
                      {(() => {
                        const profit = calcInvoiceProfit(inv);
                        if (!isSaleType(normalizeType(inv.invoice_type))) return <Text size="xs" c="dimmed">—</Text>;
                        return (
                          <Badge
                            color={profit >= 0 ? 'teal' : 'red'}
                            variant="light"
                            size="sm"
                          >
                            {profit >= 0 ? '+' : ''}{fmtCurrency(profit)}
                          </Badge>
                        );
                      })()}
                    </Table.Td>
                    <Table.Td className="font-mono-tabular text-muted-steel">
                      {fmtCurrency(inv.balance)}
                    </Table.Td>
                    <Table.Td>
                      <Badge color={Number(inv.balance || 0) > 0 ? 'orange' : 'green'} variant="dot" size="md">
                        {Number(inv.balance || 0) > 0 ? 'غير مدفوعة' : 'مدفوعة'}
                      </Badge>
                    </Table.Td>
                    <Table.Td className="text-right">
                      <Group gap="xs" justify="flex-end">
                        {Number(inv.balance) > 0 && (
                          <ActionIcon variant="light" color="teal" onClick={() => openRowPayment(inv)} title="دفع الفاتورة">
                            <IconCash size={16} />
                          </ActionIcon>
                        )}
                        <ActionIcon variant="light" color="blue" onClick={() => handlePrint(inv.id)} title="طباعة">
                          <Printer size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr className="p-0 border-0">
                    <Table.Td colSpan={8} className="p-0 border-0">
                      <Collapse in={expandedInvoice === inv.id}>
                        <div id={`print-inv-${inv.id}`} className="p-6 bg-white border border-gray-100 rounded-xl shadow-sm m-4 relative">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <Text fw={700} size="lg" className="text-gray-800">تفاصيل الفاتورة #{inv.id}</Text>
                              <Text size="sm" className="text-gray-500">{new Date(inv.created_at || inv.date).toLocaleString()}</Text>
                                {normalizeType(inv.invoice_type) === 'sale_return' && (
                                <Badge color="red" variant="light" mt="xs">
                                  فاتورة مرتجع - مرتبطة بـ #{inv.original_invoice_id}
                                </Badge>
                              )}
                              {returnedAmount > 0 && (
                                <Badge color="red" variant="light" mt="xs" leftSection={<IconArrowDown size={12} />}>
                                  مرتجعات مخصومة: {fmtCurrency(returnedAmount)}
                                </Badge>
                              )}
                            </div>
                            {inlineEditId === inv.id ? (
                              <Group gap="xs">
                                <Button size="xs" color="teal" onClick={saveInlineEdit} loading={inlineSaving} leftSection={<Check size={14} />}>حفظ</Button>
                                <Button size="xs" variant="default" onClick={cancelInlineEdit} leftSection={<XIcon size={14} />}>إلغاء</Button>
                              </Group>
                            ) : (
                              <Group gap="xs">
                                <Button size="xs" variant="light" color="violet" onClick={() => startInlineEdit(inv)} leftSection={<IconPencil size={14} />}>
                                  تعديل
                                </Button>
                                {isSaleType(normalizeType(inv.invoice_type)) && (
                                  <Button size="xs" variant="light" color="red" onClick={() => handleOpenReturn(inv)} leftSection={<IconReceiptRefund size={14} />}>
                                    استرجاع
                                  </Button>
                                )}
                              </Group>
                            )}
                          </div>
                          
                          {inv.items && inv.items.length > 0 && (
                            <div className="overflow-x-auto">
                              <Table verticalSpacing="sm" className="w-full">
                                <Table.Thead>
                                  <Table.Tr className="border-b border-gray-200">
                                    <Table.Th className="text-gray-500 font-medium">المنتج</Table.Th>
                                    <Table.Th className="text-gray-500 font-medium text-center">الكمية</Table.Th>
                                    <Table.Th className="text-gray-500 font-medium text-right">السعر</Table.Th>
                                    <Table.Th className="text-gray-500 font-medium text-right">الإجمالي</Table.Th>
                                  </Table.Tr>
                                </Table.Thead>
                                <Table.Tbody>
                                  {inlineEditId === inv.id 
                                    ? inlineItems.map((item, idx) => (
                                        <Table.Tr key={idx} className="border-b border-gray-50 last:border-0">
                                          <Table.Td>
                                            <Text size="sm" fw={500}>{item.product_name}</Text>
                                            {item.batch_id && <Text size="xs" color="dimmed">Batch: {item.batch_id}</Text>}
                                          </Table.Td>
                                          <Table.Td className="text-center">
                                            <NumberInput size="xs" value={item.quantity} onChange={(v) => updateInlineItem(idx, 'quantity', v)} min={1} w={80} mx="auto" />
                                          </Table.Td>
                                          <Table.Td className="text-right">
                                            <NumberInput size="xs" value={item.unit_price} onChange={(v) => updateInlineItem(idx, 'unit_price', v)} min={0} w={100} ml="auto" />
                                          </Table.Td>
                                          <Table.Td className="text-right font-medium text-gray-700">
                                            {fmtCurrency((item.quantity || 0) * (item.unit_price || 0))}
                                          </Table.Td>
                                        </Table.Tr>
                                      ))
                                    : inv.items.map((item, idx) => (
                                        <Table.Tr key={idx} className="border-b border-gray-50 last:border-0">
                                          <Table.Td>
                                            <Text size="sm" fw={500} className="text-gray-800">{item.product_name || `Product #${item.product_id}`}</Text>
                                          </Table.Td>
                                          <Table.Td className="text-center text-gray-600">{item.quantity}</Table.Td>
                                          <Table.Td className="text-right text-gray-600">{fmtCurrency(item.unit_price || item.price)}</Table.Td>
                                          <Table.Td className="text-right font-medium text-gray-800">{fmtCurrency((item.quantity || 0) * (item.unit_price || item.price || 0))}</Table.Td>
                                        </Table.Tr>
                                      ))
                                  }
                                </Table.Tbody>
                              </Table>
                            </div>
                          )}
                          <div className="flex justify-end mt-4 pt-4 border-t border-gray-100">
                            <Text size="sm" c="dimmed" mr="xs">رسوم التوصيل:</Text>
                            <Text size="sm" fw={500}>{fmtCurrency(inv.delivery_fee || 0)}</Text>
                          </div>
                        </div>
                      </Collapse>
                    </Table.Td>
                  </Table.Tr>
                </React.Fragment>
                );
              }) : (
                <Table.Tr>
                  <Table.Td colSpan={8} className="text-center py-12 text-muted-steel">
                    لا توجد فواتير لهذا العميل.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      {/* ─── Payment Modal ─── */}
      <Modal opened={paymentModal} onClose={() => setPaymentModal(false)} title={<Text fw={600} size="lg">تحصيل دفعة</Text>} centered radius="lg">
        <div className="space-y-5 p-2">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
            <Text size="sm" className="text-blue-700">المبلغ المتبقي على العميل: <strong>{fmtCurrency(financials.remaining)}</strong></Text>
          </div>
          <NumberInput
            label="المبلغ"
            required
            value={paymentData.amount}
            onChange={(val) => setPaymentData({ ...paymentData, amount: val })}
            min={0}
            max={financials.remaining > 0 ? financials.remaining : undefined}
            suffix=" ج.م"
            size="md"
            radius="md"
          />
          <TextInput
            label="ملاحظات"
            value={paymentData.notes}
            onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
            placeholder="مرجع الدفع أو ملاحظات"
            size="md"
            radius="md"
          />
          <Button fullWidth onClick={handlePayment} color="teal" mt="xl" size="md" radius="md" disabled={!paymentData.amount || paymentData.amount <= 0}>
            تأكيد الدفع
          </Button>
        </div>
      </Modal>

      {/* ─── Return Modal ─── */}
      <Modal opened={returnModal} onClose={() => setReturnModal(false)} title={<Text fw={600} size="lg">إنشاء فاتورة مرتجع</Text>} size="xl" centered radius="lg">
        <div className="space-y-4">
          <Select
            label="نوع الإرجاع"
            value={returnType}
            onChange={setReturnType}
            data={[
              { value: 'full_return', label: 'إرجاع كامل' },
              { value: 'partial_return', label: 'إرجاع جزئي' }
            ]}
          />

          {returnType === 'partial_return' && selectedReturnInvoice?.items && (
            <ScrollArea h={300}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>المنتج</Table.Th>
                    <Table.Th>الكمية المشتراة</Table.Th>
                    <Table.Th>المرتجع سابقاً</Table.Th>
                    <Table.Th>المتاح للإرجاع</Table.Th>
                    <Table.Th>كمية الإرجاع</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {selectedReturnInvoice.items.map(item => {
                    const maxReturnQty = (item.quantity || 0) - (item.already_returned_qty || 0);
                    return (
                    <Table.Tr key={item.id}>
                      <Table.Td>{item.product_name || `Product #${item.product_id}`}</Table.Td>
                      <Table.Td>{item.quantity}</Table.Td>
                      <Table.Td>{item.already_returned_qty || 0}</Table.Td>
                      <Table.Td>{maxReturnQty}</Table.Td>
                      <Table.Td>
                        <NumberInput
                          value={returnItems[item.id] || 0}
                          onChange={(val) => handleReturnItemChange(item.id, val, maxReturnQty)}
                          min={0}
                          max={maxReturnQty}
                          disabled={maxReturnQty <= 0}
                        />
                      </Table.Td>
                    </Table.Tr>
                  )})}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}

          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setReturnModal(false)}>إلغاء</Button>
            <Button color="red" onClick={handleSubmitReturn} loading={loading}>تأكيد الإرجاع</Button>
          </Group>
        </div>
      </Modal>

      {/* ─── Row Payment Modal ─── */}
      <Modal opened={rowPaymentModal} onClose={() => setRowPaymentModal(false)} title={<Text fw={600} size="lg">دفع فاتورة #{rowPaymentInvoice?.id}</Text>} centered radius="lg">
        <div className="space-y-5 p-2">
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
            <Text size="sm" className="text-teal-700">المبلغ المتبقي من الفاتورة: <strong>{fmtCurrency(rowPaymentInvoice?.balance)}</strong></Text>
          </div>
          <NumberInput
            label="المبلغ"
            required
            value={rowPaymentAmount}
            onChange={(val) => setRowPaymentAmount(val)}
            min={0}
            max={rowPaymentInvoice?.balance > 0 ? Number(rowPaymentInvoice.balance) : undefined}
            suffix=" ج.م"
            size="md"
            radius="md"
          />
          <TextInput
            label="ملاحظات"
            value={rowPaymentNotes}
            onChange={(e) => setRowPaymentNotes(e.target.value)}
            placeholder="مرجع الدفع أو ملاحظات"
            size="md"
            radius="md"
          />
          <Button fullWidth onClick={handleRowPayment} color="teal" mt="xl" size="md" radius="md" disabled={!rowPaymentAmount || rowPaymentAmount <= 0}>
            تأكيد الدفع
          </Button>
        </div>
      </Modal>


    </div>
  );
}
