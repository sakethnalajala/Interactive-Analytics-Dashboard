/**
 * All dashboard analytics. Every function takes a parsed range
 * ({ from, to, prevFrom, prevTo, granularity }) and returns plain JSON.
 * Numbers are derived exclusively via MongoDB aggregation pipelines.
 */
import { Order, REVENUE_STATUSES, ORDER_STATUSES } from '../models/Order.js';
import { Session, FUNNEL_STAGES } from '../models/Session.js';
import { Customer } from '../models/Customer.js';
import { Product } from '../models/Product.js';
import { Setting } from '../models/Setting.js';
import { fillSeries, truncExpr, kpi, round, bucketsFor } from '../utils/dateRange.js';

const between = (field, from, to) => ({ [field]: { $gte: from, $lte: to } });
const revenueMatch = (from, to) => ({ ...between('createdAt', from, to), status: { $in: REVENUE_STATUSES } });

// ---------------------------------------------------------------- revenue

async function revenueTotals(from, to) {
  const [row] = await Order.aggregate([
    { $match: between('createdAt', from, to) },
    {
      $group: {
        _id: null,
        orders: { $sum: 1 },
        revenue: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$total', 0] } },
        revenueOrders: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, 1, 0] } },
        refunds: { $sum: { $cond: [{ $eq: ['$status', 'refunded'] }, '$total', 0] } },
        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
        cost: {
          $sum: {
            $cond: [
              { $in: ['$status', REVENUE_STATUSES] },
              { $sum: { $map: { input: '$items', as: 'i', in: { $multiply: ['$$i.quantity', '$$i.unitCost'] } } } },
              0,
            ],
          },
        },
        units: {
          $sum: {
            $cond: [{ $in: ['$status', REVENUE_STATUSES] }, { $sum: '$items.quantity' }, 0],
          },
        },
      },
    },
  ]);
  const r = row || { orders: 0, revenue: 0, revenueOrders: 0, refunds: 0, cancelled: 0, cost: 0, units: 0 };
  return {
    ...r,
    aov: r.revenueOrders ? r.revenue / r.revenueOrders : 0,
    netRevenue: r.revenue - r.refunds,
    grossMargin: r.revenue ? ((r.revenue - r.cost) / r.revenue) * 100 : 0,
  };
}

