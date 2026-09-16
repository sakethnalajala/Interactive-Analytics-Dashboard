import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/utils/format';

const variants = {
  primary: 'bg-brand text-white hover:bg-brand-hover shadow-glow/50 disabled:shadow-none',
  secondary: 'bg-surface-2 text-ink border border-line hover:border-brand/40 hover:text-brand',
  ghost: 'text-muted hover:bg-surface-2 hover:text-ink',
  danger: 'bg-danger/10 text-danger hover:bg-danger hover:text-white',
  outline: 'border border-line text-ink hover:bg-surface-2',
};
const sizes = { sm: 'h-8 px-3 text-xs gap-1.5', md: 'h-10 px-4 text-sm gap-2', lg: 'h-11 px-5 text-sm gap-2', icon: 'h-9 w-9 p-0' };

export const Button = forwardRef(function Button({ className, variant = 'primary', size = 'md', loading, disabled, children, icon: Icon, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-150 focus-ring disabled:opacity-60 disabled:cursor-not-allowed active:scale-[.98]',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : Icon ? <Icon className="h-4 w-4" /> : null}
      {children}
    </button>
  );
});
