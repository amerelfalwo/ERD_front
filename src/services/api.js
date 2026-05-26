const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

function buildUrl(endpoint) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${BASE_URL}${path}`;
}

async function request(endpoint, options = {}) {
  const url = buildUrl(endpoint);
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
  return response.json();
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
  deleteParty: (id) => request(`/parties/${id}`, { method: 'DELETE' }),
  updateParty: (id, data) => request(`/parties/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getPartyBalance: (id) => request(`/parties/${id}/balance`),
  getPartySummary: (id) => request(`/parties/${id}/summary`),
  createPartyPayment: (id, data) => request(`/parties/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updatePartyPayment: (id, paymentId, data) => request(`/parties/${id}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePartyPayment: (id, paymentId) => request(`/parties/${id}/payments/${paymentId}`, { method: 'DELETE' }),
  createPartyStockReturn: (id, data) => request(`/parties/${id}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),


  getSuppliers: (skip = 0, limit = 100) => request(`/suppliers?skip=${skip}&limit=${limit}`),
  getSuppliersSelect: () => request('/suppliers/select'),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  deleteSupplier: (id) => request(`/suppliers/${id}`, { method: 'DELETE' }),
  updateSupplier: (id, data) => request(`/suppliers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getSupplierBalance: (id) => request(`/suppliers/${id}/balance`),
  getSupplierSummary: (id) => request(`/suppliers/${id}/summary`),
  createSupplierPayment: (id, data) => request(`/suppliers/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateSupplierPayment: (id, paymentId, data) => request(`/suppliers/${id}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSupplierPayment: (id, paymentId) => request(`/suppliers/${id}/payments/${paymentId}`, { method: 'DELETE' }),
  createSupplierStockReturn: (id, data) => request(`/suppliers/${id}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),

  getCustomers: (skip = 0, limit = 100) => request(`/customers?skip=${skip}&limit=${limit}`),
  getCustomersSelect: () => request('/customers/select'),
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),
  updateCustomer: (id, data) => request(`/customers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  getCustomerBalance: (id) => request(`/customers/${id}/balance`),
  getCustomerSummary: (id) => request(`/customers/${id}/summary`),
  createCustomerPayment: (id, data) => request(`/customers/${id}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateCustomerPayment: (id, paymentId, data) => request(`/customers/${id}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCustomerPayment: (id, paymentId) => request(`/customers/${id}/payments/${paymentId}`, { method: 'DELETE' }),
  createCustomerStockReturn: (id, data) => request(`/customers/${id}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),

  getProducts: (skip = 0, limit = 100) => request(`/products?skip=${skip}&limit=${limit}`),
  getProductsSelect: () => request('/products/select'),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (productId, data) => request(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (productId) => request(`/products/${productId}`, { method: 'DELETE' }),

  getBatchesByProduct: (productId) => request(`/batches/product/${productId}`),
  updateBatch: (batchId, data) => request(`/batches/${batchId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  getInvoices: (partyId, skip = 0, limit = 100) => {
    const params = new URLSearchParams({ skip, limit });
    if (partyId) params.append('party_id', partyId);
    return request(`/invoices?${params.toString()}`);
  },
  createPurchaseInvoice: (data) => request('/invoices/purchase', { method: 'POST', body: JSON.stringify(data) }),
  createSaleInvoice: (data) => request('/invoices/sale', { method: 'POST', body: JSON.stringify(data) }),
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
  getDashboardAnalytics: () => request('/reports/dashboard'),
  getPartyProfits: () => request('/reports/party-profits'),

  getSettings: () => request('/tenants/me'),
  updateSettings: (data) => request('/tenants/me', { method: 'PATCH', body: JSON.stringify(data) }),
};

export default api;
