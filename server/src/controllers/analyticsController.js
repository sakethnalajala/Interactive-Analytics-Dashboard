import * as analytics from '../services/analyticsService.js';
import { parseRange } from '../utils/dateRange.js';

const ok = (res, data) => res.json({ success: true, data });
const withRange = (req) => {
  const range = parseRange(req.query);
  return { range, meta: { from: range.from.toISOString().slice(0, 10), to: range.to.toISOString().slice(0, 10), granularity: range.granularity, days: range.days } };
};

export async function overview(req, res) {
  const { range, meta } = withRange(req);
  ok(res, { ...(await analytics.overview(range)), meta });
}

export async function engagement(req, res) {
  const { range, meta } = withRange(req);
  const [kpis, trend, byDevice, bySource, heatmap] = await Promise.all([
    analytics.engagementSummary(range),
    analytics.engagementTrend(range),
    analytics.sessionsBreakdown(range, 'device'),
    analytics.sessionsBreakdown(range, 'source'),
    analytics.activityHeatmap(range),
  ]);
  ok(res, { kpis, trend, byDevice, bySource, heatmap, meta });
}

export async function funnel(req, res) {
  const { range, meta } = withRange(req);
  const [stages, trend] = await Promise.all([analytics.funnel(range), analytics.engagementTrend(range)]);
  ok(res, { stages, conversionTrend: trend.map((p) => ({ date: p.date, sessions: p.sessions, purchases: p.purchases, conversionRate: p.conversionRate })), meta });
}

export async function revenue(req, res) {
  const { range, meta } = withRange(req);
  const [kpis, trend, byCategory, byPayment, byWeekday, byChannel, topProducts] = await Promise.all([
    analytics.revenueSummary(range),
    analytics.revenueTrend(range),
    analytics.revenueByCategory(range),
    analytics.revenueByPayment(range),
    analytics.revenueByWeekday(range),
    analytics.revenueByChannel(range),
    analytics.topProducts(range, 10),
  ]);
  ok(res, { kpis, trend, byCategory, byPayment, byWeekday, byChannel, topProducts, meta });
}

export async function revenueTrend(req, res) {
  const { range, meta } = withRange(req);
  ok(res, { trend: await analytics.revenueTrend(range), meta });
}

export async function customerStats(req, res) {
  const { range, meta } = withRange(req);
  ok(res, { ...(await analytics.customerStats(range)), meta });
}

export async function productStats(req, res) {
  const { range, meta } = withRange(req);
  ok(res, { ...(await analytics.productStats(range)), meta });
}

export async function orderStats(req, res) {
  const { range, meta } = withRange(req);
  ok(res, { ...(await analytics.orderStats(range)), meta });
}
