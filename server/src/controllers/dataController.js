import * as list from '../services/listService.js';
import { sendCsv } from '../utils/csv.js';
import { CATEGORIES } from '../models/Product.js';
import { ORDER_STATUSES, PAYMENT_METHODS } from '../models/Order.js';
import { SEGMENTS } from '../models/Customer.js';

const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
const stamp = () => new Date().toISOString().slice(0, 10);
const money = (v) => (Number(v) || 0).toFixed(2);
const date = (v) => (v ? new Date(v).toISOString().slice(0, 10) : '');

// ---------------------------------------------------------------- customers
export async function customers(req, res) {
  ok(res, await list.listCustomers(req.query));
}
export async function customer(req, res) {
  ok(res, await list.getCustomer(req.params.id));
}
export async function customerFilters(_req, res) {
  ok(res, { segments: SEGMENTS, countries: await list.customerCountries() });
}
export async function exportCustomers(req, res) {
  await sendCsv(
    res,
    `customers_${stamp()}.csv`,
    [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
      { key: 'country', label: 'Country' },
      { key: 'city', label: 'City' },
      { key: 'segment', label: 'Segment' },
      { key: 'orderCount', label: 'Orders' },
      { key: 'totalSpent', label: 'Total spent', format: money },
      { key: 'createdAt', label: 'Joined', format: date },
      { key: 'lastOrderAt', label: 'Last order', format: date },
    ],
    list.customersCursor(req.query),
  );
}

// ---------------------------------------------------------------- products
export async function products(req, res) {
  ok(res, await list.listProducts(req.query));
}
export async function productFilters(_req, res) {
  ok(res, { categories: CATEGORIES, statuses: ['active', 'archived', 'low_stock'] });
}
export async function createProduct(req, res) {
  ok(res, await list.createProduct(req.body), 201);
}
export async function updateProduct(req, res) {
  ok(res, await list.updateProduct(req.params.id, req.body));
}
export async function archiveProduct(req, res) {
  ok(res, await list.archiveProduct(req.params.id));
}
export async function exportProducts(req, res) {
  await sendCsv(
    res,
    `products_${stamp()}.csv`,
    [
      { key: 'name', label: 'Product' },
      { key: 'sku', label: 'SKU' },
      { key: 'category', label: 'Category' },
      { key: 'price', label: 'Price', format: money },
      { key: 'cost', label: 'Cost', format: money },
      { key: 'stock', label: 'Stock' },
      { key: 'rating', label: 'Rating' },
      { key: 'isActive', label: 'Active', format: (v) => (v ? 'yes' : 'no') },
    ],
    await list.productsCursor(req.query),
  );
}

// ---------------------------------------------------------------- orders
export async function orders(req, res) {
  ok(res, await list.listOrders(req.query));
}
export async function order(req, res) {
  const o = await list.getOrder(req.params.id);
  ok(res, { ...o, allowedTransitions: list.allowedTransitions(o.status) });
}
export async function orderFilters(_req, res) {
  ok(res, { statuses: ORDER_STATUSES, paymentMethods: PAYMENT_METHODS });
}
export async function updateOrderStatus(req, res) {
  ok(res, await list.updateOrderStatus(req.params.id, req.body.status));
}
export async function exportOrders(req, res) {
  await sendCsv(
    res,
    `orders_${stamp()}.csv`,
    [
      { key: 'orderNumber', label: 'Order #' },
      { key: 'createdAt', label: 'Date', format: date },
      { key: 'customerName', label: 'Customer' },
      { key: 'customerEmail', label: 'Email' },
      { key: 'items', label: 'Items', format: (items) => items.reduce((s, i) => s + i.quantity, 0) },
      { key: 'subtotal', label: 'Subtotal', format: money },
      { key: 'discount', label: 'Discount', format: money },
      { key: 'tax', label: 'Tax', format: money },
      { key: 'total', label: 'Total', format: money },
      { key: 'status', label: 'Status' },
      { key: 'paymentMethod', label: 'Payment' },
      { key: 'channel', label: 'Channel' },
      { key: 'country', label: 'Country' },
    ],
    list.ordersCursor(req.query),
  );
}
