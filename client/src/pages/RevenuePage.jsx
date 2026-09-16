import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DollarSign, Wallet, Receipt, ShoppingCart, RotateCcw, PieChart, Package } from 'lucide-react';
import { useDateRange } from '@/hooks/useDateRange';
import { useRevenue, useRevenueTrend } from '@/api/queries';
import { KpiCard, KpiGrid } from '@/components/kpi/KpiCard';
import { ChartCard, TrendChart, DonutChart, BarsChart } from '@/components/charts';
import { Card, CardHeader, PageHeader, Segmented, ErrorState, Skeleton } from '@/components/ui';
import { rangeLabel, rangeDays } from '@/utils/dates';
import { fmt } from '@/utils/format';

export default function RevenuePage() {
  const range = useDateRange();
  const days = rangeDays(range.from, range.to);
  const [granularity, setGranularity] = useState('auto');
  const rev = useRevenue(range);
  const trend = useRevenueTrend({ ...range, ...(granularity !== 'auto' ? { granularity } : {}) });
  const k = rev.data?.kpis;
  const [catView, setCatView] = useState('revenue');
  const navigate = useNavigate();

  if (rev.isError && !rev.data) return <ErrorState error={rev.error} onRetry={rev.refetch} />;

  const granOptions = [{ value: 'auto', label: 'Auto' }, ...(days <= 120 ? [{ value: 'day', label: 'Day' }] : []), ...(days >= 14 ? [{ value: 'week', label: 'Week' }] : []), ...(days >= 60 ? [{ value: 'month', label: 'Month' }] : [])];

  return (
    <>
      <PageHeader title="Sales & Revenue" description={`Revenue performance · ${rangeLabel(range.from, range.to)}`} />

      <KpiGrid cols={6}>
        <KpiCard loading={rev.isLoading} label="Gross revenue" value={k?.revenue.value} previous={k?.revenue.previous} change={k?.revenue.change} format="currency" icon={DollarSign} tone="brand" />
        <KpiCard loading={rev.isLoading} label="Net revenue" value={k?.netRevenue.value} previous={k?.netRevenue.previous} change={k?.netRevenue.change} format="currency" icon={Wallet} tone="success" hint="Gross − refunds" />
        <KpiCard loading={rev.isLoading} label="Orders" value={k?.orders.value} previous={k?.orders.previous} change={k?.orders.change} icon={ShoppingCart} tone="info" />
        <KpiCard loading={rev.isLoading} label="Avg. order value" value={k?.aov.value} previous={k?.aov.previous} change={k?.aov.change} format="currency" icon={Receipt} tone="warning" />
        <KpiCard loading={rev.isLoading} label="Refunds" value={k?.refunds.value} previous={k?.refunds.previous} change={k?.refunds.change} format="currency" icon={RotateCcw} tone="danger" invert />
        <KpiCard loading={rev.isLoading} label="Gross margin" value={k?.grossMargin.value} previous={k?.grossMargin.previous} change={k?.grossMargin.change} format="percent" icon={PieChart} tone="success" />
      </KpiGrid>

      <ChartCard
        className="mt-6"
        title="Revenue & orders over time"
        subtitle="Dashed line shows the previous period aligned to the same axis"
        loading={trend.isLoading}
        error={trend.isError && trend.error}
        onRetry={trend.refetch}
        empty={trend.data && !trend.data.trend.some((p) => p.revenue || p.prevRevenue)}
        height={340}
        action={<Segmented value={granularity} onChange={setGranularity} options={granOptions} />}
      >
        {trend.data && (
          <TrendChart
            data={trend.data.trend}
            granularity={trend.data.meta.granularity}
            format={{ revenue: 'currency', prevRevenue: 'currency', orders: 'number' }}
            height={340}
            series={[
              { key: 'revenue', label: 'Revenue' },
              { key: 'prevRevenue', label: 'Previous period', color: 'var(--chart-6)', dashed: true },
            ]}
          />
        )}
      </ChartCard>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="Category performance"
          subtitle="Click a bar to open the product list for that category"
          loading={rev.isLoading}
          error={rev.isError && rev.error}
          onRetry={rev.refetch}
          empty={rev.data && !rev.data.byCategory.length}
          action={
            <Segmented
              value={catView}
              onChange={setCatView}
              options={[
                { value: 'revenue', label: 'Revenue' },
                { value: 'units', label: 'Units' },
                { value: 'orders', label: 'Orders' },
              ]}
            />
          }
        >
          {rev.data && (
            <BarsChart
              data={rev.data.byCategory}
              x="category"
              format={catView === 'revenue' ? 'currency' : 'number'}
              series={[{ key: catView, label: fmt.label(catView) }]}
              colors={(_, i) => `var(--chart-${(i % 6) + 1})`}
              onBarClick={(d) => navigate(`/products?category=${encodeURIComponent(d.category)}`)}
            />
          )}
        </ChartCard>

        <ChartCard title="Payment methods" subtitle="Revenue share by payment method" loading={rev.isLoading} error={rev.isError && rev.error} onRetry={rev.refetch} empty={rev.data && !rev.data.byPayment.length} height={280}>
          {rev.data && <DonutChart data={rev.data.byPayment} nameKey="method" valueKey="revenue" format="currency" centerLabel="Revenue" height={220} />}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard title="Revenue by weekday" subtitle="Which days drive the most sales" loading={rev.isLoading} error={rev.isError && rev.error} onRetry={rev.refetch} height={260}>
          {rev.data && <BarsChart data={rev.data.byWeekday} x="day" format="currency" series={[{ key: 'revenue', label: 'Revenue' }]} height={260} />}
        </ChartCard>

        <ChartCard title="Sales channels" subtitle="Revenue by channel" loading={rev.isLoading} error={rev.isError && rev.error} onRetry={rev.refetch} height={260}>
          {rev.data && <DonutChart data={rev.data.byChannel} nameKey="channel" valueKey="revenue" format="currency" centerLabel="Revenue" height={200} />}
        </ChartCard>

        <Card>
          <CardHeader title="Top products" subtitle="Revenue and profit in this period" action={<Link to={`/products?from=${range.from}&to=${range.to}`} className="text-xs font-semibold text-brand hover:underline">All products</Link>} />
          {rev.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9" />
              ))}
            </div>
          ) : (
            <div className="scroll-x">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="text-[11px] font-bold uppercase tracking-wider text-muted">
                    <th className="w-full pb-2">Product</th>
                    <th className="pb-2 text-right">Units</th>
                    <th className="pb-2 text-right">Revenue</th>
                    <th className="pb-2 text-right">Profit</th>
                  </tr>
                </thead>
                <tbody>
                  {rev.data?.topProducts.slice(0, 8).map((p) => (
                    <tr key={p.id} className="border-t border-line/60">
                      <td className="w-full max-w-0 py-2 pr-2">
                        <span className="flex items-center gap-2">
                          <Package className="h-4 w-4 shrink-0 text-muted" />
                          <span className="min-w-0">
                            <span className="block truncate font-semibold text-ink">{p.name}</span>
                            <span className="block text-[11px] text-muted">{p.category}</span>
                          </span>
                        </span>
                      </td>
                      <td className="py-2 text-right tabular">{fmt.number(p.units)}</td>
                      <td className="py-2 text-right font-semibold tabular text-ink">{fmt.currency(p.revenue, { compact: true })}</td>
                      <td className="py-2 text-right tabular text-success">{fmt.currency(p.profit, { compact: true })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rev.data && !rev.data.topProducts.length && <p className="py-6 text-center text-sm text-muted">No sales in this period.</p>}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
