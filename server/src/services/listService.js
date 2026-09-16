/**
 * Server-side list queries (search / filter / sort / paginate) and CRUD for the
 * data pages. Exports return a Mongoose cursor so CSV can stream.
 */
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { Order, REVENUE_STATUSES } from '../models/Order.js';
import { Setting } from '../models/Setting.js';
import { ApiError } from '../utils/ApiError.js';
import { startOfDay, endOfDay } from '../utils/dateRange.js';

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const searchRegex = (q) => new RegExp(escapeRegex(q), 'i');

function paginate(query, total) {
  const pages = Math.max(1, Math.ceil(total / query.limit));
  return { page: query.page, limit: query.limit, total, pages };
}

// ---------------------------------------------------------------- customers

export function customerFilter(q) {
  const filter = {};
  if (q.search) filter.$or = [{ name: searchRegex(q.search) }, { email: searchRegex(q.search) }];
  if (q.segment) filter.segment = q.segment;
  if (q.country) filter.country = q.country;
  return filter;
}

export async function listCustomers(q) {
  const filter = customerFilter(q);
  const [items, total] = await Promise.all([
    Customer.find(filter).sort({ [q.sort]: q.order === 'asc' ? 1 : -1, _id: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Customer.countDocuments(filter),
  ]);
  return { items: items.map(normalise), pagination: paginate(q, total) };
}

export async function getCustomer(id) {
  const customer = await Customer.findById(id).lean();
  if (!customer) throw ApiError.notFound('Customer not found');
  const orders = await Order.find({ customer: id }).sort({ createdAt: -1 }).limit(10).select('orderNumber total status createdAt items').lean();
  return { ...normalise(customer), recentOrders: orders.map(normalise) };
}

export function customerCountries() {
  return Customer.distinct('country').then((a) => a.sort());
}

export function customersCursor(q) {
  return Customer.find(customerFilter(q)).sort({ [q.sort]: q.order === 'asc' ? 1 : -1 }).lean().cursor();
}

// ---------------------------------------------------------------- products

export async function productFilter(q) {
  const filter = {};
  if (q.search) filter.$or = [{ name: searchRegex(q.search) }, { sku: searchRegex(q.search) }];
  if (q.category) filter.category = q.category;
  if (q.status === 'archived') filter.isActive = false;
  else if (q.status === 'low_stock') {
    const s = await Setting.get();
    filter.isActive = true;
    filter.stock = { $lte: s.lowStockThreshold };
  } else if (q.status === 'active') filter.isActive = true;
  return filter;
}

/** Attaches units sold + revenue (all time) to each product row for the table. */
async function attachSales(products) {
  if (!products.length) return products;
  const ids = products.map((p) => p._id);
  const rows = await Order.aggregate([
    { $match: { status: { $in: REVENUE_STATUSES }, 'items.product': { $in: ids } } },
    { $unwind: '$items' },
    { $match: { 'items.product': { $in: ids } } },
    { $group: { _id: '$items.product', units: { $sum: '$items.quantity' }, revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } } } },
  ]);
  const map = new Map(rows.map((r) => [String(r._id), r]));
  return products.map((p) => ({ ...p, unitsSold: map.get(String(p._id))?.units || 0, revenue: Math.round((map.get(String(p._id))?.revenue || 0) * 100) / 100 }));
}

