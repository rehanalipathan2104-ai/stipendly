import { classNames, scoreColor } from '@/lib/utils';
import { ShieldCheck } from 'lucide-react';

interface HonourScoreProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export default function HonourScore({ score, size = 'md', showLabel = true }: HonourScoreProps) {
  const c = scoreColor(score);
  const dims = size === 'lg' ? 'h-32 w-32' : size === 'sm' ? 'h-14 w-14' : 'h-20 w-20';
  const stroke = size === 'lg' ? 8 : size === 'sm' ? 4 : 6;
  const r = (size === 'lg' ? 64 : size === 'sm' ? 28 : 36) - stroke / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const labelSize = size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl';

  return (
    <div className="flex items-center gap-3">
      <div className={classNames('relative', dims)}>
        <svg className="-rotate-90" viewBox={`0 0 ${size === 'lg' ? 128 : size === 'sm' ? 56 : 72} ${size === 'lg' ? 128 : size === 'sm' ? 56 : 72}`}>
          <circle cx={size === 'lg' ? 64 : size === 'sm' ? 28 : 36} cy={size === 'lg' ? 64 : size === 'sm' ? 28 : 36} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-ink-100" />
          <circle
            cx={size === 'lg' ? 64 : size === 'sm' ? 28 : 36}
            cy={size === 'lg' ? 64 : size === 'sm' ? 28 : 36}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            className={classNames('transition-all duration-700', c.ring)}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={classNames('font-bold font-display', labelSize, c.text)}>{score}</span>
          {size !== 'sm' && <span className="text-[10px] uppercase tracking-wider text-ink-400 font-semibold">Honour</span>}
        </div>
      </div>
      {showLabel && (
        <div>
          <div className={classNames('chip border', c.text, 'bg-transparent border-current/20')}>
            <ShieldCheck size={12} />
            {c.label}
          </div>
          {size === 'lg' && <p className="text-xs text-ink-400 mt-1.5 max-w-[12rem]">Decays with every verified red flag. Auto-ban below 40.</p>}
        </div>
      )}
    </div>
  );
}
