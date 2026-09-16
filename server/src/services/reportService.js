/**
 * Report builder. Each report type returns:
 *   { summary: [{label, value, format}], columns: [{key,label,format}], rows: [...], chart: {...} }
 * The same column definitions drive the CSV export so preview and file always match.
 */
import { Order, REVENUE_STATUSES } from '../models/Order.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { Session } from '../models/Session.js';
import { ApiError } from '../utils/ApiError.js';
import { fillSeries, truncExpr, round } from '../utils/dateRange.js';

const money = (v) => round(v, 2);
const between = (field, from, to) => ({ [field]: { $gte: from, $lte: to } });

const REPORTS = {
  // Revenue per bucket, optionally restricted to a product category
  async revenue(range, f) {
    const { from, to, granularity } = range;
    const catMatch = f.category ? { 'items.category': f.category } : {};
    const rows = await Order.aggregate([
      { $match: { ...between('createdAt', from, to), status: { $in: REVENUE_STATUSES }, ...catMatch } },
      { $unwind: '$items' },
      ...(f.category ? [{ $match: { 'items.category': f.category } }] : []),
      {
        $group: {
          _id: truncExpr('$createdAt', granularity),
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          cost: { $sum: { $multiply: ['$items.quantity', '$items.unitCost'] } },
          units: { $sum: '$items.quantity' },
          orders: { $addToSet: '$_id' },
        },
      },
      { $project: { revenue: 1, cost: 1, units: 1, orders: { $size: '$orders' } } },
      { $sort: { _id: 1 } },
    ]);
    const series = fillSeries(rows, from, to, granularity, ['revenue', 'cost', 'units', 'orders']).map((p) => ({
      ...p,
      profit: money(p.revenue - p.cost),
      margin: p.revenue ? round(((p.revenue - p.cost) / p.revenue) * 100, 1) : 0,
      aov: p.orders ? money(p.revenue / p.orders) : 0,
    }));
    const tot = series.reduce((a, p) => ({ revenue: a.revenue + p.revenue, profit: a.profit + p.profit, orders: a.orders + p.orders, units: a.units + p.units }), { revenue: 0, profit: 0, orders: 0, units: 0 });
    return {
      summary: [
        { label: 'Revenue', value: money(tot.revenue), format: 'currency' },
        { label: 'Gross profit', value: money(tot.profit), format: 'currency' },
        { label: 'Orders', value: tot.orders, format: 'number' },
        { label: 'Units sold', value: tot.units, format: 'number' },
      ],
      columns: [
        { key: 'date', label: 'Period' },
        { key: 'revenue', label: 'Revenue', format: 'currency' },
        { key: 'cost', label: 'Cost', format: 'currency' },
        { key: 'profit', label: 'Profit', format: 'currency' },
        { key: 'margin', label: 'Margin %', format: 'percent' },
        { key: 'orders', label: 'Orders', format: 'number' },
        { key: 'units', label: 'Units', format: 'number' },
        { key: 'aov', label: 'AOV', format: 'currency' },
      ],
      rows: series,
      chart: { type: 'area', x: 'date', series: [{ key: 'revenue', label: 'Revenue' }, { key: 'profit', label: 'Profit' }] },
    };
  },

  async orders(range, f) {
    const { from, to } = range;
    const match = { ...between('createdAt', from, to), ...(f.status ? { status: f.status } : {}), ...(f.country ? { country: f.country } : {}) };
    const rows = await Order.find(match).sort({ createdAt: -1 }).limit(2000).lean();
    const mapped = rows.map((o) => ({
      orderNumber: o.orderNumber,
      date: o.createdAt.toISOString().slice(0, 10),
      customer: o.customerName,
      email: o.customerEmail,
      items: o.items.reduce((s, i) => s + i.quantity, 0),
      total: money(o.total),
      status: o.status,
      paymentMethod: o.paymentMethod,
      channel: o.channel,
      country: o.country,
    }));
    const byStatus = {};
    for (const r of mapped) byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    return {
      summary: [
        { label: 'Orders', value: mapped.length, format: 'number' },
        { label: 'Order value', value: money(mapped.reduce((s, r) => s + r.total, 0)), format: 'currency' },
        { label: 'Delivered', value: byStatus.delivered || 0, format: 'number' },
        { label: 'Cancelled / refunded', value: (byStatus.cancelled || 0) + (byStatus.refunded || 0), format: 'number' },
      ],
      columns: [
        { key: 'orderNumber', label: 'Order #' },
        { key: 'date', label: 'Date' },
        { key: 'customer', label: 'Customer' },
        { key: 'email', label: 'Email' },
        { key: 'items', label: 'Items', format: 'number' },
        { key: 'total', label: 'Total', format: 'currency' },
        { key: 'status', label: 'Status', format: 'status' },
        { key: 'paymentMethod', label: 'Payment' },
        { key: 'channel', label: 'Channel' },
        { key: 'country', label: 'Country' },
      ],
      rows: mapped,
      chart: { type: 'bar', x: 'status', series: [{ key: 'count', label: 'Orders' }], data: Object.entries(byStatus).map(([status, count]) => ({ status, count })) },
      note: mapped.length === 2000 ? 'Preview limited to the latest 2,000 orders. CSV export includes all matching rows.' : undefined,
    };
  },

  async customers(range, f) {
    const { from, to } = range;
    const match = { ...between('createdAt', from, to), ...(f.segment ? { segment: f.segment } : {}), ...(f.country ? { country: f.country } : {}) };
    const rows = await Customer.find(match).sort({ totalSpent: -1 }).limit(2000).lean();
    const mapped = rows.map((c) => ({
      name: c.name,
      email: c.email,
      country: c.country,
      city: c.city,
      segment: c.segment,
      joined: c.createdAt.toISOString().slice(0, 10),
      orders: c.orderCount,
      totalSpent: money(c.totalSpent),
      lastOrder: c.lastOrderAt ? c.lastOrderAt.toISOString().slice(0, 10) : '',
    }));
    const bySeg = {};
    for (const r of mapped) bySeg[r.segment] = (bySeg[r.segment] || 0) + 1;
    return {
      summary: [
        { label: 'Customers acquired', value: mapped.length, format: 'number' },
        { label: 'Lifetime revenue', value: money(mapped.reduce((s, r) => s + r.totalSpent, 0)), format: 'currency' },
        { label: 'Avg orders', value: mapped.length ? round(mapped.reduce((s, r) => s + r.orders, 0) / mapped.length, 1) : 0, format: 'number' },
        { label: 'VIP', value: bySeg.vip || 0, format: 'number' },
      ],
      columns: [
        { key: 'name', label: 'Name' },
        { key: 'email', label: 'Email' },
        { key: 'country', label: 'Country' },
        { key: 'city', label: 'City' },
        { key: 'segment', label: 'Segment', format: 'status' },
        { key: 'joined', label: 'Joined' },
        { key: 'orders', label: 'Orders', format: 'number' },
        { key: 'totalSpent', label: 'Total spent', format: 'currency' },
        { key: 'lastOrder', label: 'Last order' },
      ],
      rows: mapped,
      chart: { type: 'bar', x: 'segment', series: [{ key: 'count', label: 'Customers' }], data: Object.entries(bySeg).map(([segment, count]) => ({ segment, count })) },
      note: mapped.length === 2000 ? 'Preview limited to 2,000 customers. CSV export includes all matching rows.' : undefined,
    };
  },

  async products(range, f) {
    const { from, to } = range;
    const sales = await Order.aggregate([
      { $match: { ...between('createdAt', from, to), status: { $in: REVENUE_STATUSES } } },
      { $unwind: '$items' },
      ...(f.category ? [{ $match: { 'items.category': f.category } }] : []),
      {
        $group: {
          _id: '$items.product',
          units: { $sum: '$items.quantity' },
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          cost: { $sum: { $multiply: ['$items.quantity', '$items.unitCost'] } },
          orders: { $addToSet: '$_id' },
        },
      },
    ]);
    const salesMap = new Map(sales.map((s) => [String(s._id), s]));
    const products = await Product.find(f.category ? { category: f.category } : {}).lean();
    const mapped = products
      .map((p) => {
        const s = salesMap.get(String(p._id)) || { units: 0, revenue: 0, cost: 0, orders: [] };
        return {
          name: p.name,
          sku: p.sku,
          category: p.category,
          price: money(p.price),
          stock: p.stock,
          rating: p.rating,
          units: s.units,
          orders: s.orders.length,
          revenue: money(s.revenue),
          profit: money(s.revenue - s.cost),
          status: p.isActive ? 'active' : 'archived',
        };
      })
      .sort((a, b) => b.revenue - a.revenue);
    const byCat = {};
    for (const r of mapped) byCat[r.category] = (byCat[r.category] || 0) + r.revenue;
    return {
      summary: [
        { label: 'Products', value: mapped.length, format: 'number' },
        { label: 'Revenue', value: money(mapped.reduce((s, r) => s + r.revenue, 0)), format: 'currency' },
        { label: 'Units sold', value: mapped.reduce((s, r) => s + r.units, 0), format: 'number' },
        { label: 'Gross profit', value: money(mapped.reduce((s, r) => s + r.profit, 0)), format: 'currency' },
      ],
      columns: [
        { key: 'name', label: 'Product' },
        { key: 'sku', label: 'SKU' },
        { key: 'category', label: 'Category' },
        { key: 'price', label: 'Price', format: 'currency' },
        { key: 'stock', label: 'Stock', format: 'number' },
        { key: 'rating', label: 'Rating', format: 'number' },
        { key: 'units', label: 'Units sold', format: 'number' },
        { key: 'orders', label: 'Orders', format: 'number' },
        { key: 'revenue', label: 'Revenue', format: 'currency' },
        { key: 'profit', label: 'Profit', format: 'currency' },
        { key: 'status', label: 'Status', format: 'status' },
      ],
      rows: mapped,
      chart: { type: 'bar', x: 'category', series: [{ key: 'revenue', label: 'Revenue' }], data: Object.entries(byCat).map(([category, revenue]) => ({ category, revenue: money(revenue) })).sort((a, b) => b.revenue - a.revenue) },
    };
  },

  async engagement(range) {
    const { from, to, granularity } = range;
    const rows = await Session.aggregate([
      { $match: between('startedAt', from, to) },
      {
        $group: {
          _id: truncExpr('$startedAt', granularity),
          sessions: { $sum: 1 },
          pageViews: { $sum: '$pageViews' },
          duration: { $sum: '$durationSec' },
          purchases: { $sum: { $cond: [{ $eq: ['$funnelStage', 'purchase'] }, 1, 0] } },
          checkouts: { $sum: { $cond: [{ $gte: ['$funnelIndex', 3] }, 1, 0] } },
          carts: { $sum: { $cond: [{ $gte: ['$funnelIndex', 2] }, 1, 0] } },
          users: { $addToSet: '$customer' },
        },
      },
      { $project: { sessions: 1, pageViews: 1, duration: 1, purchases: 1, checkouts: 1, carts: 1, activeUsers: { $size: { $filter: { input: '$users', as: 'u', cond: { $ne: ['$$u', null] } } } } } },
      { $sort: { _id: 1 } },
    ]);
    const series = fillSeries(rows, from, to, granularity, ['sessions', 'pageViews', 'duration', 'purchases', 'checkouts', 'carts', 'activeUsers']).map((p) => ({
      date: p.date,
      sessions: p.sessions,
      activeUsers: p.activeUsers,
      pageViews: p.pageViews,
      avgDuration: p.sessions ? Math.round(p.duration / p.sessions) : 0,
      addToCart: p.carts,
      checkouts: p.checkouts,
      purchases: p.purchases,
      conversionRate: p.sessions ? round((p.purchases / p.sessions) * 100, 2) : 0,
    }));
    const tot = series.reduce((a, p) => ({ sessions: a.sessions + p.sessions, purchases: a.purchases + p.purchases, pv: a.pv + p.pageViews }), { sessions: 0, purchases: 0, pv: 0 });
    return {
      summary: [
        { label: 'Sessions', value: tot.sessions, format: 'number' },
        { label: 'Page views', value: tot.pv, format: 'number' },
        { label: 'Purchases', value: tot.purchases, format: 'number' },
        { label: 'Conversion rate', value: tot.sessions ? round((tot.purchases / tot.sessions) * 100, 2) : 0, format: 'percent' },
      ],
      columns: [
        { key: 'date', label: 'Period' },
        { key: 'sessions', label: 'Sessions', format: 'number' },
        { key: 'activeUsers', label: 'Active users', format: 'number' },
        { key: 'pageViews', label: 'Page views', format: 'number' },
        { key: 'avgDuration', label: 'Avg duration (s)', format: 'number' },
        { key: 'addToCart', label: 'Add to cart', format: 'number' },
        { key: 'checkouts', label: 'Checkouts', format: 'number' },
        { key: 'purchases', label: 'Purchases', format: 'number' },
        { key: 'conversionRate', label: 'Conversion %', format: 'percent' },
      ],
      rows: series,
      chart: { type: 'area', x: 'date', series: [{ key: 'sessions', label: 'Sessions' }, { key: 'purchases', label: 'Purchases' }] },
    };
  },
};

