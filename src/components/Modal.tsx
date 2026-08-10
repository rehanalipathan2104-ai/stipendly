import { useEffect, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  size?: 'sm' | 'md' | 'lg';
}

export default function Modal({ open, onClose, title, description, children, footer, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const maxW = size === 'sm' ? 'max-w-md' : size === 'lg' ? 'max-w-3xl' : 'max-w-xl';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-ink-950/50 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        className={classNames(
          'relative bg-white w-full rounded-t-2xl sm:rounded-2xl shadow-card animate-scale-in max-h-[90vh] flex flex-col',
          maxW,
        )}
        role="dialog"
        aria-modal="true"
      >
        {(title || description) && (
          <div className="px-6 pt-5 pb-3 border-b border-ink-100">
            <div className="flex items-start justify-between gap-4">
              <div>
                {title && <h3 className="text-lg font-bold text-ink-900 font-display">{title}</h3>}
                {description && <p className="text-sm text-ink-500 mt-1">{description}</p>}
              </div>
              <button onClick={onClose} className="text-ink-400 hover:text-ink-700 hover:bg-ink-100 rounded-lg p-1 transition-colors" aria-label="Close">
                <X size={20} />
              </button>
            </div>
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto">{children}</div>
        {footer && <div className="px-6 py-4 border-t border-ink-100 flex justify-end gap-2 bg-ink-50/50 rounded-b-2xl">{footer}</div>}
      </div>
    </div>
  );
}
