/**
 * @typedef {Object} InvoiceItem
 * @property {string|number} [id] - Item ID
 * @property {string} name - Product Name
 * @property {string} [sku] - Product SKU
 * @property {number} qty - Quantity
 * @property {number} price - Unit Price
 * @property {number} [total] - Line total (qty * price)
 */

/**
 * @typedef {Object} InvoiceData
 * @property {string|number} [id] - Invoice ID
 * @property {string} invoiceNumber - Formatted Invoice Number (e.g., INV-1001)
 * @property {"PURCHASE" | "SALE" | "SELL" | "RETURN"} invoiceType - Type of invoice
 * @property {string} partyName - Customer or Supplier Name
 * @property {string} [partyPhone] - Customer or Supplier Phone
 * @property {string} [partyAddress] - Customer or Supplier Address
 * @property {string} date - Formatted date string
 * @property {InvoiceItem[]} items - List of invoice items
 * @property {number} [deliveryFee=0] - Delivery / Shipping fee
 * @property {number} [discountAmount=0] - Discount amount
 * @property {number} [itemsTotal] - Subtotal of items
 * @property {number} [grandTotal] - Final Total
 * @property {"PAID" | "PARTIAL" | "UNPAID"} [paymentStatus] - Payment Status Tag
 * @property {string} [tenantName] - Company / Tenant Name
 * @property {string} [tenantLogoUrl] - Company Logo URL
 * @property {string} [website] - Company Website
 * @property {string} [footerCustomText] - Custom Footer Note
 */

/**
 * @typedef {Object} InvoiceDocumentProps
 * @property {InvoiceData} data - The standardized invoice data object
 * @property {string} [className] - Optional custom CSS container class
 * @property {boolean} [showPrintButton=false] - Whether to render a print action button
 */

export {};
