import { Link } from 'react-router-dom';
import { ArrowRight, BarChart3, ShieldCheck, FileDown, Filter, Moon, Zap, Github } from 'lucide-react';
import { Logo } from '@/components/layout/Sidebar';
import { ThemeToggle } from '@/components/layout/AppLayout';
import { useAuthStore } from '@/stores/authStore';
import { Sparkline } from '@/components/charts';

const FEATURES = [
  { icon: BarChart3, title: 'Live analytics', text: 'Revenue, engagement, funnel and product KPIs computed with MongoDB aggregations — nothing hard-coded.' },
  { icon: Filter, title: 'Deep filtering', text: 'Global date ranges, category and status filters, search, sorting and server-side pagination on every list.' },
  { icon: FileDown, title: 'Report builder', text: 'Five report types with previews, summary tiles and full-dataset CSV export for analysts.' },
  { icon: ShieldCheck, title: 'Real security', text: 'bcrypt, short-lived JWTs, rotating httpOnly refresh cookies and role checks enforced on the API.' },
  { icon: Moon, title: 'Dark & light', text: 'A token-based design system that switches instantly and respects your OS preference.' },
  { icon: Zap, title: 'Fast by design', text: 'Indexed queries, cached React Query data and route-level code splitting keep every view snappy.' },
];

export default function LandingPage() {
  const status = useAuthStore((s) => s.status);
  const cta = status === 'authenticated' ? '/overview' : '/login';
  return (
    <div className="min-h-screen bg-bg">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Logo />
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link to={cta} className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand px-4 text-sm font-semibold text-white shadow-glow hover:bg-brand-hover focus-ring">
            {status === 'authenticated' ? 'Open dashboard' : 'Sign in'} <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-12 py-14 lg:grid-cols-2 lg:py-24">
          <div className="animate-fade-up">
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/30 bg-brand-soft px-3 py-1 text-xs font-bold text-brand">
              <Zap className="h-3.5 w-3.5" /> Interactive Analytics Dashboard
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              See your business <span className="bg-gradient-to-r from-brand to-[#39B8FF] bg-clip-text text-transparent">clearly.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted sm:text-lg">A premium SaaS analytics platform for revenue, customers, products, orders and conversion — with role-based access, interactive charts and exportable reports.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={cta} className="inline-flex h-12 items-center gap-2 rounded-xl bg-brand px-6 text-sm font-semibold text-white shadow-glow hover:bg-brand-hover focus-ring">
                View live demo <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex h-12 items-center rounded-xl border border-line bg-surface px-6 text-sm font-semibold text-ink hover:border-brand/40 focus-ring">
                Explore features
              </a>
            </div>
            <p className="mt-4 text-xs text-muted">Demo credentials are pre-filled on the sign-in page.</p>
          </div>

          {/* Hero mock */}
          <div className="relative animate-fade-up [animation-delay:120ms]">
            <div className="absolute -inset-6 rounded-[32px] bg-gradient-to-br from-brand/25 to-[#39B8FF]/20 blur-2xl" />
            <div className="card relative overflow-hidden p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-muted">Total revenue · Last 30 days</p>
                  <p className="text-2xl font-extrabold text-ink">$199,433</p>
                </div>
                <span className="rounded-full bg-success/12 px-2.5 py-1 text-xs font-bold text-success">▲ 14.1%</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[
                  ['Orders', '874', [36, 38, 22, 28, 28, 32, 35, 42, 36, 28]],
                  ['Conversion', '13.1%', [12, 14, 13, 15, 13, 12, 14, 13, 13, 13]],
                  ['Active users', '1,619', [110, 130, 120, 150, 140, 160, 155, 170, 165, 180]],
                ].map(([l, v, s]) => (
                  <div key={l} className="rounded-xl bg-surface-2 p-3">
                    <p className="text-[11px] font-semibold text-muted">{l}</p>
                    <p className="text-base font-extrabold text-ink">{v}</p>
                    <Sparkline data={s} width={80} height={24} />
                  </div>
                ))}
              </div>
              <div className="mt-4 flex h-32 items-end gap-1.5">
                {[40, 55, 45, 70, 60, 80, 65, 90, 75, 95, 85, 100, 70, 88, 92, 78, 84, 96, 90, 100].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-md bg-gradient-to-t from-brand/70 to-[#39B8FF]" style={{ height: `${h}%`, opacity: 0.55 + (i / 20) * 0.45 }} />
                ))}
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-14">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-ink">Built like a real product</h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted">Nine dashboard views, four roles, thirty API endpoints, and a test suite — designed for internship review and production-style code quality.</p>
          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-6 transition-transform hover:-translate-y-1">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-bold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm text-muted">{f.text}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-14">
          <div className="card flex flex-col items-center gap-4 bg-gradient-to-br from-brand to-[#39B8FF] p-10 text-center text-white">
            <h2 className="text-2xl font-extrabold sm:text-3xl">Ready to explore the data?</h2>
            <p className="max-w-xl text-white/80">Sign in with any demo role to see how permissions shape the experience — from read-only Viewer to Super Admin.</p>
            <Link to={cta} className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-6 text-sm font-bold text-brand hover:bg-white/90 focus-ring">
              Open the dashboard <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-muted">
        <span>© {new Date().getFullYear()} Nova Analytics · React · Vite · Tailwind · Recharts · Express · MongoDB</span>
        <span className="inline-flex items-center gap-1.5">
          <Github className="h-3.5 w-3.5" /> Portfolio project
        </span>
      </footer>
    </div>
  );
}