export async function buildReport(type, range, filters) {
  const builder = REPORTS[type];
  if (!builder) throw ApiError.notFound(`Unknown report type "${type}"`);
  return builder(range, filters);
}

/** Full-dataset rows for CSV (list reports drop the 2,000 preview cap). */
export async function reportRowsForExport(type, range, filters) {
  if (type === 'orders') {
    const { from, to } = range;
    const match = { ...between('createdAt', from, to), ...(filters.status ? { status: filters.status } : {}), ...(filters.country ? { country: filters.country } : {}) };
    const cursor = Order.find(match).sort({ createdAt: -1 }).lean().cursor();
    return (async function* () {
      for await (const o of cursor)
        yield {
          orderNumber: o.orderNumber,
          date: o.createdAt.toISOString().slice(0, 10),
          customer: o.customerName,
          email: o.customerEmail,
          items: o.items.reduce((s, i) => s + i.quantity, 0),
          total: money(o.total),
          status: o.status,
          paymentMethod: o.paymentMethod,
          channel: o.channel,
          country: o.country,
        };
    })();
  }
  if (type === 'customers') {
    const { from, to } = range;
    const match = { ...between('createdAt', from, to), ...(filters.segment ? { segment: filters.segment } : {}), ...(filters.country ? { country: filters.country } : {}) };
    const cursor = Customer.find(match).sort({ totalSpent: -1 }).lean().cursor();
    return (async function* () {
      for await (const c of cursor)
        yield {
          name: c.name,
          email: c.email,
          country: c.country,
          city: c.city,
          segment: c.segment,
          joined: c.createdAt.toISOString().slice(0, 10),
          orders: c.orderCount,
          totalSpent: money(c.totalSpent),
          lastOrder: c.lastOrderAt ? c.lastOrderAt.toISOString().slice(0, 10) : '',
        };
    })();
  }
  const report = await buildReport(type, range, filters);
  return report.rows;
}
