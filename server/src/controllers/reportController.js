import { buildReport, reportRowsForExport } from '../services/reportService.js';
import { parseRange } from '../utils/dateRange.js';
import { sendCsv } from '../utils/csv.js';
import { REPORT_TYPES } from '../validation/schemas.js';
import { ApiError } from '../utils/ApiError.js';

const ok = (res, data) => res.json({ success: true, data });

function ensureType(type) {
  if (!REPORT_TYPES.includes(type)) throw ApiError.notFound(`Unknown report type "${type}"`);
}

export async function types(_req, res) {
  ok(res, {
    types: [
      { id: 'revenue', label: 'Revenue', description: 'Revenue, cost, profit and AOV per period', filters: ['category'] },
      { id: 'orders', label: 'Orders', description: 'Every order in the period with status and payment', filters: ['status', 'country'] },
      { id: 'customers', label: 'Customers', description: 'Customers acquired in the period with lifetime value', filters: ['segment', 'country'] },
      { id: 'products', label: 'Products', description: 'Catalogue performance: units, revenue and profit', filters: ['category'] },
      { id: 'engagement', label: 'Engagement', description: 'Sessions, funnel steps and conversion per period', filters: [] },
    ],
  });
}

export async function report(req, res) {
  ensureType(req.params.type);
  const range = parseRange(req.query);
  const data = await buildReport(req.params.type, range, req.query);
  ok(res, { ...data, meta: { from: range.from.toISOString().slice(0, 10), to: range.to.toISOString().slice(0, 10), granularity: range.granularity } });
}

export async function exportReport(req, res) {
  ensureType(req.params.type);
  const range = parseRange(req.query);
  const { columns } = await buildReport(req.params.type, { ...range, granularity: range.granularity }, req.query);
  const rows = await reportRowsForExport(req.params.type, range, req.query);
  const fmt = (c) => (c.format === 'currency' ? (v) => (Number(v) || 0).toFixed(2) : undefined);
  const from = range.from.toISOString().slice(0, 10);
  const to = range.to.toISOString().slice(0, 10);
  await sendCsv(res, `${req.params.type}-report_${from}_${to}.csv`, columns.map((c) => ({ ...c, format: fmt(c) })), rows);
}
