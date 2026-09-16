import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export const cn = (...args) => twMerge(clsx(args));

let currency = 'USD';
export const setCurrency = (c) => {
  currency = c || 'USD';
};

const nf = (opts) => new Intl.NumberFormat('en-US', opts);

export const fmt = {
  currency: (v, { compact = false, digits } = {}) =>
    nf({
      style: 'currency',
      currency,
      notation: compact ? 'compact' : 'standard',
      maximumFractionDigits: digits ?? (compact ? 1 : 2),
      minimumFractionDigits: compact ? 0 : digits ?? 2,
    }).format(Number(v) || 0),
  number: (v, { compact = false, digits = 0 } = {}) =>
    nf({ notation: compact ? 'compact' : 'standard', maximumFractionDigits: compact ? 1 : digits }).format(Number(v) || 0),
  percent: (v, digits = 1) => `${nf({ maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(Number(v) || 0)}%`,
  delta: (v) => `${v > 0 ? '+' : ''}${nf({ maximumFractionDigits: 1 }).format(Number(v) || 0)}%`,
  duration: (sec) => {
    const s = Math.round(Number(sec) || 0);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    return `${m}m ${String(s % 60).padStart(2, '0')}s`;
  },
  date: (v, opts = {}) => (v ? new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', ...opts }) : '—'),
  dateTime: (v) => (v ? new Date(v).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'),
  /** Chart axis labels: day → "Aug 4", week → "Aug 4", month → "Aug 26". */
  axisDate: (iso, granularity = 'day') => {
    const d = new Date(iso + 'T00:00:00Z');
    if (granularity === 'month') return d.toLocaleDateString('en-US', { month: 'short', year: '2-digit', timeZone: 'UTC' });
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  },
  relative: (v) => {
    if (!v) return '—';
    const diff = (Date.now() - new Date(v).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`;
    return fmt.date(v);
  },
  label: (s = '') => String(s).replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  initials: (name = '') =>
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join(''),
};

/** Formats a value according to a report column `format` hint. */
export function formatBy(format, value) {
  switch (format) {
    case 'currency':
      return fmt.currency(value);
    case 'percent':
      return fmt.percent(value);
    case 'number':
      return fmt.number(value, { digits: 2 });
    case 'status':
      return fmt.label(value);
    default:
      return value ?? '—';
  }
}
