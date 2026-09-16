import { useState } from 'react';
import { Activity, Users, UserPlus, Repeat, Clock, Layers, Percent, ShoppingBag } from 'lucide-react';
import { useDateRange } from '@/hooks/useDateRange';
import { useEngagement, useFunnel } from '@/api/queries';
import { KpiCard, KpiGrid } from '@/components/kpi/KpiCard';
import { ChartCard, TrendChart, DonutChart, BarsChart, FunnelChart, Heatmap } from '@/components/charts';
import { PageHeader, Segmented, ErrorState } from '@/components/ui';
import { rangeLabel } from '@/utils/dates';
import { fmt } from '@/utils/format';

export default function AnalyticsPage() {
  const range = useDateRange();
  const eng = useEngagement(range);
  const fun = useFunnel(range);
  const [usersView, setUsersView] = useState('split');
  const k = eng.data?.kpis;
  const g = eng.data?.meta?.granularity || 'day';

  if (eng.isError && !eng.data) return <ErrorState error={eng.error} onRetry={eng.refetch} />;

  return (
    <>
      <PageHeader title="Analytics" description={`User engagement & conversion · ${rangeLabel(range.from, range.to)}`} />

      <KpiGrid cols={4}>
        <KpiCard loading={eng.isLoading} label="Sessions" value={k?.sessions.value} previous={k?.sessions.previous} change={k?.sessions.change} icon={Activity} tone="brand" />
        <KpiCard loading={eng.isLoading} label="Active users" value={k?.activeUsers.value} previous={k?.activeUsers.previous} change={k?.activeUsers.change} icon={Users} tone="info" />
        <KpiCard loading={eng.isLoading} label="New users" value={k?.newUsers.value} previous={k?.newUsers.previous} change={k?.newUsers.change} icon={UserPlus} tone="success" />
        <KpiCard loading={eng.isLoading} label="Returning users" value={k?.returningUsers.value} previous={k?.returningUsers.previous} change={k?.returningUsers.change} icon={Repeat} tone="warning" />
        <KpiCard loading={eng.isLoading} label="Avg. session duration" value={k?.avgDuration.value} previous={k?.avgDuration.previous} change={k?.avgDuration.change} format="duration" icon={Clock} tone="info" />
        <KpiCard loading={eng.isLoading} label="Pages / session" value={k?.pagesPerSession.value} previous={k?.pagesPerSession.previous} change={k?.pagesPerSession.change} format="decimal" icon={Layers} tone="brand" />
        <KpiCard loading={eng.isLoading} label="Conversion rate" value={k?.conversionRate.value} previous={k?.conversionRate.previous} change={k?.conversionRate.change} format="percent" icon={Percent} tone="success" />
        <KpiCard loading={eng.isLoading} label="Cart abandonment" value={k?.cartAbandonment.value} previous={k?.cartAbandonment.previous} change={k?.cartAbandonment.change} format="percent" icon={ShoppingBag} tone="danger" invert />
      </KpiGrid>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard
          className="xl:col-span-2"
          title="User activity"
          subtitle="Sessions and users over time"
          loading={eng.isLoading}
          error={eng.isError && eng.error}
          onRetry={eng.refetch}
          empty={eng.data && !eng.data.trend.some((p) => p.sessions)}
          action={
            <Segmented
              value={usersView}
              onChange={setUsersView}
              options={[
                { value: 'split', label: 'New vs returning' },
                { value: 'sessions', label: 'Sessions' },
              ]}
            />
          }
        >
          {eng.data &&
            (usersView === 'split' ? (
              <TrendChart data={eng.data.trend} granularity={g} stacked series={[{ key: 'newUsers', label: 'New users', color: 'var(--chart-3)' }, { key: 'returningUsers', label: 'Returning users', color: 'var(--chart-1)' }]} />
            ) : (
              <TrendChart data={eng.data.trend} granularity={g} series={[{ key: 'sessions', label: 'Sessions' }, { key: 'pageViews', label: 'Page views', color: 'var(--chart-2)' }]} />
            ))}
        </ChartCard>

        <ChartCard title="Devices" subtitle="Sessions by device type" loading={eng.isLoading} error={eng.isError && eng.error} onRetry={eng.refetch} empty={eng.data && !eng.data.byDevice.length} height={280}>
          {eng.data && <DonutChart data={eng.data.byDevice} nameKey="name" valueKey="sessions" centerLabel="Sessions" height={220} />}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <ChartCard title="Conversion funnel" subtitle="Sessions reaching each stage · drop-off vs previous stage" loading={fun.isLoading} error={fun.isError && fun.error} onRetry={fun.refetch} empty={fun.data && !fun.data.stages[0]?.count} height={280}>
          {fun.data && <FunnelChart stages={fun.data.stages} />}
        </ChartCard>

        <ChartCard title="Conversion rate trend" subtitle="Purchases ÷ sessions per period" loading={fun.isLoading} error={fun.isError && fun.error} onRetry={fun.refetch} empty={fun.data && !fun.data.conversionTrend.some((p) => p.sessions)} height={280}>
          {fun.data && <TrendChart type="line" data={fun.data.conversionTrend} granularity={g} format="percent" height={280} series={[{ key: 'conversionRate', label: 'Conversion rate', color: 'var(--chart-3)' }]} showLegend={false} />}
        </ChartCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartCard title="Acquisition channels" subtitle="Sessions and conversion rate by source" loading={eng.isLoading} error={eng.isError && eng.error} onRetry={eng.refetch} empty={eng.data && !eng.data.bySource.length} height={300}>
          {eng.data && <BarsChart data={eng.data.bySource} x="name" xFormatter={fmt.label} series={[{ key: 'sessions', label: 'Sessions' }]} colors={(_, i) => `var(--chart-${(i % 6) + 1})`} height={300} />}
        </ChartCard>

        <ChartCard className="xl:col-span-2" title="Activity heatmap" subtitle="Sessions by weekday and hour (UTC)" loading={eng.isLoading} error={eng.isError && eng.error} onRetry={eng.refetch} height={300}>
          {eng.data && <Heatmap grid={eng.data.heatmap} />}
        </ChartCard>
      </div>
    </>
  );
}
