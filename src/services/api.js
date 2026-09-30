const RAW_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
const BASE_URL = RAW_BASE_URL.replace(/\/+$/, '');

function buildUrl(endpoint) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${BASE_URL}${path}`;
}

const APP_VERSION = 'v2';

// ─── TTL map per endpoint prefix (ms) ─────────────────────────────────────────
const TTL_MAP = {
  '/products':   10 * 60 * 1000,  // 10 min
  '/batches':    10 * 60 * 1000,
  '/customers':  10 * 60 * 1000,
  '/suppliers':  10 * 60 * 1000,
  '/parties':    10 * 60 * 1000,
  '/invoices':    3 * 60 * 1000,  // 3 min — more volatile
  '/payments':    2 * 60 * 1000,
  '/expenses':    5 * 60 * 1000,
  '/reports':     5 * 60 * 1000,
  '/tenants':    15 * 60 * 1000,
  '/auth':        0,              // never cache
  default:        5 * 60 * 1000,
};

// ─── Invalidation map: mutated prefix → cache prefixes to bust ─────────────────
const INVALIDATION_MAP = {
  '/invoices':   ['/invoices', '/reports', '/parties', '/customers', '/suppliers', '/payments', '/batches', '/products'],
  '/payments':   ['/payments', '/invoices', '/reports', '/parties', '/customers', '/suppliers'],
  '/expenses':   ['/expenses', '/reports'],
  '/products':   ['/products', '/batches'],
  '/batches':    ['/batches', '/products'],
  '/customers':  ['/customers', '/parties', '/reports'],
  '/suppliers':  ['/suppliers', '/parties', '/reports'],
  '/parties':    ['/parties', '/customers', '/suppliers', '/reports'],
  '/tenants':    ['/tenants'],
  '/admin':      ['*'],  // admin mutations bust everything
  default:       ['*'],
};

// ─── In-memory fallback ────────────────────────────────────────────────────────
const memoryCache = new Map();

// ─── Token helpers (localStorage with cookie fallback) ────────────────────────
function getToken() {
  try {
    const ls = localStorage.getItem('access_token');
    if (ls) return ls;
  } catch (_) {}
  // Cookie fallback for private/sandboxed browsers
  const match = document.cookie.match(/(?:^|;\s*)access_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function setToken(token) {
  try {
    localStorage.setItem('access_token', token);
  } catch (_) {}
  // Also persist in a session cookie as fallback (not httpOnly — JS-set)
  document.cookie = `access_token=${encodeURIComponent(token)}; path=/; SameSite=Lax`;
}

function removeToken() {
  try {
    localStorage.removeItem('access_token');
    localStorage.removeItem('erp_user');
  } catch (_) {}
  document.cookie = 'access_token=; path=/; max-age=0';
}

function getTenantId() {
  try {
    const user = JSON.parse(localStorage.getItem('erp_user'));
    return user?.tenant_id || user?.id || 'public';
  } catch (_) {
    return 'public';
  }
}

// ─── Cache key helpers ─────────────────────────────────────────────────────────
function getCacheKey(url) {
  return `erb_${APP_VERSION}_${getTenantId()}_${url}`;
}

function getTTL(url) {
  for (const [prefix, ttl] of Object.entries(TTL_MAP)) {
    if (url.includes(prefix)) return ttl;
  }
  return TTL_MAP.default;
}

// ─── Cache read/write ──────────────────────────────────────────────────────────
function setCache(url, data) {
  const key = getCacheKey(url);
  const ttl = getTTL(url);
  if (ttl === 0) return; // non-cacheable
  const payload = { data, expiresAt: Date.now() + ttl };
  // Memory cache always succeeds
  memoryCache.set(key, payload);
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      // Evict old keys to make room
      evictOldestLocalStorageKeys();
      try { localStorage.setItem(key, JSON.stringify(payload)); } catch (_) {}
    }
  }
}

function getCache(url) {
  const key = getCacheKey(url);
  const now = Date.now();

  // Memory cache first (fastest)
  const mem = memoryCache.get(key);
  if (mem) {
    if (now < mem.expiresAt) return mem.data;
    memoryCache.delete(key);
  }

  // localStorage fallback
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw);
      if (now < cached.expiresAt) {
        memoryCache.set(key, cached); // warm memory cache
        return cached.data;
      }
      localStorage.removeItem(key);
    }
  } catch (_) {}
  return null;
}

function evictOldestLocalStorageKeys() {
  const prefix = `erb_${APP_VERSION}_`;
  const entries = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(prefix)) {
        try {
          const parsed = JSON.parse(localStorage.getItem(k));
          entries.push({ k, expiresAt: parsed?.expiresAt || 0 });
        } catch (_) {}
      }
    }
    // Remove oldest 30%
    entries.sort((a, b) => a.expiresAt - b.expiresAt);
    entries.slice(0, Math.ceil(entries.length * 0.3)).forEach(({ k }) => {
      localStorage.removeItem(k);
    });
  } catch (_) {}
}

// ─── Smart cache invalidation ──────────────────────────────────────────────────
function invalidateCacheFor(mutatedUrl) {
  // Find matching invalidation pattern
  let prefixesToBust = null;
  for (const [pattern, busted] of Object.entries(INVALIDATION_MAP)) {
    if (mutatedUrl.includes(pattern)) {
      prefixesToBust = busted;
      break;
    }
  }
  if (!prefixesToBust) prefixesToBust = INVALIDATION_MAP.default;

  const bustAll = prefixesToBust.includes('*');
  const tenantPrefix = `erb_${APP_VERSION}_${getTenantId()}_`;

  // Bust memory cache
  for (const key of memoryCache.keys()) {
    if (!key.startsWith(tenantPrefix)) continue;
    if (bustAll || prefixesToBust.some((p) => key.includes(p))) {
      memoryCache.delete(key);
    }
  }

  // Bust localStorage
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k || !k.startsWith(tenantPrefix)) continue;
      if (bustAll || prefixesToBust.some((p) => k.includes(p))) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (_) {}
}

// ─── Main request function with retry & signal handling ───────────────────────
async function request(endpoint, options = {}) {
  const url = buildUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();

  if (method === 'GET' && !options.bypassCache) {
    const cached = getCache(url);
    if (cached !== null) return cached;
  }

  const { bypassCache, retries = 2, ...fetchOptions } = options;

  const config = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    },
    ...fetchOptions,
  };

  const token = getToken();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }

  let response;
  let attempt = 0;
  while (attempt <= retries) {
    try {
      response = await fetch(url, config);
      // Retry on transient 502/503/504 server errors
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, attempt * 300));
        continue;
      }
      break;
    } catch (error) {
      if (error.name === 'AbortError') {
        // Quietly rethrow AbortError so caller can detect request cancellation
        throw error;
      }
      if (attempt < retries) {
        attempt++;
        await new Promise((r) => setTimeout(r, attempt * 300));
        continue;
      }
      console.error('Network/CORS error', error);
      throw error;
    }
  }

  if (response.status === 401) {
    removeToken();
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    const message = error.detail || `Request failed: ${response.status}`;
    console.error('API error', { status: response.status, message });
    throw new Error(message);
  }

  if (response.status === 204) return null;

  const data = await response.json();

  if (method === 'GET') {
    setCache(url, data);
  } else {
    // Smart invalidation — only bust related cache keys
    invalidateCacheFor(endpoint);
  }

  return data;
}

// ─── Public API surface ────────────────────────────────────────────────────────
export const api = {
  // ── Auth ────────────────────────────────────────────────────────────────────
  login: (data) => request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(data)
  }),
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),

  // ── Parties ─────────────────────────────────────────────────────────────────
  getParties: (skip = 0, limit = 100, opts = {}) => request(`/parties?skip=${skip}&limit=${limit}`, opts),
  getPartiesSelect: (opts = {}) => request('/parties/select', opts),
  createParty: (data) => request('/parties', { method: 'POST', body: JSON.stringify(data) }),
  deleteParty: (partyId) => request(`/parties/${partyId}`, { method: 'DELETE' }),
  getPartyBalance: (partyId) => request(`/parties/${partyId}/balance`),
  getPartySummary: (partyId) => request(`/parties/${partyId}/summary`),
  createPartyPayment: (partyId, data) => request(`/parties/${partyId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updatePartyPayment: (partyId, paymentId, data) => request(`/parties/${partyId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePartyPayment: (partyId, paymentId) => request(`/parties/${partyId}/payments/${paymentId}`, { method: 'DELETE' }),
  createStockReturn: (partyId, data) => request(`/parties/${partyId}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Customers ───────────────────────────────────────────────────────────────
  getCustomers: (skip = 0, limit = 100, search = '', opts = {}) => request(`/customers?skip=${skip}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`, opts),
  getCustomersSelect: (opts = {}) => request('/customers/select', opts),
  createCustomer: (data) => request('/customers', { method: 'POST', body: JSON.stringify(data) }),
  updateCustomer: (customerId, data) => request(`/customers/${customerId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteCustomer: (customerId) => request(`/customers/${customerId}`, { method: 'DELETE' }),
  getCustomerBalance: (customerId) => request(`/customers/${customerId}/balance`),
  getCustomerSummary: (customerId) => request(`/customers/${customerId}/summary`),
  createCustomerPayment: (customerId, data) => request(`/customers/${customerId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateCustomerPayment: (customerId, paymentId, data) => request(`/customers/${customerId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteCustomerPayment: (customerId, paymentId) => request(`/customers/${customerId}/payments/${paymentId}`, { method: 'DELETE' }),
  createCustomerAdvancePayment: (customerId, data) => request(`/customers/${customerId}/advance-payment`, { method: 'POST', body: JSON.stringify(data) }),
  createCustomerStockReturn: (customerId, data) => request(`/customers/${customerId}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Suppliers ───────────────────────────────────────────────────────────────
  getSuppliers: (skip = 0, limit = 100, search = '', opts = {}) => request(`/suppliers?skip=${skip}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}`, opts),
  getSuppliersSelect: (opts = {}) => request('/suppliers/select', opts),
  createSupplier: (data) => request('/suppliers', { method: 'POST', body: JSON.stringify(data) }),
  updateSupplier: (supplierId, data) => request(`/suppliers/${supplierId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteSupplier: (supplierId) => request(`/suppliers/${supplierId}`, { method: 'DELETE' }),
  getSupplierBalance: (supplierId) => request(`/suppliers/${supplierId}/balance`),
  getSupplierSummary: (supplierId) => request(`/suppliers/${supplierId}/summary`),
  createSupplierPayment: (supplierId, data) => request(`/suppliers/${supplierId}/payments`, { method: 'POST', body: JSON.stringify(data) }),
  updateSupplierPayment: (supplierId, paymentId, data) => request(`/suppliers/${supplierId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteSupplierPayment: (supplierId, paymentId) => request(`/suppliers/${supplierId}/payments/${paymentId}`, { method: 'DELETE' }),
  createSupplierAdvancePayment: (supplierId, data) => request(`/suppliers/${supplierId}/advance-payment`, { method: 'POST', body: JSON.stringify(data) }),
  createSupplierStockReturn: (supplierId, data) => request(`/suppliers/${supplierId}/stock-return`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Products ────────────────────────────────────────────────────────────────
  getProducts: (skip = 0, limit = 100, search = '', status = '', opts = {}) =>
    request(`/products?skip=${skip}&limit=${limit}${search ? `&search=${encodeURIComponent(search)}` : ''}${status && status !== 'all' ? `&status=${encodeURIComponent(status)}` : ''}`, opts),
  getProductsSelect: (opts = {}) => request('/products/select', opts),
  createProduct: (data) => request('/products', { method: 'POST', body: JSON.stringify(data) }),
  updateProduct: (productId, data) => request(`/products/${productId}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProduct: (productId) => request(`/products/${productId}`, { method: 'DELETE' }),

  // ── Batches ─────────────────────────────────────────────────────────────────
  getBatchesByProduct: (productId, opts = {}) => request(`/batches/product/${productId}`, opts),
  updateBatch: (batchId, data) => request(`/batches/${batchId}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Invoices ─────────────────────────────────────────────────────────────────
  getInvoices: (partyOrOptions, skipArg = 0, limitArg = 100, extraOpts = {}) => {
    const options = typeof partyOrOptions === 'object' && partyOrOptions !== null
      ? partyOrOptions
      : { partyId: partyOrOptions, skip: skipArg, limit: limitArg, ...extraOpts };
    const skip = options.skip ?? 0;
    const limit = options.limit ?? 100;
    const params = new URLSearchParams({ skip, limit });
    if (options.partyId) params.append('party_id', options.partyId);
    if (options.invoiceType) params.append('invoice_type', options.invoiceType);
    if (options.search) params.append('search', options.search);
    if (options.status) params.append('status', options.status);
    return request(`/invoices?${params.toString()}`, options.signal ? { signal: options.signal } : extraOpts);
  },
  createPurchaseInvoice: (data) => request('/invoices/purchase', { method: 'POST', body: JSON.stringify(data) }),
  createSellInvoice: (data) => request('/invoices/sell', { method: 'POST', body: JSON.stringify(data) }),
  getInvoice: (invoiceId) => request(`/invoices/${invoiceId}`),
  downloadInvoicePdf: async (invoiceId, fallbackFileName) => {
    const url = buildUrl(`/invoices/${invoiceId}/pdf`);
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const response = await fetch(url, { headers });
    if (!response.ok) throw new Error(`Failed to download PDF: ${response.status}`);
    let fileName = fallbackFileName;
    const contentDisposition = response.headers.get('Content-Disposition');
    if (contentDisposition) {
      const matchUtf8 = contentDisposition.match(/filename\*=UTF-8''([^;]+)/i);
      if (matchUtf8?.[1]) {
        fileName = decodeURIComponent(matchUtf8[1]);
      } else {
        const matchStandard = contentDisposition.match(/filename="?([^";]+)"?/i);
        if (matchStandard?.[1]) fileName = matchStandard[1];
      }
    }
    const blob = await response.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = fileName || `Invoice-${invoiceId}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(blobUrl);
  },
  updateInvoice: (invoiceId, data) => request(`/invoices/${invoiceId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteInvoice: (invoiceId) => request(`/invoices/${invoiceId}`, { method: 'DELETE' }),
  processReturn: (invoiceId, data) => request(`/invoices/${invoiceId}/return`, { method: 'POST', body: JSON.stringify(data) }),

  // ── Payments ─────────────────────────────────────────────────────────────────
  getInvoicePayments: (invoiceId) => request(`/invoices/${invoiceId}/payments`),
  updatePayment: (invoiceId, paymentId, data) => request(`/invoices/${invoiceId}/payments/${paymentId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deletePayment: (invoiceId, paymentId) => request(`/invoices/${invoiceId}/payments/${paymentId}`, { method: 'DELETE' }),
  addPayment: (data) => request('/payments', { method: 'POST', body: JSON.stringify(data) }),

  // ── Templates ────────────────────────────────────────────────────────────────
  getTemplates: () => request('/templates'),
  createTemplate: (data) => request('/templates', { method: 'POST', body: JSON.stringify(data) }),
  getTemplate: (templateId) => request(`/templates/${templateId}`),
  updateTemplate: (templateId, data) => request(`/templates/${templateId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  previewTemplate: (templateId, invoiceId) => request(`/invoices/${invoiceId}`),

  // ── Tenant / Settings ────────────────────────────────────────────────────────
  getMyTenant: () => request('/tenants/me'),
  updateTenantLogo: (logoUrl) => request('/tenants/me/logo', { method: 'PATCH', body: JSON.stringify({ logo_url: logoUrl }) }),
  getSettings: () => request('/tenants/me'),
  updateSettings: (data) => request('/tenants/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // ── Reports ──────────────────────────────────────────────────────────────────
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

  // ── Expenses ─────────────────────────────────────────────────────────────────
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

  // ── Net Profit ───────────────────────────────────────────────────────────────
  getNetProfitReport: (date_from, date_to) => {
    const params = new URLSearchParams();
    if (date_from) params.append('start_date', date_from);
    if (date_to) params.append('end_date', date_to);
    return request(`/reports/net-profit?${params.toString()}`);
  },

  // ── Admin ─────────────────────────────────────────────────────────────────────
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

  // ── Generic helpers ───────────────────────────────────────────────────────────
  get: (endpoint) => request(endpoint),
  post: (endpoint, data) => request(endpoint, { method: 'POST', body: data ? JSON.stringify(data) : undefined }),
  put: (endpoint, data) => request(endpoint, { method: 'PUT', body: data ? JSON.stringify(data) : undefined }),
  patch: (endpoint, data) => request(endpoint, { method: 'PATCH', body: data ? JSON.stringify(data) : undefined }),
  delete: (endpoint) => request(endpoint, { method: 'DELETE' }),

  // ── Cache utilities ───────────────────────────────────────────────────────────
  /** Force-bust all cache for the current tenant */
  clearAllCache: () => {
    memoryCache.clear();
    const prefix = `erb_${APP_VERSION}_${getTenantId()}_`;
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(prefix)) keys.push(k);
      }
      keys.forEach((k) => localStorage.removeItem(k));
    } catch (_) {}
  },

  /** Warm up critical caches on app load */
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
        api.getInventoryReport(),
      ]);
    } catch (err) {
      console.error('Prefetch error', err);
    }
  },

  // ── Token helpers (exported for auth store) ───────────────────────────────────
  _setToken: setToken,
  _removeToken: removeToken,
  _getToken: getToken,
};

export default api;
