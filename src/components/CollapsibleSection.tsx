import { useState, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { classNames } from '@/lib/utils';

interface CollapsibleSectionProps {
  title: string;
  icon?: ReactNode;
  defaultOpen?: boolean;
  children: ReactNode;
  right?: ReactNode;
}

export default function CollapsibleSection({ title, icon, defaultOpen = false, children, right }: CollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-left"
      >
        <span className="flex items-center gap-2.5 font-semibold text-ink-800">
          {icon}
          {title}
        </span>
        <span className="flex items-center gap-3">
          {right}
          <ChevronDown size={18} className={classNames('text-ink-400 transition-transform', open && 'rotate-180')} />
        </span>
      </button>
      {open && <div className="px-5 pb-5 pt-1 animate-fade-in">{children}</div>}
    </div>
  );
}
