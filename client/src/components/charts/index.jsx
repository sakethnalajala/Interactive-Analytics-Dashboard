/**
 * Themed Recharts wrappers. Colours come from CSS variables so charts follow
 * the active theme; every chart uses ResponsiveContainer and the same tooltip.
 */
import { useMemo, useState } from 'react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { cn, fmt } from '@/utils/format';
import { useThemeStore } from '@/stores/themeStore';
import { Card, CardHeader, Skeleton, ErrorState, EmptyState } from '@/components/ui';

export const PALETTE = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)', 'var(--chart-6)'];
export const STATUS_COLORS = { delivered: '#05CD99', shipped: '#3965FF', processing: '#7551FF', pending: '#FFB547', cancelled: '#EE5D50', refunded: '#F97316' };

const FORMATTERS = { currency: (v) => fmt.currency(v), number: (v) => fmt.number(v), percent: (v) => fmt.percent(v, 2), duration: (v) => fmt.duration(v) };
const axisFmt = { currency: (v) => fmt.currency(v, { compact: true }), number: (v) => fmt.number(v, { compact: true }), percent: (v) => `${v}%`, duration: (v) => fmt.duration(v) };

/** Shared, theme-aware tooltip. `format` may be a hint or a per-key map. */
export function ChartTooltip({ active, payload, label, format = 'number', labelFormatter, hideTotal = true }) {
  if (!active || !payload?.length) return null;
  const f = (key, v) => (typeof format === 'object' ? FORMATTERS[format[key] || 'number'] : FORMATTERS[format] || FORMATTERS.number)(v);
  return (
    <div className="rounded-xl border border-line bg-surface/95 px-3.5 py-2.5 text-xs shadow-pop backdrop-blur">
      <p className="mb-1.5 font-bold text-ink">{labelFormatter ? labelFormatter(label, payload) : label}</p>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-6 py-0.5">
          <span className="flex items-center gap-2 text-muted">
            <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.fill }} />
            {p.name}
          </span>
          <span className="font-semibold tabular text-ink">{f(p.dataKey, p.value)}</span>
        </div>
      ))}
      {!hideTotal && payload.length > 1 && (
        <div className="mt-1 flex justify-between border-t border-line pt-1 text-muted">
          <span>Total</span>
          <span className="font-semibold text-ink">{f(payload[0].dataKey, payload.reduce((s, p) => s + (p.value || 0), 0))}</span>
        </div>
      )}
    </div>
  );
}

function useGrid() {
  useThemeStore((s) => s.resolved); // re-render on theme change so CSS vars are re-read
  return { stroke: 'var(--chart-grid)', tick: { fill: 'rgb(var(--text-muted))', fontSize: 11 } };
}

/** Legend that toggles series visibility (click to hide/show). */
function useSeriesToggle(series) {
  const [hidden, setHidden] = useState({});
  const toggle = (e) => setHidden((h) => ({ ...h, [e.dataKey]: !h[e.dataKey] }));
  const visible = series.filter((s) => !hidden[s.key]);
  return { hidden, toggle, visible };
}

const legendStyle = { fontSize: 12, paddingTop: 8 };
const legendFormatter = (hidden) => (value, entry) => <span style={{ opacity: hidden[entry.dataKey] ? 0.4 : 1, cursor: 'pointer' }}>{value}</span>;

