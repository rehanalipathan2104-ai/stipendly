import { useMemo, useState } from 'react';
import { Flag, Loader2, Send, ShieldQuestion } from 'lucide-react';
import Modal from './Modal';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { analyzeReport, FLAG_DEFS } from '@/lib/ai';
import { classNames, severityColor } from '@/lib/utils';

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  internshipId: string;
  internshipTitle: string;
}

export default function ReportModal({ open, onClose, internshipId, internshipTitle }: ReportModalProps) {
  const { profile } = useAuth();
  const [flagCode, setFlagCode] = useState(FLAG_DEFS[0].code);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const preview = useMemo(() => (details.trim().length > 10 ? analyzeReport({ flagCode, details }) : null), [flagCode, details]);

  const submit = async () => {
    if (!profile) return;
    setSubmitting(true);
    setError(null);
    const ai = preview ? { flags: preview.flags, summary: preview.summary } : null;
    const { error: insErr } = await supabase.from('reports').insert({
      internship_id: internshipId,
      reporter_id: profile.id,
      flag_code: flagCode,
      details: details.trim(),
      ai_analysis: ai,
    });
    if (insErr) {
      setError(insErr.message);
      setSubmitting(false);
      return;
    }
    const def = FLAG_DEFS.find((f) => f.code === flagCode);
    if (def) {
      await supabase.from('honour_events').insert({
        internship_id: internshipId,
        delta: -def.points,
        reason: def.label,
        severity: def.severity,
        source: 'report',
      });
    }
    setSuccess(true);
    setSubmitting(false);
  };

  const close = () => {
    setDetails('');
    setSuccess(false);
    setError(null);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={close}
      title="File a red flag"
      description={`Reporting: ${internshipTitle}`}
      size="md"
      footer={
        success ? (
          <button onClick={close} className="btn-primary">Done</button>
        ) : (
          <>
            <button onClick={close} className="btn-secondary">Cancel</button>
            <button onClick={submit} disabled={submitting || details.trim().length < 10} className="btn-danger">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit report
            </button>
          </>
        )
      }
    >
      {success ? (
        <div className="text-center py-6">
          <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-700 mx-auto flex items-center justify-center mb-3">
            <Flag size={22} />
          </div>
          <p className="font-semibold text-ink-900">Report submitted</p>
          <p className="text-sm text-ink-500 mt-1">
            The honour score has been adjusted. Our team reviews every report; repeated flags trigger automatic suspension.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="label">What's wrong?</label>
            <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {FLAG_DEFS.map((f) => (
                <button
                  key={f.code}
                  onClick={() => setFlagCode(f.code)}
                  className={classNames(
                    'text-left rounded-xl border px-3 py-2 transition-colors',
                    flagCode === f.code ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-ink-300',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-ink-800">{f.label}</span>
                    <span className={classNames('chip border text-[10px] uppercase', severityColor(f.severity))}>{f.severity}</span>
                  </div>
                  {f.description && <p className="text-xs text-ink-500 mt-0.5">{f.description}</p>}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Describe what happened</label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={4}
              className="input resize-none"
              placeholder="Share specifics: messages, emails, requests for money or documents, deadlines that felt off…"
            />
          </div>
          {preview && (
            <div className="rounded-xl bg-ink-50 border border-ink-200 p-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-ink-600 mb-1">
                <ShieldQuestion size={14} /> AI corroboration
              </div>
              <p className="text-xs text-ink-500">{preview.summary}</p>
            </div>
          )}
          {error && <p className="text-sm text-danger-600">{error}</p>}
          <p className="text-xs text-ink-400">
            Filing a false report lowers your own standing. Be specific and truthful.
          </p>
        </div>
      )}
    </Modal>
  );
}
