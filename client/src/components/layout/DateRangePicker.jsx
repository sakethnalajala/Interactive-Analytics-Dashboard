import { useRef, useState, useEffect } from 'react';
import { CalendarDays, ChevronDown } from 'lucide-react';
import { cn } from '@/utils/format';
import { useDateRange } from '@/hooks/useDateRange';
import { useDismiss } from '@/hooks/useDebounce';
import { PRESETS, presetRange, rangeLabel, isValidISO, toISODate, rangeDays } from '@/utils/dates';
import { Button } from '@/components/ui';

/** Global date range: presets + custom from/to. State lives in the URL (see useDateRange). */
export function DateRangePicker({ className }) {
  const { from, to, preset, setRange } = useDateRange();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState({ from, to });
  const [error, setError] = useState('');
  const ref = useRef(null);
  useDismiss(ref, () => setOpen(false), open);
  useEffect(() => setDraft({ from, to }), [from, to, open]);

  const today = toISODate(new Date());
  const apply = () => {
    if (!isValidISO(draft.from) || !isValidISO(draft.to)) return setError('Enter valid dates');
    if (draft.from > draft.to) return setError('Start date must be before end date');
    if (draft.to > today) return setError('End date cannot be in the future');
    if (rangeDays(draft.from, draft.to) > 1095) return setError('Range cannot exceed 3 years');
    setError('');
    setRange(draft);
    setOpen(false);
  };

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-sm font-semibold text-ink transition-colors hover:border-brand/40 focus-ring"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarDays className="h-4 w-4 text-brand" />
        <span className="hidden sm:inline">{rangeLabel(from, to)}</span>
        <span className="sm:hidden">{preset ? PRESETS.find((p) => p.id === preset).label.replace('Last ', '') : 'Custom'}</span>
        <ChevronDown className={cn('h-4 w-4 text-muted transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div role="dialog" className="glass absolute right-0 z-40 mt-2 w-[min(92vw,420px)] rounded-2xl border p-4 shadow-pop animate-scale-in">
          <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
            <ul className="space-y-0.5">
              {PRESETS.map((p) => (
                <li key={p.id}>
                  <button
                    onClick={() => {
                      setRange(presetRange(p.id));
                      setOpen(false);
                    }}
                    className={cn('w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-ring', preset === p.id ? 'bg-brand text-white' : 'text-ink hover:bg-surface-2')}
                  >
                    {p.label}
                  </button>
                </li>
              ))}
            </ul>
            <div className="space-y-3 border-t border-line pt-3 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
              <p className="text-xs font-bold uppercase tracking-wide text-muted">Custom range</p>
              <label className="block text-xs font-semibold text-muted">
                From
                <input type="date" max={draft.to || today} value={draft.from} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className="input mt-1" />
              </label>
              <label className="block text-xs font-semibold text-muted">
                To
                <input type="date" min={draft.from} max={today} value={draft.to} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className="input mt-1" />
              </label>
              {error && <p className="text-xs text-danger">{error}</p>}
              <Button size="sm" className="w-full" onClick={apply}>
                Apply range
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