export async function listProducts(q) {
  const filter = await productFilter(q);
  const [items, total] = await Promise.all([
    Product.find(filter).sort({ [q.sort]: q.order === 'asc' ? 1 : -1, _id: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    Product.countDocuments(filter),
  ]);
  return { items: (await attachSales(items)).map(normalise), pagination: paginate(q, total) };
}

export async function createProduct(body) {
  const product = await Product.create({ ...body, sku: body.sku.toUpperCase(), color: pickColor(body.name) });
  return normalise(product.toObject());
}

export async function updateProduct(id, body) {
  const product = await Product.findByIdAndUpdate(id, { $set: { ...body, ...(body.sku ? { sku: body.sku.toUpperCase() } : {}) } }, { new: true, runValidators: true }).lean();
  if (!product) throw ApiError.notFound('Product not found');
  return normalise(product);
}

/** Soft delete — orders still reference the product snapshot. */
export async function archiveProduct(id) {
  const product = await Product.findByIdAndUpdate(id, { $set: { isActive: false } }, { new: true }).lean();
  if (!product) throw ApiError.notFound('Product not found');
  return normalise(product);
}

export async function productsCursor(q) {
  const filter = await productFilter(q);
  return Product.find(filter).sort({ [q.sort]: q.order === 'asc' ? 1 : -1 }).lean().cursor();
}

// ---------------------------------------------------------------- orders

export function orderFilter(q) {
  const filter = {};
  if (q.search) filter.$or = [{ orderNumber: searchRegex(q.search) }, { customerName: searchRegex(q.search) }, { customerEmail: searchRegex(q.search) }];
  if (q.status) filter.status = q.status;
  if (q.paymentMethod) filter.paymentMethod = q.paymentMethod;
  if (q.from || q.to) {
    filter.createdAt = {};
    if (q.from) filter.createdAt.$gte = startOfDay(new Date(q.from));
    if (q.to) filter.createdAt.$lte = endOfDay(new Date(q.to));
  }
  return filter;
}

export async function listOrders(q) {
  const filter = orderFilter(q);
  const [items, total] = await Promise.all([
    Order.find(filter).sort({ [q.sort]: q.order === 'asc' ? 1 : -1, _id: 1 }).skip((q.page - 1) * q.limit).limit(q.limit).select('-items.unitCost').lean(),
    Order.countDocuments(filter),
  ]);
  return { items: items.map((o) => ({ ...normalise(o), itemCount: o.items.reduce((s, i) => s + i.quantity, 0) })), pagination: paginate(q, total) };
}

export async function getOrder(id) {
  const order = await Order.findById(id).lean();
  if (!order) throw ApiError.notFound('Order not found');
  return normalise(order);
}

const TRANSITIONS = {
  pending: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered', 'refunded'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export async function updateOrderStatus(id, status) {
  const order = await Order.findById(id);
  if (!order) throw ApiError.notFound('Order not found');
  if (order.status === status) return normalise(order.toObject());
  if (!TRANSITIONS[order.status].includes(status)) {
    throw ApiError.badRequest(`Cannot change status from "${order.status}" to "${status}"`, {
      allowed: TRANSITIONS[order.status],
    });
  }
  const wasRevenue = REVENUE_STATUSES.includes(order.status);
  const isRevenue = REVENUE_STATUSES.includes(status);
  order.status = status;
  order.updatedAt = new Date();
  await order.save();

  // Keep denormalised customer totals consistent with revenue-counting rules.
  if (wasRevenue !== isRevenue) {
    const delta = isRevenue ? order.total : -order.total;
    await Customer.updateOne({ _id: order.customer }, { $inc: { totalSpent: delta, orderCount: isRevenue ? 1 : -1 } });
  }
  return { ...normalise(order.toObject()), allowedTransitions: TRANSITIONS[status] };
}

export function allowedTransitions(status) {
  return TRANSITIONS[status] || [];
}

export function ordersCursor(q) {
  return Order.find(orderFilter(q)).sort({ [q.sort]: q.order === 'asc' ? 1 : -1 }).lean().cursor();
}

// ---------------------------------------------------------------- helpers

function normalise(doc) {
  if (!doc) return doc;
  const { _id, __v, ...rest } = doc;
  return { id: String(_id), ...rest };
}

const PALETTE = ['#4318FF', '#39B8FF', '#05CD99', '#FFB547', '#EE5D50', '#6C63FF', '#F97316', '#0EA5E9'];
function pickColor(seedStr = '') {
  let h = 0;
  for (const ch of seedStr) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}
