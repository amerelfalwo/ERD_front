const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

function buildUrl(endpoint) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${BASE_URL}${path}`;
}

const frontendCache = new Map();
const CACHE_TTL = 600000; // 10 minutes (600,000 ms) - keeps cache for the whole session

async function request(endpoint, options = {}) {
  const url = buildUrl(endpoint);
  const method = options.method || 'GET';
  
  if (method !== 'GET') {
    frontendCache.clear(); // Invalidate on any mutation to keep data fresh
  } else if (frontendCache.has(url)) {
    const cached = frontendCache.get(url);
    if (Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    frontendCache.delete(url);
  }

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(url, config);
  } catch (error) {
    console.error('Network/CORS error', error);
    throw error;
  }
  if (response.status === 401) {
    localStorage.removeItem('access_token');
    localStorage.removeItem('erp_user');
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || `Request failed: ${response.status}`;
    console.error('API error', { status: response.status, message });
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  
  const data = await response.json();
  if (method === 'GET') {
    frontendCache.set(url, { data, timestamp: Date.now() });
  }
  
  return data;
}

export const api = {
  login: (data) => request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data)
  }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  getParties: (skip = 0, limit = 100) => request(`/parties?skip=${skip}&limit=${limit}`),
  getPartiesSelect: () => request('/parties/select'),
  createParty: (data) => request('/parties', { method: 'POST', body: JSON.stringify(data) }),
  deleteParty: (partyId) => request(`/parties/${partyId}`, { method: 'DELETE' }),
  getPartyBalance: (partyId) => request(`/parties/${partyId}/balance`),
  getPartySummary: (partyId) => request(`/parties/${partyId}/summary`),
  createPartyPayment: (partyId, data) => request(`/parties/${partyId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updatePartyPayment: (partyId, paymentId, data) => request(`/parties/${partyId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePartyPayment: (partyId, paymentId) => request(`/parties/${partyId}/payments/${paymentId}`, { method: 'DELETE' }),
  createStockReturn: (partyId, data) => request(`/parties/${partyId}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),

  // Customers
  getCustomers: (skip = 0, limit = 100) => request(`/customers?skip=${skip}&limit=${limit}`),
  getCustomersSelect: () => request('/customers/select'),
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (customerId, data) => request(`/customers/${customerId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (customerId) => request(`/customers/${customerId}`, { method: 'DELETE' }),
  getCustomerBalance: (customerId) => request(`/customers/${customerId}/balance`),
  getCustomerSummary: (customerId) => request(`/customers/${customerId}/summary`),
  createCustomerPayment: (customerId, data) => request(`/customers/${customerId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateCustomerPayment: (customerId, paymentId, data) => request(`/customers/${customerId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCustomerPayment: (customerId, paymentId) => request(`/customers/${customerId}/payments/${paymentId}`, { method: 'DELETE' }),
  createCustomerStockReturn: (customerId, data) => request(`/customers/${customerId}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),

  // Suppliers
  getSuppliers: (skip = 0, limit = 100) => request(`/suppliers?skip=${skip}&limit=${limit}`),
  getSuppliersSelect: () => request('/suppliers/select'),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (supplierId, data) => request(`/suppliers/${supplierId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (supplierId) => request(`/suppliers/${supplierId}`, { method: 'DELETE' }),
  getSupplierBalance: (supplierId) => request(`/suppliers/${supplierId}/balance`),
  getSupplierSummary: (supplierId) => request(`/suppliers/${supplierId}/summary`),
  createSupplierPayment: (supplierId, data) => request(`/suppliers/${supplierId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateSupplierPayment: (supplierId, paymentId, data) => request(`/suppliers/${supplierId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSupplierPayment: (supplierId, paymentId) => request(`/suppliers/${supplierId}/payments/${paymentId}`, { method: 'DELETE' }),
  createSupplierStockReturn: (supplierId, data) => request(`/suppliers/${supplierId}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),

  getProducts: (skip = 0, limit = 100, search = '') => request(`/products?skip=${skip}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  getProductsSelect: () => request('/products/select'),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (productId, data) => request(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (productId) => request(`/products/${productId}`, { method: 'DELETE' }),

  getBatchesByProduct: (productId) => request(`/batches/product/${productId}`),
  updateBatch: (batchId, data) => request(`/batches/${batchId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getInvoices: (partyOrOptions, skipArg = 0, limitArg = 100) => {
    const options = typeof partyOrOptions === 'object' && partyOrOptions !== null
      ? partyOrOptions
      : { partyId: partyOrOptions, skip: skipArg, limit: limitArg };
    const skip = options.skip ?? 0;
    const limit = options.limit ?? 100;
    const params = new URLSearchParams({ skip, limit });
    if (options.partyId) params.append('party_id', options.partyId);
    if (options.invoiceType) params.append('invoice_type', options.invoiceType);
    if (options.search) params.append('search', options.search);
    if (options.status) params.append('status', options.status);
    return request(`/invoices?${params.toString()}`);
  },
  createPurchaseInvoice: (data) => request('/invoices/purchase', { method: 'POST', body: JSON.stringify(data) }),
  createSellInvoice: (data) => request('/invoices/sell', { method: 'POST', body: JSON.stringify(data) }),
  getInvoice: (invoiceId) => request(`/invoices/${invoiceId}`),
  updateInvoice: (invoiceId, data) => request(`/invoices/${invoiceId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInvoice: (invoiceId) => request(`/invoices/${invoiceId}`, { method: 'DELETE' }),
  processReturn: (invoiceId, data) => request(`/invoices/${invoiceId}/return`, { method: 'POST', body: JSON.stringify(data) }),

  getInvoicePayments: (invoiceId) => request(`/invoices/${invoiceId}/payments`),
  updatePayment: (invoiceId, paymentId, data) => request(`/invoices/${invoiceId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePayment: (invoiceId, paymentId) => request(`/invoices/${invoiceId}/payments/${paymentId}`, { method: 'DELETE' }),

  addPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),

  getTemplates: () => request('/templates'),
  createTemplate: (data) => request('/templates', { method: 'POST', body: JSON.stringify(data) }),
  getTemplate: (templateId) => request(`/templates/${templateId}`),
  updateTemplate: (templateId, data) => request(`/templates/${templateId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  previewTemplate: (templateId, invoiceId) => request(`/invoices/${invoiceId}`),

  getMyTenant: () => request('/tenants/me'),
  updateTenantLogo: (logoUrl) => request('/tenants/me/logo', { method: 'PATCH', body: JSON.stringify({ logo_url: logoUrl }) }),

  getProfitReport: () => request('/reports/profit'),
  getInventoryReport: () => request('/reports/inventory'),
  getStatement: (partyId) => request(`/reports/statement/${partyId}`),
  getDashboardAnalytics: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return request(`/reports/dashboard${qs ? `?${qs}` : ''}`);
  },
  getPartyProfits: (startDate, endDate) => {
    const params = new URLSearchParams();
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);
    const qs = params.toString();
    return request(`/reports/party-profits${qs ? `?${qs}` : ''}`);
  },

  getSettings: () => request('/tenants/me'),
  updateSettings: (data) => request('/tenants/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // Expenses
  getExpenses: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    if (filters.category) params.append('category', filters.category);
    return request(`/expenses?${params.toString()}`);
  },
  getExpenseSummary: (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.date_from) params.append('date_from', filters.date_from);
    if (filters.date_to) params.append('date_to', filters.date_to);
    return request(`/expenses/summary?${params.toString()}`);
  },
  createExpense: (data) => request('/expenses', { method: 'POST', body: JSON.stringify(data) }),
  deleteExpense: (id) => request(`/expenses/${id}`, { method: 'DELETE' }),

  getNetProfitReport: (date_from, date_to) => {
    const params = new URLSearchParams();
    if (date_from) params.append('start_date', date_from);
    if (date_to) params.append('end_date', date_to);
    return request(`/reports/net-profit?${params.toString()}`);
  },

  // Admin Panel
  getAdminStats: () => request('/admin/stats'),
  getAdminTenants: (statusFilter = null) => {
    const params = new URLSearchParams();
    if (statusFilter) params.append('status_filter', statusFilter);
    return request(`/admin/tenants?${params.toString()}`);
  },
  approveTenant: (tenantId) => request(`/admin/tenants/${tenantId}/approve`, { method: 'PATCH' }),
  rejectTenant: (tenantId) => request(`/admin/tenants/${tenantId}/reject`, { method: 'PATCH' }),
  toggleTenantActive: (tenantId) => request(`/admin/tenants/${tenantId}/toggle-active`, { method: 'PATCH' }),
  deleteTenant: (tenantId) => request(`/admin/tenants/${tenantId}`, { method: 'DELETE' }),
  diagnoseTenant: (tenantId) => request(`/admin/tenants/${tenantId}/diagnose`),
  fixTenantStock: (tenantId) => request(`/admin/tenants/${tenantId}/fix-stock`, { method: 'POST' }),
  getAdminUsers: (skip = 0, limit = 100) => request(`/admin/users?skip=${skip}&limit=${limit}`),
  getAdminUserDetails: (userId) => request(`/admin/users/${userId}`),
  deleteAdminUser: (userId) => request(`/admin/users/${userId}`, { method: 'DELETE' }),

  getAdminParties: (tenantId) => request(`/admin/tenants/${tenantId}/parties`),
  getAdminPartySummary: (tenantId, partyId) => request(`/admin/tenants/${tenantId}/parties/${partyId}/summary`),
  updateAdminParty: (tenantId, partyId, data) => request(`/admin/tenants/${tenantId}/parties/${partyId}`, { method: 'PUT', body: JSON.stringify(data) }),

  getAdminInvoices: (tenantId, options = {}) => {
    const params = new URLSearchParams();
    if (options.partyId) params.append('party_id', options.partyId);
    if (options.invoiceType) params.append('invoice_type', options.invoiceType);
    return request(`/admin/tenants/${tenantId}/invoices?${params.toString()}`);
  },
  getAdminInvoice: (tenantId, invoiceId) => request(`/admin/tenants/${tenantId}/invoices/${invoiceId}`),
  updateAdminInvoice: (tenantId, invoiceId, data) => request(`/admin/tenants/${tenantId}/invoices/${invoiceId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteAdminInvoice: (tenantId, invoiceId) => request(`/admin/tenants/${tenantId}/invoices/${invoiceId}`, { method: 'DELETE' }),

  // Generic HTTP helpers
  get: (endpoint) => request(endpoint),
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: (endpoint, data) => request(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: (endpoint, data) => request(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  prefetchAll: async () => {
    try {
      await Promise.allSettled([
        api.getCustomers(),
        api.getSuppliers(),
        api.getProducts(),
        api.getInvoices({}),
        api.getExpenses(),
        api.getExpenseSummary(),
        api.getDashboardAnalytics(),
        api.getProfitReport(),
        api.getInventoryReport()
      ]);
      console.log('Cache warmed up successfully!');
    } catch (err) {
      console.error('Failed to prefetch data', err);
    }
  },
};

export default api;
