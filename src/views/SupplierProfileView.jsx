import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Printer, ChevronDown, ChevronRight, Check, X as XIcon } from 'lucide-react';
import { Card, Table, ActionIcon, Button, Text, Badge, Modal, NumberInput, TextInput, SimpleGrid, Collapse, Group, Select, ScrollArea } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconCash, IconPencil, IconReceiptRefund, IconFileInvoice, IconCoin, IconScale, IconUser, IconTruck, IconArrowDown, IconCornerDownLeft, IconPlus, IconTrash } from '@tabler/icons-react';
import api from '../services/api';
import EditInvoiceModal from '../components/EditInvoiceModal';

export default function SupplierProfileView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [supplier, setSupplier] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({ amount: 0, notes: '' });
  const [expandedInvoice, setExpandedInvoice] = useState(null);

  // Return Invoice States
  const [returnModal, setReturnModal] = useState(false);
  const [selectedReturnInvoice, setSelectedReturnInvoice] = useState(null);
  const [returnType, setReturnType] = useState('full_return');
  const [returnItems, setReturnItems] = useState({});

  // Edit Invoice State
  const [editingInvoice, setEditingInvoice] = useState(null);
  const [inlineEditId, setInlineEditId] = useState(null);
  const [inlineItems, setInlineItems] = useState([]);
  const [inlineSaving, setInlineSaving] = useState(false);

  const [globalReturnModal, setGlobalReturnModal] = useState(false);
  const [globalReturnItems, setGlobalReturnItems] = useState([{ product_id: '', quantity: 1, unit_price: 0 }]);
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const suppliersRes = await api.getSuppliers(0, 10000);
      const suppliersList = suppliersRes.data || suppliersRes.items || suppliersRes;
      const found = suppliersList.find(s => String(s.id) === String(id));
      setSupplier(found);

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

  // ─── Financial Calculations using useMemo ───
  const financials = useMemo(() => {
    const initialBalance = Number(supplier?.initial_balance || 0);

    // Total purchase invoices (what we owe the supplier)
    const grossPurchases = invoices
      .filter(inv => inv.invoice_type === 'purchase')
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);

    // Total purchase returns (reduces what we owe)
    const totalReturns = invoices
      .filter(inv => inv.invoice_type === 'purchase_return')
      .reduce((sum, inv) => sum + Number(inv.total_amount || 0), 0);
    
    // Gross Invoices = purchases + initial balance (before returns)
    const grossInvoices = grossPurchases + initialBalance;
    // Net Invoices = gross - returns (returns auto-deducted)
    const netInvoices = grossInvoices - totalReturns;
    
    const totalRemainingBalance = invoices
      .filter(inv => inv.invoice_type === 'purchase')
      .reduce((sum, inv) => sum + Number(inv.balance || 0), 0);
    const totalPaid = grossPurchases - totalRemainingBalance;
    
    // Remaining = Net Invoices - Paid
    const remaining = netInvoices - totalPaid;
    
    return {
      grossInvoices,
      totalInvoices: netInvoices,
      totalPaid,
      remaining,
      totalReturns,
      initialBalance,
    };
  }, [supplier, invoices]);

  const handlePayment = async () => {
    try {
      await api.createSupplierPayment(id, {
        amount: paymentData.amount,
        notes: paymentData.notes
      });
      setPaymentModal(false);
      setPaymentData({ amount: 0, notes: '' });
      fetchData();
    } catch (err) {
      notifications.show({ title: 'خطأ', message: 'فشل في معالجة الدفعة', color: 'red' });
    }
  };

  const handlePrint = (invoiceId) => {
    window.open(`/print/invoice/${invoiceId}`, '_blank');
  };

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
          notifications.show({ title: 'تنبيه', message: 'يرجى اختيار صنف واحد على الأقل للإرجاع', color: 'yellow' });
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
      notifications.show({ title: 'خطأ', message: 'فشل في معالجة الإرجاع: ' + err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenGlobalReturn = async () => {
    try {
      setLoading(true);
      const res = await api.getProductsSelect();
      const pList = res.data || res.items || res;
      setProducts(pList);
      setGlobalReturnItems([{ product_id: '', quantity: 1, unit_price: 0 }]);
      setGlobalReturnModal(true);
    } catch (err) {
      console.error(err);
      notifications.show({ title: 'خطأ', message: 'فشل في تحميل المنتجات', color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitGlobalReturn = async () => {
    try {
      const validItems = globalReturnItems.filter(item => item.product_id && item.quantity > 0);
      if (validItems.length === 0) {
        notifications.show({ title: 'تنبيه', message: 'يرجى إضافة صنف واحد على الأقل.', color: 'yellow' });
        return;
      }
      setLoading(true);
      const payload = { items: validItems.map(i => ({ product_id: parseInt(i.product_id), quantity: i.quantity, unit_price: i.unit_price })) };
      await api.createSupplierStockReturn(id, payload);
      setGlobalReturnModal(false);
      fetchData();
    } catch (err) {
      console.error(err);
      notifications.show({ title: 'خطأ', message: 'فشل الإرجاع: ' + err.message, color: 'red' });
    } finally {
      setLoading(false);
    }
  };

  // ─── Inline Editing Handlers ───
  const startInlineEdit = (inv) => {
    setInlineEditId(inv.id);
    setInlineItems((inv.items || []).map(it => ({
      id: it.id,
      product_name: it.product_name || `Product #${it.product_id}`,
      batch_id: it.batch_id,
      quantity: Number(it.quantity),
      unit_price: Number(it.unit_price || it.price || 0)
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
    } finally {
      setInlineSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  if (!supplier) {
    return (
      <div className="p-6">
        <Button variant="subtle" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/suppliers')} color="gray">
          العودة للموردين
        </Button>
        <div className="mt-8 text-center text-muted-steel">المورد غير موجود.</div>
      </div>
    );
  }

  const initials = supplier.name ? supplier.name.substring(0, 2).toUpperCase() : 'S';

  const getTypeColor = (type) => {
    switch (type) {
      case 'sale': return 'blue';
      case 'sale_return': return 'red';
      case 'purchase': return 'teal';
      case 'purchase_return': return 'orange';
      default: return 'gray';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
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
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <Button variant="subtle" color="gray" leftSection={<ArrowLeft size={16} />} onClick={() => navigate('/suppliers')} className="mb-2">
            العودة للموردين
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-500/10 flex items-center justify-center text-xl font-bold text-teal-600">
              {initials}
            </div>
            <div>
              <Text fw={700} size="xl" className="text-charcoal-ink">{supplier.name}</Text>
              {supplier.phone && <Text size="sm" className="text-muted-steel">{supplier.phone}</Text>}
            </div>
          </div>
        </div>
        <Group>
          <Button 
            leftSection={<IconCash size={16} />} 
            color="teal" 
            onClick={() => setPaymentModal(true)}
            radius="md"
          >
            تسديد دفعة
          </Button>
          <Button
            leftSection={<IconReceiptRefund size={16} />}
            color="orange"
            variant="light"
            onClick={handleOpenGlobalReturn}
            radius="md"
          >
            استرجاع للمورد
          </Button>
        </Group>
      </div>

      {/* ─── Top Statistics: 3-Card Grid ─── */}
      <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="lg">
        {/* Card 1: Total Invoices (إجمالي فواتير المشتريات) */}
        <Card shadow="sm" radius="lg" padding="xl" className="border border-outline-variant/30 bg-surface-container-lowest flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-blue-600"></div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center">
              <IconFileInvoice size={20} className="text-blue-600" />
            </div>
            <Text size="sm" fw={600} className="text-muted-steel">إجمالي المشتريات</Text>
          </div>
          <Text size="2rem" fw={800} className="text-charcoal-ink">{fmtCurrency(financials.totalInvoices)}</Text>
          {financials.initialBalance > 0 && (
            <Text size="xs" className="text-muted-steel mt-1">يشمل حساب سابق: {fmtCurrency(financials.initialBalance)}</Text>
          )}
          {financials.totalReturns > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <IconArrowDown size={14} className="text-red-500" />
              <Text size="xs" fw={600} className="text-red-500">مرتجعات مخصومة: {fmtCurrency(financials.totalReturns)}</Text>
            </div>
          )}
        </Card>

        {/* Card 2: Total Paid (إجمالي المدفوعات) */}
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

        {/* Card 3: Remaining / Payable (المتبقي / المديونية) */}
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
      </SimpleGrid>

      {/* ─── Invoices Table ─── */}
      <Card shadow="sm" radius="lg" padding="xl" className="border border-outline-variant/30 bg-surface-container-lowest">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-charcoal-ink">فواتير المورد</h2>
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
                <Table.Th className="text-muted-steel">المتبقي</Table.Th>
                <Table.Th className="text-muted-steel">الحالة</Table.Th>
                <Table.Th className="text-muted-steel text-right">إجراءات</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {invoices.length > 0 ? invoices.map((inv) => (
                <React.Fragment key={inv.id}>
                  <Table.Tr className={expandedInvoice === inv.id ? 'bg-teal-50/50' : ''}>
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
                      {fmtCurrency(inv.total_amount)}
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
                        <ActionIcon variant="light" color="blue" onClick={() => handlePrint(inv.id)} title="طباعة">
                          <Printer size={16} />
                        </ActionIcon>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                  <Table.Tr className="p-0 border-0">
                    <Table.Td colSpan={8} className="p-0 border-0">
                      <Collapse in={expandedInvoice === inv.id}>
                        <div className="p-5 bg-surface-container-low border-b border-outline-variant/30">
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <Text fw={700} size="lg" className="text-gray-800">تفاصيل الفاتورة #{inv.id}</Text>
                              <Text size="sm" className="text-gray-500">{new Date(inv.created_at || inv.date).toLocaleString()}</Text>
                              {inv.invoice_type === 'purchase_return' && (
                                <Badge color="red" variant="light" mt="xs" leftSection={<IconCornerDownLeft size={12} />}>
                                  فاتورة مرتجع مشتريات — تم خصم {fmtCurrency(inv.total_amount)}
                                  {inv.original_invoice_id && <span> (مرتبطة بـ #{inv.original_invoice_id})</span>}
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
                                <Button size="xs" variant="light" color="blue" onClick={() => startInlineEdit(inv)} leftSection={<IconPencil size={14} />}>
                                  تعديل الفاتورة
                                </Button>
                                {inv.invoice_type === 'purchase' && (
                                  <Button
                                    size="xs"
                                    variant="light"
                                    color="red"
                                    leftSection={<IconReceiptRefund size={13} />}
                                    onClick={() => handleOpenReturn(inv)}
                                  >
                                    إرجاع
                                  </Button>
                                )}
                              </Group>
                            )}
                          </div>

                          {/* Invoice meta info */}
                          <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mb="md">
                            <div>
                              <Text size="xs" className="text-muted-steel mb-0.5">تاريخ الإنشاء</Text>
                              <Text size="sm" fw={500}>{new Date(inv.created_at || inv.date).toLocaleDateString('en-GB')}</Text>
                            </div>
                            <div>
                              <Text size="xs" className="text-muted-steel mb-0.5">رسوم التوصيل</Text>
                              <Text size="sm" fw={500}>{fmtCurrency(inv.delivery_fee)}</Text>
                            </div>
                            <div>
                              <Text size="xs" className="text-muted-steel mb-0.5">عدد الأصناف</Text>
                              <Text size="sm" fw={500}>{inv.items ? inv.items.length : 'N/A'}</Text>
                            </div>
                          </SimpleGrid>
                          {/* Items table */}
                          {inv.items && inv.items.length > 0 && (
                            <Table verticalSpacing="xs" className="bg-white rounded-lg border border-gray-100 mb-4" fontSize="xs">
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th className="text-gray-500 font-medium">المنتج</Table.Th>
                                  <Table.Th className="text-gray-500 font-medium">الكمية</Table.Th>
                                  <Table.Th className="text-gray-500 font-medium">السعر</Table.Th>
                                  <Table.Th className="text-gray-500 font-medium text-right">الإجمالي</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {inlineEditId === inv.id 
                                  ? inlineItems.map((item, idx) => (
                                      <Table.Tr key={idx}>
                                        <Table.Td>
                                          <Text size="sm" fw={500}>{item.product_name}</Text>
                                          {item.batch_id && <Text size="xs" color="dimmed">Batch: {item.batch_id}</Text>}
                                        </Table.Td>
                                        <Table.Td>
                                          <NumberInput size="xs" value={item.quantity} onChange={(v) => updateInlineItem(idx, 'quantity', v)} min={1} w={80} />
                                        </Table.Td>
                                        <Table.Td>
                                          <NumberInput size="xs" value={item.unit_price} onChange={(v) => updateInlineItem(idx, 'unit_price', v)} min={0} w={100} />
                                        </Table.Td>
                                        <Table.Td className="text-right font-medium">
                                          {fmtCurrency((item.quantity || 0) * (item.unit_price || 0))}
                                        </Table.Td>
                                      </Table.Tr>
                                    ))
                                  : inv.items.map((item, idx) => (
                                      <Table.Tr key={idx}>
                                        <Table.Td>{item.product_name || `Product #${item.product_id}`}</Table.Td>
                                        <Table.Td>{item.quantity}</Table.Td>
                                        <Table.Td>{fmtCurrency(item.unit_price || item.price)}</Table.Td>
                                        <Table.Td className="text-right font-medium">{fmtCurrency((item.quantity || 0) * (item.unit_price || item.price || 0))}</Table.Td>
                                      </Table.Tr>
                                    ))
                                }
                              </Table.Tbody>
                            </Table>
                          )}
                        </div>
                      </Collapse>
                    </Table.Td>
                  </Table.Tr>
                </React.Fragment>
              )) : (
                <Table.Tr>
                  <Table.Td colSpan={8} className="text-center py-12 text-muted-steel">
                    لا توجد فواتير لهذا المورد.
                  </Table.Td>
                </Table.Tr>
              )}
            </Table.Tbody>
          </Table>
        </div>
      </Card>

      {/* ─── Payment Modal ─── */}
      <Modal opened={paymentModal} onClose={() => setPaymentModal(false)} title={<Text fw={600} size="lg">تسديد دفعة للمورد</Text>} centered radius="lg">
        <div className="space-y-5 p-2">
          <div className="p-3 rounded-lg bg-teal-50 border border-teal-100">
            <Text size="sm" className="text-teal-700">المبلغ المستحق للمورد: <strong>{fmtCurrency(financials.remaining)}</strong></Text>
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
      <Modal opened={returnModal} onClose={() => setReturnModal(false)} title={<Text fw={600} size="lg">إنشاء فاتورة مرتجع مشتريات</Text>} size="xl" centered radius="lg">
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

      {/* ─── Global Return Modal ─── */}
      <Modal opened={globalReturnModal} onClose={() => setGlobalReturnModal(false)} title={<Text fw={600} size="lg">استرجاع مخزون للمورد</Text>} size="xl" centered radius="lg">
        <div className="space-y-4">
          <Text size="sm" className="text-muted-steel">يرجى تحديد الأصناف التي تود إرجاعها لهذا المورد والكميات:</Text>
          
          <ScrollArea h={350}>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>المنتج</Table.Th>
                  <Table.Th>الكمية</Table.Th>
                  <Table.Th>سعر الإرجاع للوحدة</Table.Th>
                  <Table.Th></Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {globalReturnItems.map((item, idx) => (
                  <Table.Tr key={idx}>
                    <Table.Td>
                      <Select
                        placeholder="اختر المنتج"
                        searchable
                        data={products.map(p => ({ value: String(p.id), label: p.name }))}
                        value={String(item.product_id)}
                        onChange={(val) => {
                          const newItems = [...globalReturnItems];
                          newItems[idx].product_id = val;
                          const selectedProduct = products.find(p => String(p.id) === String(val));
                          if (selectedProduct) {
                            newItems[idx].unit_price = selectedProduct.purchase_price || 0;
                          }
                          setGlobalReturnItems(newItems);
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={1}
                        value={item.quantity}
                        onChange={(val) => {
                          const newItems = [...globalReturnItems];
                          newItems[idx].quantity = val;
                          setGlobalReturnItems(newItems);
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <NumberInput
                        min={0}
                        suffix=" ج.م"
                        value={item.unit_price}
                        onChange={(val) => {
                          const newItems = [...globalReturnItems];
                          newItems[idx].unit_price = val;
                          setGlobalReturnItems(newItems);
                        }}
                      />
                    </Table.Td>
                    <Table.Td>
                      <ActionIcon color="red" variant="subtle" onClick={() => {
                        setGlobalReturnItems(globalReturnItems.filter((_, i) => i !== idx));
                      }}>
                        <IconTrash size={16} />
                      </ActionIcon>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
          
          <Button variant="light" color="blue" leftSection={<IconPlus size={16} />} onClick={() => setGlobalReturnItems([...globalReturnItems, { product_id: '', quantity: 1, unit_price: 0 }])}>
            إضافة صنف
          </Button>

          <Group justify="flex-end" mt="xl">
            <Button variant="default" onClick={() => setGlobalReturnModal(false)}>إلغاء</Button>
            <Button color="red" onClick={handleSubmitGlobalReturn} loading={loading}>تنفيذ الإرجاع</Button>
          </Group>
        </div>
      </Modal>


    </div>
  );
}
