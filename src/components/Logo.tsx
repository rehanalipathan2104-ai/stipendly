import { useState } from 'react';
import { Link as LinkIcon, Check, Copy } from 'lucide-react';

export default function Logo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dim = size === 'lg' ? 'h-11 w-11' : size === 'sm' ? 'h-7 w-7' : 'h-9 w-9';
  const text = size === 'lg' ? 'text-2xl' : size === 'sm' ? 'text-base' : 'text-lg';
  return (
    <div className="flex items-center gap-2.5">
      <div className={`${dim} rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-sm`}>
        <LinkIcon size={size === 'lg' ? 22 : size === 'sm' ? 14 : 18} className="text-white" strokeWidth={2.5} />
      </div>
      <span className={`${text} font-display font-extrabold tracking-tight text-ink-900`}>
        Stipend<span className="text-brand-600">ly</span>
      </span>
    </div>
  );
}

export function CopyButton({ text, label = 'Copy' }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };
  return (
    <button onClick={copy} className="btn-ghost text-xs px-2 py-1">
      {copied ? <Check size={14} className="text-brand-600" /> : <Copy size={14} />}
      {copied ? 'Copied' : label}
    </button>
  );
}
