import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Loader2, Sparkles, ShieldAlert, Lightbulb } from 'lucide-react';
import { classNames, severityColor } from '@/lib/utils';
import type { RiskAssessment } from '@/lib/types';
import { assessRisk, improveJobDescription, type ImproveResult } from '@/lib/ai';

interface AIPanelProps {
  mode: 'review' | 'improve';
  input: {
    title: string;
    description: string;
    requirements: string;
    skills: string[];
    stipendMin?: number | null;
    stipendMax?: number | null;
    durationWeeks?: number | null;
    location?: string | null;
    isRemote?: boolean;
    category?: string | null;
  };
  onApply?: (result: ImproveResult) => void;
}

type Phase = 'idle' | 'thinking' | 'done';

export default function AIPanel({ mode, input, onApply }: AIPanelProps) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [assessment, setAssessment] = useState<RiskAssessment | null>(null);
  const [improved, setImproved] = useState<ImproveResult | null>(null);

  const run = async () => {
    setPhase('thinking');
    await new Promise((r) => setTimeout(r, 700));
    if (mode === 'review') {
      setAssessment(assessRisk(input));
    } else {
      setImproved(improveJobDescription(input));
    }
    setPhase('done');
  };

  useEffect(() => {
    setPhase('idle');
    setAssessment(null);
    setImproved(null);
  }, [mode, JSON.stringify(input)]);

  return (
    <div className="card p-5 border-brand-200/60 bg-gradient-to-br from-brand-50/40 to-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
            <Sparkles size={16} />
          </div>
          <div>
            <h4 className="font-semibold text-ink-900 text-sm">
              {mode === 'review' ? 'AI Trust Review' : 'AI Job Description Assistant'}
            </h4>
            <p className="text-xs text-ink-400">
              {mode === 'review' ? 'Scans for fake-internship signals' : 'Polishes your listing for clarity and trust'}
            </p>
          </div>
        </div>
        <button onClick={run} disabled={phase === 'thinking'} className="btn-primary text-xs px-3 py-2">
          {phase === 'thinking' ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {phase === 'thinking' ? 'Analysing…' : phase === 'done' ? 'Re-run' : 'Run AI'}
        </button>
      </div>

      {phase === 'thinking' && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-4 w-full" />)}
        </div>
      )}

      {phase === 'done' && mode === 'review' && assessment && (
        <div className="space-y-3 animate-fade-in">
          <div className={classNames(
            'rounded-xl p-3 flex gap-2.5 text-sm',
            assessment.risk_level === 'safe' ? 'bg-brand-50 text-brand-800' :
            assessment.risk_level === 'caution' ? 'bg-accent-50 text-accent-800' :
            'bg-danger-50 text-danger-800',
          )}>
            {assessment.risk_level === 'safe' ? <CheckCircle2 size={18} /> : <ShieldAlert size={18} />}
            <p>{assessment.summary}</p>
          </div>
          {assessment.flags.length > 0 && (
            <div className="space-y-2">
              {assessment.flags.map((f) => (
                <div key={f.code} className="rounded-xl border border-ink-200 p-3">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-semibold text-sm text-ink-800">{f.label}</span>
                    <span className={classNames('chip border text-[10px] uppercase tracking-wide', severityColor(f.severity))}>
                      {f.severity} · -{Math.round((100 - assessment.score) * 0)}pt
                    </span>
                  </div>
                  <p className="text-xs text-ink-500">{f.explanation}</p>
                </div>
              ))}
            </div>
          )}
          <p className="text-xs text-ink-400">
            This is a heuristic pass. The honour score updates automatically when reports are filed against a live listing.
          </p>
        </div>
      )}

      {phase === 'done' && mode === 'improve' && improved && (
        <div className="space-y-3 animate-fade-in">
          <div className="rounded-xl bg-brand-50 p-3 flex gap-2.5 text-sm text-brand-800">
            <Lightbulb size={18} />
            <p>Added sections: {improved.addedSections.join(', ')}.</p>
          </div>
          {improved.suggestions.length > 0 && (
            <ul className="space-y-1.5">
              {improved.suggestions.map((s, i) => (
                <li key={i} className="text-xs text-ink-600 flex gap-2">
                  <AlertTriangle size={14} className="text-accent-500 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          )}
          <div className="rounded-xl bg-ink-950 text-ink-100 p-3 font-mono text-xs whitespace-pre-wrap max-h-64 overflow-y-auto">
            {improved.polished}
          </div>
          {onApply && (
            <button onClick={() => onApply(improved)} className="btn-primary w-full text-xs py-2">
              Apply polished description
            </button>
          )}
        </div>
      )}
    </div>
  );
}