// ---------------------------------------------------------------- Chart card (states)
export function ChartCard({ title, subtitle, action, loading, error, onRetry, empty, height = 320, children, className, bodyClassName }) {
  return (
    <Card className={cn('flex flex-col', className)}>
      <CardHeader title={title} subtitle={subtitle} action={action} />
      <div className={cn('relative flex-1', bodyClassName)} style={{ minHeight: height }}>
        {loading ? (
          <Skeleton className="absolute inset-0" />
        ) : error ? (
          <ErrorState error={error} onRetry={onRetry} compact />
        ) : empty ? (
          <EmptyState title="No data for this period" description="Try a wider date range." className="py-10" />
        ) : (
          children
        )}
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- Area / line trend
export function TrendChart({ data, series, x = 'date', granularity = 'day', format = 'number', type = 'area', height = 300, stacked = false, showLegend = true, yAxisWidth = 56 }) {
  const grid = useGrid();
  const { hidden, toggle } = useSeriesToggle(series);
  const Chart = type === 'line' ? LineChart : AreaChart;
  const tickFormatter = (v) => fmt.axisDate(v, granularity);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
        <defs>
          {series.map((s, i) => (
            <linearGradient key={s.key} id={`grad-${s.key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={s.color || PALETTE[i]} stopOpacity={0.28} />
              <stop offset="100%" stopColor={s.color || PALETTE[i]} stopOpacity={0} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} stroke={grid.stroke} strokeDasharray="4 4" />
        <XAxis dataKey={x} tickFormatter={tickFormatter} tick={grid.tick} axisLine={false} tickLine={false} interval="preserveStartEnd" minTickGap={28} />
        <YAxis tick={grid.tick} axisLine={false} tickLine={false} width={yAxisWidth} tickFormatter={axisFmt[typeof format === 'string' ? format : 'number']} />
        <Tooltip content={<ChartTooltip format={format} labelFormatter={(l) => fmt.axisDate(l, granularity === 'day' ? 'day' : granularity)} />} cursor={{ stroke: 'rgb(var(--brand))', strokeOpacity: 0.3 }} />
        {showLegend && <Legend wrapperStyle={legendStyle} onClick={toggle} formatter={legendFormatter(hidden)} iconType="circle" iconSize={8} />}
        {series.map((s, i) =>
          type === 'line' ? (
            <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color || PALETTE[i]} strokeWidth={s.dashed ? 2 : 2.5} strokeDasharray={s.dashed ? '5 5' : undefined} dot={false} activeDot={{ r: 5 }} hide={!!hidden[s.key]} isAnimationActive={false} />
          ) : (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label}
              stackId={stacked ? 'a' : undefined}
              stroke={s.color || PALETTE[i]}
              strokeWidth={s.dashed ? 2 : 2.5}
              strokeDasharray={s.dashed ? '5 5' : undefined}
              fill={s.dashed ? 'transparent' : `url(#grad-${s.key})`}
              dot={false}
              activeDot={{ r: 5, strokeWidth: 0 }}
              hide={!!hidden[s.key]}
              isAnimationActive={false}
            />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------- Bars
export function BarsChart({ data, series, x, format = 'number', height = 300, layout = 'vertical', stacked = false, colors, showLegend = false, xFormatter, onBarClick, yAxisWidth, radius = 6 }) {
  const grid = useGrid();
  const { hidden, toggle } = useSeriesToggle(series);
  const horizontal = layout === 'horizontal'; // bars extend left→right
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout={horizontal ? 'vertical' : 'horizontal'} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barCategoryGap={horizontal ? 8 : '28%'}>
        <CartesianGrid vertical={horizontal} horizontal={!horizontal} stroke={grid.stroke} strokeDasharray="4 4" />
        {horizontal ? (
          <>
            <XAxis type="number" tick={grid.tick} axisLine={false} tickLine={false} tickFormatter={axisFmt[format]} />
            <YAxis type="category" dataKey={x} tick={grid.tick} axisLine={false} tickLine={false} width={yAxisWidth ?? 110} tickFormatter={xFormatter} />
          </>
        ) : (
          <>
            <XAxis dataKey={x} tick={grid.tick} axisLine={false} tickLine={false} tickFormatter={xFormatter} interval={0} minTickGap={4} />
            <YAxis tick={grid.tick} axisLine={false} tickLine={false} width={yAxisWidth ?? 56} tickFormatter={axisFmt[format]} />
          </>
        )}
        <Tooltip content={<ChartTooltip format={format} labelFormatter={xFormatter} hideTotal={!stacked} />} cursor={{ fill: 'rgb(var(--brand) / 0.06)' }} />
        {showLegend && <Legend wrapperStyle={legendStyle} onClick={toggle} formatter={legendFormatter(hidden)} iconType="circle" iconSize={8} />}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            stackId={stacked ? 'a' : undefined}
            fill={s.color || PALETTE[i]}
            radius={stacked ? 0 : horizontal ? [0, radius, radius, 0] : [radius, radius, 0, 0]}
            maxBarSize={horizontal ? 22 : 42}
            hide={!!hidden[s.key]}
            isAnimationActive={false}
            onClick={onBarClick ? (d) => onBarClick(d.payload ?? d) : undefined}
            cursor={onBarClick ? 'pointer' : undefined}
          >
            {colors && data.map((d, j) => <Cell key={j} fill={typeof colors === 'function' ? colors(d, j) : colors[j % colors.length]} />)}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

// ---------------------------------------------------------------- Donut
export function DonutChart({ data, nameKey = 'name', valueKey = 'value', format = 'number', height = 260, colors, centerLabel, centerValue, legend = true, nameFormatter = fmt.label }) {
  useGrid();
  const total = useMemo(() => data.reduce((s, d) => s + (d[valueKey] || 0), 0), [data, valueKey]);
  const color = (d, i) => (typeof colors === 'function' ? colors(d, i) : (colors || PALETTE)[i % (colors || PALETTE).length]);
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row">
      <div className="relative w-full shrink-0 sm:w-[55%]" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey={valueKey} nameKey={nameKey} innerRadius="66%" outerRadius="92%" paddingAngle={2} stroke="none" isAnimationActive={false}>
              {data.map((d, i) => (
                <Cell key={i} fill={color(d, i)} />
              ))}
            </Pie>
            <Tooltip content={<ChartTooltip format={format} labelFormatter={(_, p) => nameFormatter(p?.[0]?.name)} />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-extrabold tabular text-ink">{centerValue ?? (format === 'currency' ? fmt.currency(total, { compact: true }) : fmt.number(total, { compact: true }))}</span>
          <span className="text-[11px] font-medium text-muted">{centerLabel || 'Total'}</span>
        </div>
      </div>
      {legend && (
        <ul className="w-full min-w-0 space-y-2 text-xs">
          {data.map((d, i) => (
            <li key={i} className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2 text-muted">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color(d, i) }} />
                <span className="truncate capitalize">{nameFormatter(d[nameKey])}</span>
              </span>
              <span className="shrink-0 font-semibold tabular text-ink">
                {format === 'currency' ? fmt.currency(d[valueKey], { compact: true }) : FORMATTERS[format](d[valueKey])}
                <span className="ml-1.5 font-normal text-muted">{total ? fmt.percent((d[valueKey] / total) * 100, 0) : '0%'}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Funnel
export function FunnelChart({ stages }) {
  const max = stages[0]?.count || 1;
  return (
    <div className="space-y-3">
      {stages.map((s, i) => (
        <div key={s.stage} className="group">
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-semibold capitalize text-ink">{fmt.label(s.stage)}</span>
            <span className="text-muted">
              <span className="font-semibold tabular text-ink">{fmt.number(s.count)}</span> · {fmt.percent(s.rate)}
              {i > 0 && <span className="ml-2 text-danger">↓ {fmt.percent(s.dropOff)}</span>}
            </span>
          </div>
          <div className="h-8 w-full overflow-hidden rounded-lg bg-surface-2">
            <div className="h-full rounded-lg transition-all duration-500 group-hover:opacity-90" style={{ width: `${Math.max(2, (s.count / max) * 100)}%`, background: `linear-gradient(90deg, ${PALETTE[i % PALETTE.length]}, ${PALETTE[(i + 1) % PALETTE.length]})` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Heatmap (7 × 24)
export function Heatmap({ grid }) {
  const max = useMemo(() => Math.max(1, ...grid.flatMap((r) => r.hours)), [grid]);
  const [hover, setHover] = useState(null);
  return (
    <div className="scroll-x">
      <div className="min-w-[560px]">
        <div className="mb-1 grid grid-cols-[40px_repeat(24,1fr)] gap-[3px] text-[10px] text-muted">
          <span />
          {Array.from({ length: 24 }).map((_, h) => (
            <span key={h} className="text-center">
              {h % 3 === 0 ? `${h}` : ''}
            </span>
          ))}
        </div>
        {grid.map((row) => (
          <div key={row.day} className="grid grid-cols-[40px_repeat(24,1fr)] gap-[3px]">
            <span className="text-[11px] font-semibold text-muted">{row.day}</span>
            {row.hours.map((v, h) => (
              <div
                key={h}
                onMouseEnter={() => setHover({ day: row.day, h, v })}
                onMouseLeave={() => setHover(null)}
                className="aspect-square rounded-[3px] transition-transform hover:scale-125"
                style={{ background: `rgb(var(--brand) / ${0.06 + (v / max) * 0.94})` }}
                title={`${row.day} ${h}:00 — ${fmt.number(v)} sessions`}
              />
            ))}
          </div>
        ))}
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted">
          <span>{hover ? `${hover.day} ${String(hover.h).padStart(2, '0')}:00 · ${fmt.number(hover.v)} sessions` : 'Hover a cell for details'}</span>
          <span className="flex items-center gap-1">
            Less
            {[0.1, 0.3, 0.55, 0.8, 1].map((o) => (
              <span key={o} className="h-2.5 w-2.5 rounded-[2px]" style={{ background: `rgb(var(--brand) / ${o})` }} />
            ))}
            More
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Sparkline (KPI cards)
export function Sparkline({ data = [], color = 'rgb(var(--brand))', height = 36, width = 96 }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const pts = data.map((v, i) => [(i / Math.max(1, data.length - 1)) * width, height - ((v - min) / (max - min || 1)) * (height - 4) - 2]);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const id = `spark-${Math.round(max)}-${data.length}`;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="overflow-visible" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${width},${height} L0,${height} Z`} fill={`url(#${id})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
