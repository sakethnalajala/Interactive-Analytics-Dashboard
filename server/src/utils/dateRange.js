import { ApiError } from './ApiError.js';

const DAY = 24 * 60 * 60 * 1000;

/**
 * Parses ?from&to (YYYY-MM-DD) into an inclusive UTC range plus the immediately
 * preceding period of equal length (used for "vs previous period" deltas).
 * Defaults to the last 30 days.
 */
export function parseRange(query = {}) {
  const to = query.to ? endOfDay(new Date(query.to)) : endOfDay(new Date());
  const from = query.from ? startOfDay(new Date(query.from)) : startOfDay(new Date(to.getTime() - 29 * DAY));
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) throw ApiError.badRequest('Invalid date range');
  if (from > to) throw ApiError.badRequest('"from" must be before "to"');
  if (to - from > 3 * 365 * DAY) throw ApiError.badRequest('Date range cannot exceed 3 years');

  const days = Math.round((to - from + 1) / DAY);
  const prevTo = new Date(from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - (to - from));
  return { from, to, prevFrom, prevTo, days, granularity: pickGranularity(days, query.granularity) };
}

export function pickGranularity(days, requested) {
  if (['day', 'week', 'month'].includes(requested)) return requested;
  if (days <= 62) return 'day';
  if (days <= 240) return 'week';
  return 'month';
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
export function endOfDay(d) {
  const x = new Date(d);
  x.setUTCHours(23, 59, 59, 999);
  return x;
}

/** $dateTrunc expression for a given granularity (UTC). */
export function truncExpr(field, granularity) {
  return {
    $dateTrunc: {
      date: field,
      unit: granularity,
      timezone: 'UTC',
      ...(granularity === 'week' ? { startOfWeek: 'monday' } : {}),
    },
  };
}

/** Builds every bucket in [from,to] so charts never have gaps. */
export function bucketsFor(from, to, granularity) {
  const out = [];
  let cur = new Date(from);
  if (granularity === 'week') {
    const day = (cur.getUTCDay() + 6) % 7; // monday = 0
    cur = new Date(cur.getTime() - day * DAY);
  } else if (granularity === 'month') {
    cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth(), 1));
  }
  while (cur <= to) {
    out.push(new Date(cur));
    if (granularity === 'day') cur = new Date(cur.getTime() + DAY);
    else if (granularity === 'week') cur = new Date(cur.getTime() + 7 * DAY);
    else cur = new Date(Date.UTC(cur.getUTCFullYear(), cur.getUTCMonth() + 1, 1));
  }
  return out;
}

/** Merges aggregation rows (keyed by `_id` date) onto a full bucket list. */
export function fillSeries(rows, from, to, granularity, fields) {
  const map = new Map(rows.map((r) => [new Date(r._id).toISOString(), r]));
  return bucketsFor(from, to, granularity).map((d) => {
    const key = d.toISOString();
    const row = map.get(key) || {};
    const point = { date: key.slice(0, 10) };
    for (const f of fields) point[f] = round(row[f] ?? 0);
    return point;
  });
}

export function pctChange(current, previous) {
  if (!previous) return current ? 100 : 0;
  return round(((current - previous) / previous) * 100, 1);
}

export function round(n, digits = 2) {
  const f = 10 ** digits;
  return Math.round((Number(n) || 0) * f) / f;
}

/** Shape used by every KPI: current value, previous-period value and % change. */
export function kpi(value, previous, digits = 2) {
  return { value: round(value, digits), previous: round(previous, digits), change: pctChange(value, previous) };
}
