import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { fmt, formatBy } from '@/utils/format';
import { presetRange, rangeLabel, isValidISO, rangeDays } from '@/utils/dates';
import { DataTable } from '@/components/ui/DataTable';
import { KpiCard } from '@/components/kpi/KpiCard';
import { Badge } from '@/components/ui';
import { ProtectedRoute, RoleRoute } from '@/features/auth/guards';
import { useAuthStore, can } from '@/stores/authStore';
import { useThemeStore } from '@/stores/themeStore';

describe('formatters', () => {
  it('formats currency, numbers, percentages and deltas', () => {
    expect(fmt.currency(1234.5)).toBe('$1,234.50');
    expect(fmt.currency(1250000, { compact: true })).toBe('$1.3M');
    expect(fmt.number(88682)).toBe('88,682');
    expect(fmt.percent(13.114, 1)).toBe('13.1%');
    expect(fmt.delta(4.3)).toBe('+4.3%');
    expect(fmt.delta(-1.5)).toBe('-1.5%');
    expect(fmt.duration(290)).toBe('4m 50s');
    expect(fmt.label('add_to_cart')).toBe('Add To Cart');
    expect(fmt.initials('Saketh Nalajala')).toBe('SN');
    expect(formatBy('currency', 10)).toBe('$10.00');
    expect(formatBy('status', 'super_admin')).toBe('Super Admin');
  });

  it('formats axis dates in UTC regardless of local timezone', () => {
    expect(fmt.axisDate('2026-01-01', 'day')).toBe('Jan 1');
    expect(fmt.axisDate('2026-01-01', 'month')).toBe('Jan 26');
  });
});

describe('date utilities', () => {
  it('builds presets and labels', () => {
    const r = presetRange('7d');
    expect(rangeDays(r.from, r.to)).toBe(7);
    expect(rangeLabel(r.from, r.to)).toBe('Last 7 days');
    expect(rangeLabel('2026-01-01', '2026-01-31')).toBe('Jan 1 – Jan 31, 2026');
    expect(isValidISO('2026-02-30')).toBe(false);
    expect(isValidISO('2026-02-28')).toBe(true);
    expect(isValidISO('nope')).toBe(false);
  });
});

describe('role helpers', () => {
  it('mirror the server permission matrix', () => {
    expect(can.export('viewer')).toBe(false);
    expect(can.export('analyst')).toBe(true);
    expect(can.edit('analyst')).toBe(false);
    expect(can.edit('admin')).toBe(true);
    expect(can.manageTeam('admin')).toBe(false);
    expect(can.manageTeam('super_admin')).toBe(true);
  });
});

describe('theme store', () => {
  it('toggles the dark class on <html> and persists', () => {
    useThemeStore.getState().setTheme('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(localStorage.getItem('nova-theme')).toBe('dark');
    useThemeStore.getState().toggle();
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(useThemeStore.getState().resolved).toBe('light');
  });
});

describe('KpiCard', () => {
  it('renders value, positive delta and previous value', () => {
    render(<KpiCard label="Revenue" value={199433.59} previous={174859} change={14.1} format="currency" />);
    expect(screen.getByText('$199,434')).toBeInTheDocument();
    expect(screen.getByText('+14.1%')).toBeInTheDocument();
    expect(screen.getByText(/vs previous period · \$174,859/)).toBeInTheDocument();
  });
  it('shows a skeleton while loading', () => {
    const { container } = render(<KpiCard label="x" loading />);
    expect(container.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });
});

describe('Badge', () => {
  it('maps statuses to labels', () => {
    render(<Badge status="cancelled" />);
    expect(screen.getByText('Cancelled')).toBeInTheDocument();
  });
});

describe('DataTable', () => {
  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'total', label: 'Total', sortable: true, align: 'right', render: (r) => fmt.currency(r.total) },
  ];
  const rows = [
    { id: 1, name: 'A', total: 10 },
    { id: 2, name: 'B', total: 20 },
  ];

  it('renders rows, sort indicators and pagination summary', () => {
    const onSort = vi.fn();
    const onPage = vi.fn();
    render(<DataTable columns={columns} rows={rows} sort="total" order="desc" onSort={onSort} pagination={{ page: 2, pages: 5, total: 48, limit: 10 }} onPage={onPage} />);
    expect(screen.getByText('$20.00')).toBeInTheDocument();
    expect(screen.getByText('11–20')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Name'));
    expect(onSort).toHaveBeenCalledWith('name');
    fireEvent.click(screen.getByLabelText('Next page'));
    expect(onPage).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByLabelText('First page'));
    expect(onPage).toHaveBeenCalledWith(1);
  });

  it('shows empty and error states', () => {
    const { rerender } = render(<DataTable columns={columns} rows={[]} emptyTitle="Nothing" />);
    expect(screen.getByText('Nothing')).toBeInTheDocument();
    rerender(<DataTable columns={columns} rows={[]} error={new Error('Boom')} onRetry={() => {}} />);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
  });
});

describe('route guards', () => {
  const App = ({ initial }) => (
    <MemoryRouter initialEntries={[initial]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/overview" element={<p>overview page</p>} />
        <Route element={<ProtectedRoute />}>
          <Route path="/private" element={<p>private page</p>} />
          <Route element={<RoleRoute roles={['super_admin']} />}>
            <Route path="/team" element={<p>team page</p>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>
  );

  it('redirects anonymous users to /login', () => {
    useAuthStore.setState({ status: 'anonymous', user: null, accessToken: null });
    render(<App initial="/private" />);
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders protected content for authenticated users and gates by role', () => {
    useAuthStore.setState({ status: 'authenticated', user: { role: 'viewer' }, accessToken: 't' });
    render(<App initial="/private" />);
    expect(screen.getByText('private page')).toBeInTheDocument();
  });

  it('sends non-super-admins away from role-gated routes', () => {
    useAuthStore.setState({ status: 'authenticated', user: { role: 'admin' }, accessToken: 't' });
    render(<App initial="/team" />);
    expect(screen.getByText('overview page')).toBeInTheDocument();
  });
});
