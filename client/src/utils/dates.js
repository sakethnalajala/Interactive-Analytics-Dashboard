import { subDays, subMonths, startOfYear, format, differenceInCalendarDays, parseISO, isValid } from 'date-fns';

export const toISODate = (d) => format(d, 'yyyy-MM-dd');

export const PRESETS = [
  { id: '7d', label: 'Last 7 days', range: () => ({ from: subDays(new Date(), 6), to: new Date() }) },
  { id: '30d', label: 'Last 30 days', range: () => ({ from: subDays(new Date(), 29), to: new Date() }) },
  { id: '90d', label: 'Last 90 days', range: () => ({ from: subDays(new Date(), 89), to: new Date() }) },
  { id: '12m', label: 'Last 12 months', range: () => ({ from: subMonths(new Date(), 12), to: new Date() }) },
  { id: 'ytd', label: 'Year to date', range: () => ({ from: startOfYear(new Date()), to: new Date() }) },
];

export function presetRange(id) {
  const p = PRESETS.find((x) => x.id === id) || PRESETS[1];
  const { from, to } = p.range();
  return { from: toISODate(from), to: toISODate(to) };
}

export function matchPreset(from, to) {
  return PRESETS.find((p) => {
    const r = p.range();
    return toISODate(r.from) === from && toISODate(r.to) === to;
  })?.id;
}

export function isValidISO(s) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  return isValid(parseISO(s));
}

export function rangeLabel(from, to) {
  const preset = matchPreset(from, to);
  if (preset) return PRESETS.find((p) => p.id === preset).label;
  const f = parseISO(from);
  const t = parseISO(to);
  const sameYear = f.getFullYear() === t.getFullYear();
  return `${format(f, sameYear ? 'MMM d' : 'MMM d, yyyy')} – ${format(t, 'MMM d, yyyy')}`;
}

export function rangeDays(from, to) {
  return differenceInCalendarDays(parseISO(to), parseISO(from)) + 1;
}
