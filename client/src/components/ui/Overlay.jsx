import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '@/utils/format';
import { useDismiss } from '@/hooks/useDebounce';

function useLockScroll(active) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

function Backdrop({ onClose, children }) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#0b1437]/50 p-0 backdrop-blur-sm animate-fade-in sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      {children}
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- Modal
export function Modal({ open, onClose, title, description, children, footer, size = 'md' }) {
  useLockScroll(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'sm:max-w-md', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl' }[size];
  return (
    <Backdrop onClose={onClose}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cn('card w-full max-h-[92vh] overflow-y-auto rounded-b-none p-6 animate-scale-in sm:rounded-b-xl2', w)}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-ink">{title}</h2>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-ring" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
        {footer && <div className="mt-6 flex flex-wrap justify-end gap-2">{footer}</div>}
      </div>
    </Backdrop>
  );
}

// ---------------------------------------------------------------- Drawer (right)
export function Drawer({ open, onClose, title, children, width = 'max-w-lg' }) {
  useLockScroll(open);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex justify-end bg-[#0b1437]/50 backdrop-blur-sm animate-fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <aside role="dialog" aria-modal="true" aria-label={title} className={cn('flex h-full w-full flex-col bg-surface shadow-pop animate-slide-in-right', width)}>
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="text-base font-bold text-ink">{title}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink focus-ring" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}

// ---------------------------------------------------------------- Dropdown menu
export function Dropdown({ trigger, children, align = 'right', className }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useDismiss(ref, () => setOpen(false), open);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      {open && (
        <div
          className={cn('absolute z-40 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-line bg-surface p-1.5 shadow-pop animate-scale-in', align === 'right' ? 'right-0' : 'left-0', className)}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon: Icon, children, danger, ...props }) {
  return (
    <button className={cn('flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors focus-ring', danger ? 'text-danger hover:bg-danger/10' : 'text-ink hover:bg-surface-2')} {...props}>
      {Icon && <Icon className="h-4 w-4 opacity-70" />}
      {children}
    </button>
  );
}

// ---------------------------------------------------------------- Confirm dialog
export function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = 'Confirm', danger, loading }) {
  return (
    <Modal open={open} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex justify-end gap-2">
        <button onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-muted hover:bg-surface-2 focus-ring">
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={loading}
          className={cn('rounded-xl px-4 py-2 text-sm font-semibold text-white focus-ring disabled:opacity-60', danger ? 'bg-danger hover:bg-danger/90' : 'bg-brand hover:bg-brand-hover')}
        >
          {loading ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
