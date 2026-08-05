/**
 * @typedef {Object} DashboardKpis
 * @property {number} total_sales
 * @property {number} total_purchases
 * @property {number} gross_profit
 * @property {number} total_expenses
 * @property {number} net_profit
 * @property {number} total_invoices_count
 * @property {number} outstanding_balance
 */

/**
 * @typedef {Object} DashboardTrendPoint
 * @property {string} period
 * @property {number} sales
 * @property {number} purchases
 * @property {number} profit
 */

/**
 * @typedef {Object} TopProductItem
 * @property {string} product_name
 * @property {number} qty_sold
 * @property {number} revenue
 */

/**
 * @typedef {Object} LowStockProductItem
 * @property {string} product_name
 * @property {number} remaining_qty
 * @property {number} min_stock
 */

/**
 * @typedef {Object} TopPartyItem
 * @property {string} party_name
 * @property {string} type
 * @property {number} total_amount
 */

/**
 * @typedef {Object} UnifiedDashboardOut
 * @property {DashboardKpis} kpis
 * @property {DashboardTrendPoint[]} trend
 * @property {TopProductItem[]} top_products
 * @property {LowStockProductItem[]} low_stock_products
 * @property {TopPartyItem[]} top_parties
 */

export {};
