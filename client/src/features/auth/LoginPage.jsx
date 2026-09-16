import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { login } from './useAuth';
import { Button, Input } from '@/components/ui';
import { Logo } from '@/components/layout/Sidebar';
import { ThemeToggle } from '@/components/layout/AppLayout';
import { cn } from '@/utils/format';

const schema = z.object({
  email: z.string().trim().email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

const DEMO_ACCOUNTS = [
  { role: 'Super Admin', email: 'superadmin@demo.com', hint: 'Full access incl. team' },
  { role: 'Admin', email: 'admin@demo.com', hint: 'Edit products & orders' },
  { role: 'Analyst', email: 'analyst@demo.com', hint: 'View + export' },
  { role: 'Viewer', email: 'viewer@demo.com', hint: 'Read-only' },
];
const DEMO = import.meta.env.VITE_DEMO_MODE === 'true';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [show, setShow] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { email: '', password: '' } });

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await login(values);
      navigate(location.state?.from?.pathname || '/overview', { replace: true });
    } catch (err) {
      setServerError(err.message || 'Unable to sign in');
    }
  };

  const fill = (email) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password123', { shouldValidate: true });
    setServerError('');
  };

  return (
    <div className="grid min-h-screen bg-bg lg:grid-cols-[1.1fr_1fr]">
      {/* Brand panel */}
      <section className="relative hidden overflow-hidden bg-gradient-to-br from-[#4318FF] via-[#5a3dff] to-[#39B8FF] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div className="absolute -left-24 -top-24 h-96 w-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 h-[28rem] w-[28rem] rounded-full bg-[#05CD99]/25 blur-3xl" />
        <Link to="/" className="relative flex items-center gap-3 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="text-xl font-extrabold">Nova Analytics</span>
        </Link>
        <div className="relative max-w-md">
          <h1 className="text-4xl font-extrabold leading-tight">Every metric that matters, one dashboard.</h1>
          <p className="mt-4 text-white/80">Revenue, engagement, conversion funnels and exportable reports — computed live from your data with role-based access for your whole team.</p>
          <div className="mt-8 grid grid-cols-3 gap-3">
            {[
              ['12k+', 'orders analysed'],
              ['200k', 'sessions tracked'],
              ['9', 'dashboard views'],
            ].map(([v, l]) => (
              <div key={l} className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur">
                <p className="text-2xl font-extrabold">{v}</p>
                <p className="text-xs text-white/75">{l}</p>
              </div>
            ))}
          </div>
        </div>
        <p className="relative flex items-center gap-2 text-xs text-white/70">
          <ShieldCheck className="h-4 w-4" /> Secured with JWT rotation, httpOnly cookies and server-side RBAC
        </p>
      </section>

      {/* Form */}
      <section className="flex flex-col p-6 sm:p-10">
        <div className="flex items-center justify-between">
          <Link to="/" className="lg:hidden">
            <Logo />
          </Link>
          <div className="ml-auto">
            <ThemeToggle />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <h2 className="text-3xl font-extrabold tracking-tight text-ink">Welcome back</h2>
          <p className="mt-2 text-sm text-muted">Sign in to your workspace to continue.</p>

          <form onSubmit={handleSubmit(onSubmit)} className="mt-8 space-y-4" noValidate>
            <Input id="email" label="Email" type="email" autoComplete="email" placeholder="you@company.com" error={errors.email?.message} {...register('email')} />
            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <div className="relative">
                <input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" className={cn('input pr-11', errors.password && 'border-danger/60')} {...register('password')} />
                <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted hover:text-ink focus-ring" aria-label={show ? 'Hide password' : 'Show password'}>
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && <p className="mt-1 text-xs text-danger">{errors.password.message}</p>}
            </div>
            {serverError && (
              <div role="alert" className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
                {serverError}
              </div>
            )}
            <Button type="submit" size="lg" className="w-full" loading={isSubmitting}>
              Sign in <ArrowRight className="h-4 w-4" />
            </Button>
          </form>

          {DEMO && (
            <div className="mt-8">
              <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-muted">Demo accounts · password “Password123”</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((a) => (
                  <button key={a.email} type="button" onClick={() => fill(a.email)} className="rounded-xl border border-line bg-surface p-3 text-left transition-colors hover:border-brand/50 hover:bg-brand-soft/40 focus-ring">
                    <p className="text-sm font-bold text-ink">{a.role}</p>
                    <p className="text-[11px] text-muted">{a.hint}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          <p className="mt-8 text-center text-xs text-muted">
            Accounts are provisioned by an administrator.{' '}
            <Link to="/" className="font-semibold text-brand hover:underline">
              Back to home
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
