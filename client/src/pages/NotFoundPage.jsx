import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import { Logo } from '@/components/layout/Sidebar';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-bg p-6 text-center">
      <Logo />
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-brand-soft text-brand">
        <Compass className="h-8 w-8" />
      </div>
      <div>
        <p className="text-6xl font-extrabold text-ink">404</p>
        <p className="mt-2 text-muted">The page you are looking for does not exist.</p>
      </div>
      <Link to="/overview" className="inline-flex h-11 items-center rounded-xl bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-hover focus-ring">
        Go to dashboard
      </Link>
    </div>
  );
}