export async function revenueTrend({ from, to, prevFrom, prevTo, granularity }) {
  const pipeline = (a, b) => [
    { $match: between('createdAt', a, b) },
    {
      $group: {
        _id: truncExpr('$createdAt', granularity),
        revenue: { $sum: { $cond: [{ $in: ['$status', REVENUE_STATUSES] }, '$total', 0] } },
        orders: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ];
  const [cur, prev] = await Promise.all([Order.aggregate(pipeline(from, to)), Order.aggregate(pipeline(prevFrom, prevTo))]);
  const current = fillSeries(cur, from, to, granularity, ['revenue', 'orders']);
  const previous = fillSeries(prev, prevFrom, prevTo, granularity, ['revenue', 'orders']);
  // Align previous period by index so "vs previous" overlays on the same x-axis
  return current.map((p, i) => ({ ...p, prevRevenue: previous[i]?.revenue ?? 0, prevOrders: previous[i]?.orders ?? 0 }));
}

export async function revenueByCategory({ from, to }) {
  const rows = await Order.aggregate([
    { $match: revenueMatch(from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.category',
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        units: { $sum: '$items.quantity' },
        orders: { $addToSet: '$_id' },
      },
    },
    { $project: { category: '$_id', revenue: 1, units: 1, orders: { $size: '$orders' }, _id: 0 } },
    { $sort: { revenue: -1 } },
  ]);
  const total = rows.reduce((s, r) => s + r.revenue, 0);
  return rows.map((r) => ({ ...r, revenue: round(r.revenue), share: total ? round((r.revenue / total) * 100, 1) : 0 }));
}

export async function topProducts({ from, to }, limit = 8) {
  return Order.aggregate([
    { $match: revenueMatch(from, to) },
    { $unwind: '$items' },
    {
      $group: {
        _id: '$items.product',
        name: { $first: '$items.name' },
        category: { $first: '$items.category' },
        units: { $sum: '$items.quantity' },
        revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
        profit: { $sum: { $multiply: ['$items.quantity', { $subtract: ['$items.unitPrice', '$items.unitCost'] }] } },
      },
    },
    { $sort: { revenue: -1 } },
    { $limit: limit },
    { $project: { id: '$_id', _id: 0, name: 1, category: 1, units: 1, revenue: { $round: ['$revenue', 2] }, profit: { $round: ['$profit', 2] } } },
  ]);
}

export async function revenueByPayment({ from, to }) {
  return Order.aggregate([
    { $match: revenueMatch(from, to) },
    { $group: { _id: '$paymentMethod', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $project: { method: '$_id', _id: 0, revenue: { $round: ['$revenue', 2] }, orders: 1 } },
    { $sort: { revenue: -1 } },
  ]);
}

export async function revenueByWeekday({ from, to }) {
  const rows = await Order.aggregate([
    { $match: revenueMatch(from, to) },
    { $group: { _id: { $isoDayOfWeek: '$createdAt' }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
  ]);
  const names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return names.map((day, i) => {
    const r = rows.find((x) => x._id === i + 1) || {};
    return { day, revenue: round(r.revenue || 0), orders: r.orders || 0 };
  });
}

export async function revenueByChannel({ from, to }) {
  return Order.aggregate([
    { $match: revenueMatch(from, to) },
    { $group: { _id: '$channel', revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
    { $project: { channel: '$_id', _id: 0, revenue: { $round: ['$revenue', 2] }, orders: 1 } },
    { $sort: { revenue: -1 } },
  ]);
}

export async function revenueSummary(range) {
  const [cur, prev] = await Promise.all([revenueTotals(range.from, range.to), revenueTotals(range.prevFrom, range.prevTo)]);
  return {
    revenue: kpi(cur.revenue, prev.revenue),
    netRevenue: kpi(cur.netRevenue, prev.netRevenue),
    orders: kpi(cur.orders, prev.orders, 0),
    aov: kpi(cur.aov, prev.aov),
    refunds: kpi(cur.refunds, prev.refunds),
    grossMargin: kpi(cur.grossMargin, prev.grossMargin, 1),
    units: kpi(cur.units, prev.units, 0),
  };
}

// ---------------------------------------------------------------- engagement / sessions

async function sessionTotals(from, to) {
  const [row] = await Session.aggregate([
    { $match: between('startedAt', from, to) },
    {
      $group: {
        _id: null,
        sessions: { $sum: 1 },
        duration: { $sum: '$durationSec' },
        pageViews: { $sum: '$pageViews' },
        purchases: { $sum: { $cond: [{ $eq: ['$funnelStage', 'purchase'] }, 1, 0] } },
        checkouts: { $sum: { $cond: [{ $gte: ['$funnelIndex', 3] }, 1, 0] } },
        users: { $addToSet: '$customer' },
      },
    },
  ]);
  const r = row || { sessions: 0, duration: 0, pageViews: 0, purchases: 0, checkouts: 0, users: [] };
  const userIds = r.users.filter(Boolean);
  const returning = userIds.length ? await Customer.countDocuments({ _id: { $in: userIds }, createdAt: { $lt: from } }) : 0;
  const newUsers = await Customer.countDocuments(between('createdAt', from, to));
  return {
    sessions: r.sessions,
    activeUsers: userIds.length,
    newUsers,
    returningUsers: returning,
    avgDuration: r.sessions ? r.duration / r.sessions : 0,
    pagesPerSession: r.sessions ? r.pageViews / r.sessions : 0,
    conversionRate: r.sessions ? (r.purchases / r.sessions) * 100 : 0,
    cartAbandonment: r.checkouts ? (1 - r.purchases / r.checkouts) * 100 : 0,
    purchases: r.purchases,
  };
}

export async function engagementSummary(range) {
  const [cur, prev] = await Promise.all([sessionTotals(range.from, range.to), sessionTotals(range.prevFrom, range.prevTo)]);
  return {
    sessions: kpi(cur.sessions, prev.sessions, 0),
    activeUsers: kpi(cur.activeUsers, prev.activeUsers, 0),
    newUsers: kpi(cur.newUsers, prev.newUsers, 0),
    returningUsers: kpi(cur.returningUsers, prev.returningUsers, 0),
    avgDuration: kpi(cur.avgDuration, prev.avgDuration, 0),
    pagesPerSession: kpi(cur.pagesPerSession, prev.pagesPerSession, 2),
    conversionRate: kpi(cur.conversionRate, prev.conversionRate, 2),
    cartAbandonment: kpi(cur.cartAbandonment, prev.cartAbandonment, 1),
  };
}

export async function engagementTrend({ from, to, granularity }) {
  const rows = await Session.aggregate([
    { $match: between('startedAt', from, to) },
    {
      $group: {
        _id: truncExpr('$startedAt', granularity),
        sessions: { $sum: 1 },
        purchases: { $sum: { $cond: [{ $eq: ['$funnelStage', 'purchase'] }, 1, 0] } },
        users: { $addToSet: '$customer' },
        pageViews: { $sum: '$pageViews' },
      },
    },
    { $project: { sessions: 1, purchases: 1, pageViews: 1, activeUsers: { $size: { $filter: { input: '$users', as: 'u', cond: { $ne: ['$$u', null] } } } } } },
    { $sort: { _id: 1 } },
  ]);
  const newRows = await Customer.aggregate([
    { $match: between('createdAt', from, to) },
    { $group: { _id: truncExpr('$createdAt', granularity), newUsers: { $sum: 1 } } },
  ]);
  const series = fillSeries(rows, from, to, granularity, ['sessions', 'purchases', 'activeUsers', 'pageViews']);
  const newMap = new Map(newRows.map((r) => [new Date(r._id).toISOString().slice(0, 10), r.newUsers]));
  return series.map((p) => ({
    ...p,
    newUsers: newMap.get(p.date) || 0,
    returningUsers: Math.max(0, p.activeUsers - (newMap.get(p.date) || 0)),
    conversionRate: p.sessions ? round((p.purchases / p.sessions) * 100, 2) : 0,
  }));
}

export async function sessionsBreakdown({ from, to }, field) {
  const rows = await Session.aggregate([
    { $match: between('startedAt', from, to) },
    { $group: { _id: `$${field}`, sessions: { $sum: 1 }, purchases: { $sum: { $cond: [{ $eq: ['$funnelStage', 'purchase'] }, 1, 0] } } } },
    { $sort: { sessions: -1 } },
  ]);
  const total = rows.reduce((s, r) => s + r.sessions, 0);
  return rows.map((r) => ({
    name: r._id,
    sessions: r.sessions,
    share: total ? round((r.sessions / total) * 100, 1) : 0,
    conversionRate: r.sessions ? round((r.purchases / r.sessions) * 100, 2) : 0,
  }));
}

export async function funnel({ from, to }) {
  const rows = await Session.aggregate([
    { $match: between('startedAt', from, to) },
    { $group: { _id: '$funnelIndex', count: { $sum: 1 } } },
  ]);
  const byIdx = new Map(rows.map((r) => [r._id, r.count]));
  // A session that reached stage k also passed every stage < k
  const stages = FUNNEL_STAGES.map((stage, i) => {
    let count = 0;
    for (let k = i; k < FUNNEL_STAGES.length; k++) count += byIdx.get(k) || 0;
    return { stage, count };
  });
  const top = stages[0].count || 1;
  return stages.map((s, i) => ({
    ...s,
    rate: round((s.count / top) * 100, 1),
    dropOff: i === 0 ? 0 : round((1 - s.count / (stages[i - 1].count || 1)) * 100, 1),
  }));
}

/** 7×24 matrix of session counts — powers the activity heatmap. */
export async function activityHeatmap({ from, to }) {
  const rows = await Session.aggregate([
    { $match: between('startedAt', from, to) },
    { $group: { _id: { d: { $isoDayOfWeek: '$startedAt' }, h: { $hour: '$startedAt' } }, sessions: { $sum: 1 } } },
  ]);
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const grid = days.map((day) => ({ day, hours: Array(24).fill(0) }));
  for (const r of rows) grid[r._id.d - 1].hours[r._id.h] = r.sessions;
  return grid;
}

// ---------------------------------------------------------------- customers

export async function customerStats(range) {
  const { from, to, prevFrom, prevTo, granularity } = range;
  const [total, newCur, newPrev, activeCur, activePrev, ltv, segments, countries, growth, top] = await Promise.all([
    Customer.countDocuments({ createdAt: { $lte: to } }),
    Customer.countDocuments(between('createdAt', from, to)),
    Customer.countDocuments(between('createdAt', prevFrom, prevTo)),
    Order.distinct('customer', between('createdAt', from, to)).then((a) => a.length),
    Order.distinct('customer', between('createdAt', prevFrom, prevTo)).then((a) => a.length),
    Customer.aggregate([{ $group: { _id: null, avg: { $avg: '$totalSpent' }, avgOrders: { $avg: '$orderCount' } } }]),
    Customer.aggregate([{ $group: { _id: '$segment', count: { $sum: 1 }, revenue: { $sum: '$totalSpent' } } }, { $sort: { count: -1 } }]),
    Customer.aggregate([
      { $group: { _id: '$country', customers: { $sum: 1 }, revenue: { $sum: '$totalSpent' } } },
      { $sort: { customers: -1 } },
      { $limit: 8 },
    ]),
    Customer.aggregate([
      { $match: between('createdAt', from, to) },
      { $group: { _id: truncExpr('$createdAt', granularity), newCustomers: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Order.aggregate([
      { $match: revenueMatch(from, to) },
      { $group: { _id: '$customer', name: { $first: '$customerName' }, email: { $first: '$customerEmail' }, revenue: { $sum: '$total' }, orders: { $sum: 1 } } },
      { $sort: { revenue: -1 } },
      { $limit: 6 },
      { $project: { id: '$_id', _id: 0, name: 1, email: 1, revenue: { $round: ['$revenue', 2] }, orders: 1 } },
    ]),
  ]);

  // Cumulative growth line
  const before = await Customer.countDocuments({ createdAt: { $lt: bucketsFor(from, to, granularity)[0] } });
  let running = before;
  const growthSeries = fillSeries(growth, from, to, granularity, ['newCustomers']).map((p) => {
    running += p.newCustomers;
    return { ...p, totalCustomers: running };
  });

  return {
    kpis: {
      totalCustomers: kpi(total, total - newCur, 0),
      newCustomers: kpi(newCur, newPrev, 0),
      activeCustomers: kpi(activeCur, activePrev, 0),
      avgLifetimeValue: kpi(ltv[0]?.avg || 0, 0),
      avgOrdersPerCustomer: kpi(ltv[0]?.avgOrders || 0, 0, 1),
    },
    growth: growthSeries,
    bySegment: segments.map((s) => ({ segment: s._id, count: s.count, revenue: round(s.revenue) })),
    byCountry: countries.map((c) => ({ country: c._id, customers: c.customers, revenue: round(c.revenue) })),
    topCustomers: top,
  };
}

// ---------------------------------------------------------------- products

export async function productStats(range) {
  const { from, to, prevFrom, prevTo } = range;
  const settings = await Setting.get();
  const [counts, lowStock, ratingRow, cur, prev, categories, stockByCategory] = await Promise.all([
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stock: { $lte: settings.lowStockThreshold } }),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: null, avg: { $avg: '$rating' } } }]),
    revenueTotals(from, to),
    revenueTotals(prevFrom, prevTo),
    Order.aggregate([
      { $match: revenueMatch(from, to) },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.category',
          revenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          units: { $sum: '$items.quantity' },
          profit: { $sum: { $multiply: ['$items.quantity', { $subtract: ['$items.unitPrice', '$items.unitCost'] }] } },
        },
      },
      { $sort: { revenue: -1 } },
    ]),
    Product.aggregate([{ $match: { isActive: true } }, { $group: { _id: '$category', products: { $sum: 1 }, stock: { $sum: '$stock' } } }]),
  ]);
  const stockMap = new Map(stockByCategory.map((s) => [s._id, s]));
  return {
    kpis: {
      activeProducts: kpi(counts, counts, 0),
      unitsSold: kpi(cur.units, prev.units, 0),
      lowStock: kpi(lowStock, lowStock, 0),
      avgRating: kpi(ratingRow[0]?.avg || 0, ratingRow[0]?.avg || 0, 2),
      grossMargin: kpi(cur.grossMargin, prev.grossMargin, 1),
    },
    lowStockThreshold: settings.lowStockThreshold,
    categories: categories.map((c) => ({
      category: c._id,
      revenue: round(c.revenue),
      units: c.units,
      profit: round(c.profit),
      margin: c.revenue ? round((c.profit / c.revenue) * 100, 1) : 0,
      products: stockMap.get(c._id)?.products || 0,
      stock: stockMap.get(c._id)?.stock || 0,
    })),
    topProducts: await topProducts(range, 10),
  };
}

// ---------------------------------------------------------------- orders

export async function orderStats(range) {
  const { from, to, prevFrom, prevTo, granularity } = range;
  const statusCounts = async (a, b) =>
    Object.fromEntries((await Order.aggregate([{ $match: between('createdAt', a, b) }, { $group: { _id: '$status', n: { $sum: 1 } } }])).map((r) => [r._id, r.n]));
  const [cur, prev, trendRows, payments, channels] = await Promise.all([
    statusCounts(from, to),
    statusCounts(prevFrom, prevTo),
    Order.aggregate([
      { $match: between('createdAt', from, to) },
      { $group: { _id: { t: truncExpr('$createdAt', granularity), s: '$status' }, n: { $sum: 1 } } },
    ]),
    Order.aggregate([{ $match: between('createdAt', from, to) }, { $group: { _id: '$paymentMethod', orders: { $sum: 1 }, revenue: { $sum: '$total' } } }, { $sort: { orders: -1 } }]),
    Order.aggregate([{ $match: between('createdAt', from, to) }, { $group: { _id: '$channel', orders: { $sum: 1 } } }, { $sort: { orders: -1 } }]),
  ]);
  const sum = (o) => Object.values(o).reduce((s, n) => s + n, 0);
  const totalCur = sum(cur);
  const totalPrev = sum(prev);
  const fulfilled = (o) => (o.delivered || 0) + (o.shipped || 0);
  const pct = (n, d) => (d ? (n / d) * 100 : 0);

  // Pivot trend rows into { date, pending, processing, ... }
  const pivot = new Map();
  for (const r of trendRows) {
    const key = new Date(r._id.t).toISOString();
    if (!pivot.has(key)) pivot.set(key, { _id: r._id.t });
    pivot.get(key)[r._id.s] = r.n;
  }
  const trend = fillSeries([...pivot.values()], from, to, granularity, ORDER_STATUSES).map((p) => ({
    ...p,
    total: ORDER_STATUSES.reduce((s, k) => s + p[k], 0),
  }));

  return {
    kpis: {
      totalOrders: kpi(totalCur, totalPrev, 0),
      pending: kpi((cur.pending || 0) + (cur.processing || 0), (prev.pending || 0) + (prev.processing || 0), 0),
      fulfillmentRate: kpi(pct(fulfilled(cur), totalCur), pct(fulfilled(prev), totalPrev), 1),
      cancellationRate: kpi(pct((cur.cancelled || 0) + (cur.refunded || 0), totalCur), pct((prev.cancelled || 0) + (prev.refunded || 0), totalPrev), 1),
    },
    byStatus: ORDER_STATUSES.map((s) => ({ status: s, count: cur[s] || 0, share: round(pct(cur[s] || 0, totalCur), 1) })),
    trend,
    byPayment: payments.map((p) => ({ method: p._id, orders: p.orders, revenue: round(p.revenue) })),
    byChannel: channels.map((c) => ({ channel: c._id, orders: c.orders })),
  };
}

// ---------------------------------------------------------------- overview (composite)

export async function overview(range) {
  const [rev, eng, trend, byCategory, byStatus, top, recent, sources] = await Promise.all([
    revenueSummary(range),
    engagementSummary(range),
    revenueTrend(range),
    revenueByCategory(range),
    Order.aggregate([{ $match: between('createdAt', range.from, range.to) }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    topProducts(range, 5),
    Order.find(between('createdAt', range.from, range.to)).sort({ createdAt: -1 }).limit(6).select('orderNumber customerName customerEmail total status createdAt').lean(),
    sessionsBreakdown(range, 'source'),
  ]);
  // Sparklines (last 12 points of the trend) keep KPI cards lively without extra queries
  const spark = (key) => trend.slice(-12).map((p) => p[key]);
  return {
    kpis: {
      revenue: { ...rev.revenue, spark: spark('revenue') },
      orders: { ...rev.orders, spark: spark('orders') },
      aov: rev.aov,
      activeUsers: eng.activeUsers,
      conversionRate: eng.conversionRate,
      newCustomers: eng.newUsers,
    },
    revenueTrend: trend,
    revenueByCategory: byCategory,
    ordersByStatus: ORDER_STATUSES.map((s) => ({ status: s, count: byStatus.find((b) => b._id === s)?.count || 0 })),
    topProducts: top,
    recentOrders: recent.map((o) => ({ ...o, id: String(o._id), _id: undefined })),
    trafficSources: sources,
  };
}
