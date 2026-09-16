import { Link } from 'react-router-dom';
import { DollarSign, ShoppingCart, Receipt, Users, Percent, UserPlus, ArrowUpRight } from 'lucide-react';
import { useDateRange } from '@/hooks/useDateRange';
import { useOverview } from '@/api/queries';
import { KpiCard, KpiGrid } from '@/components/kpi/KpiCard';
import { ChartCard, TrendChart, DonutChart, BarsChart, STATUS_COLORS } from '@/components/charts';
import { Card, CardHeader, Badge, Avatar, Skeleton, ErrorState, PageHeader, Progress } from '@/components/ui';
import { fmt } from '@/utils/format';
import { rangeLabel } from '@/utils/dates';

export default function OverviewPage() {
  const range = useDateRange();
  const { data, isLoading, isError, error, refetch } = useOverview(range);
  const k = data?.kpis;
  const g = data?.meta?.granularity || 'day';
  const qs = `?from=${range.from}&to=${range.to}`;

  if (isError && !data) return <ErrorState error={error} onRetry={refetch} />;

  return (
    <>
      <PageHeader title="Overview" description={`Business performance · ${rangeLabel(range.from, range.to)}`} />

      <KpiGrid cols={6}>
        <KpiCard loading={isLoading} label="Total revenue" value={k?.revenue.value} previous={k?.revenue.previous} change={k?.revenue.change} format="currency" icon={DollarSign} tone="brand" spark={k?.revenue.spark} />
        <KpiCard loading={isLoading} label="Orders" value={k?.orders.value} previous={k?.orders.previous} change={k?.orders.change} icon={ShoppingCart} tone="info" spark={k?.orders.spark} />
        <KpiCard loading={isLoading} label="Avg. order value" value={k?.aov.value} previous={k?.aov.previous} change={k?.aov.change} format="currency" icon={Receipt} tone="success" />
        <KpiCard loading={isLoading} label="Active users" value={k?.activeUsers.value} previous={k?.activeUsers.previous} change={k?.activeUsers.change} icon={Users} tone="warning" />
        <KpiCard loading={isLoading} label="Conversion rate" value={k?.conversionRate.value} previous={k?.conversionRate.previous} change={k?.conversionRate.change} format="percent" icon={Percent} tone="brand" />
        <KpiCard loading={isLoading} label="New customers" value={k?.newCustomers.value} previous={k?.newCustomers.previous} change={k?.newCustomers.change} icon={UserPlus} tone="success" />
      </KpiGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Revenue trend" subtitle="Current period vs the previous period of equal length" loading={isLoading} error={isError && error} onRetry={refetch} empty={data && !data.revenueTrend.some((p) => p.revenue || p.prevRevenue)}>
          {data && (
            <TrendChart
              data={data.revenueTrend}
              granularity={g}
              format="currency"
              series={[
                { key: 'revenue', label: 'Revenue' },
                { key: 'prevRevenue', label: 'Previous period', color: 'var(--chart-6)', dashed: true },
              ]}
            />
          )}
        </ChartCard>

        <ChartCard title="Orders by status" subtitle="Distribution across fulfilment stages" loading={isLoading} error={isError && error} onRetry={refetch} empty={data && !data.ordersByStatus.some((s) => s.count)} height={280}>
          {data && <DonutChart data={data.ordersByStatus.filter((s) => s.count)} nameKey="status" valueKey="count" colors={(d) => STATUS_COLORS[d.status]} centerLabel="Orders" height={220} />}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard title="Revenue by category" subtitle="Share of revenue per product category" loading={isLoading} error={isError && error} onRetry={refetch} empty={data && !data.revenueByCategory.length} height={300}>
          {data && <BarsChart data={data.revenueByCategory} x="category" layout="horizontal" format="currency" series={[{ key: 'revenue', label: 'Revenue' }]} colors={(_, i) => `var(--chart-${(i % 6) + 1})`} height={300} />}
        </ChartCard>

        <Card>
          <CardHeader
            title="Top products"
            subtitle="By revenue in this period"
            action={
              <Link to={`/products${qs}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
                View all <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            }
          />
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : (
            <ul className="space-y-3.5">
              {data?.topProducts.map((p, i) => (
                <li key={p.id}>
                  <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[11px] font-bold text-muted">{i + 1}</span>
                      <span className="truncate font-semibold text-ink">{p.name}</span>
                    </span>
                    <span className="shrink-0 font-bold tabular text-ink">{fmt.currency(p.revenue, { compact: true })}</span>
                  </div>
                  <Progress value={p.revenue} max={data.topProducts[0]?.revenue} color={`var(--chart-${(i % 6) + 1})`} className="h-1.5" />
                  <p className="mt-1 text-[11px] text-muted">
                    {p.category} · {fmt.number(p.units)} units
                  </p>
                </li>
              ))}
              {data && !data.topProducts.length && <p className="py-6 text-center text-sm text-muted">No sales in this period.</p>}
            </ul>
          )}
        </Card>

        <ChartCard title="Traffic sources" subtitle="Sessions by acquisition channel" loading={isLoading} error={isError && error} onRetry={refetch} empty={data && !data.trafficSources.length} height={280}>
          {data && <DonutChart data={data.trafficSources} nameKey="name" valueKey="sessions" centerLabel="Sessions" height={220} />}
        </ChartCard>
      </div>

      <Card className="mt-6 p-0">
        <CardHeader
          className="px-6 pt-6"
          title="Recent orders"
          subtitle="Latest orders placed in this period"
          action={
            <Link to={`/orders${qs}`} className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline">
              All orders <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          }
        />
        <div className="scroll-x">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-y border-line bg-surface-2/60 text-[11px] font-bold uppercase tracking-wider text-muted">
                <th className="px-6 py-3">Order</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-line/60">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="px-4 py-3.5">
                          <Skeleton className="h-4 w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                : data?.recentOrders.map((o) => (
                    <tr key={o.id} className="border-b border-line/60 last:border-0 hover:bg-surface-2/60">
                      <td className="px-6 py-3 font-semibold text-brand">
                        <Link to={`/orders?search=${o.orderNumber}`}>{o.orderNumber}</Link>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2.5">
                          <Avatar name={o.customerName} color="#39B8FF" size="sm" />
                          <span>
                            <span className="block font-semibold text-ink">{o.customerName}</span>
                            <span className="block text-xs text-muted">{o.customerEmail}</span>
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted">{fmt.dateTime(o.createdAt)}</td>
                      <td className="px-4 py-3">
                        <Badge status={o.status} />
                      </td>
                      <td className="px-6 py-3 text-right font-bold tabular text-ink">{fmt.currency(o.total)}</td>
                    </tr>
                  ))}
              {data && !data.recentOrders.length && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    No orders in this period.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}
