import { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Clock, Users, Wallet, ShieldCheck, ShieldAlert, Flag, Send, Loader2, Building2, Mail, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import type { Internship, HonourEvent, Report, Application, Profile } from '@/lib/types';
import HonourScore from '@/components/HonourScore';
import ReportModal from '@/components/ReportModal';
import Modal from '@/components/Modal';
import CollapsibleSection from '@/components/CollapsibleSection';
import { classNames, formatDate, rupee, severityColor, statusColor, timeAgo } from '@/lib/utils';

export default function InternshipDetailPage({ id }: { id: string }) {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [internship, setInternship] = useState<Internship | null>(null);
  const [provider, setProvider] = useState<Profile | null>(null);
  const [events, setEvents] = useState<HonourEvent[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [existingApp, setExistingApp] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [reportOpen, setReportOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [cover, setCover] = useState('');
  const [resume, setResume] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data: job } = await supabase.from('internships').select('*').eq('id', id).maybeSingle();
      if (!job) {
        setLoading(false);
        return;
      }
      setInternship(job as Internship);
      const jobRow = job as Internship;
      const [prov, evs, reps] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', jobRow.provider_id).maybeSingle(),
        supabase.from('honour_events').select('*').eq('internship_id', id).order('created_at', { ascending: false }),
        supabase.from('reports').select('*').eq('internship_id', id).order('created_at', { ascending: false }),
      ]);
      setProvider(prov.data as Profile | null);
      setEvents((evs.data as HonourEvent[]) ?? []);
      setReports((reps.data as Report[]) ?? []);
      if (profile?.role === 'student') {
        const { data: app } = await supabase.from('applications').select('*').eq('internship_id', id).eq('student_id', profile.id).maybeSingle();
        setExistingApp(app as Application | null);
      }
      setLoading(false);
    };
    load();
  }, [id, profile?.id]);

  const submitApplication = async () => {
    if (!profile || !internship) return;
    setSubmitting(true);
    setApplyError(null);
    const { data, error } = await supabase
      .from('applications')
      .insert({
        internship_id: internship.id,
        student_id: profile.id,
        cover_letter: cover.trim(),
        resume_text: resume.trim(),
      })
      .select()
      .single();
    if (error) {
      setApplyError(error.message);
      setSubmitting(false);
      return;
    }
    setExistingApp(data as Application);
    setApplySuccess(true);
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="container-page py-10">
        <div className="skeleton h-8 w-1/3 mb-6" />
        <div className="grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4"><div className="skeleton h-40 w-full" /><div className="skeleton h-24 w-full" /></div>
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!internship) {
    return (
      <div className="container-page py-20 text-center">
        <AlertTriangle size={36} className="text-ink-300 mx-auto mb-3" />
        <p className="font-semibold text-ink-800">This internship could not be found.</p>
        <button onClick={() => navigate({ name: 'browse' })} className="btn-secondary mt-4">Back to browse</button>
      </div>
    );
  }

  const isOwner = profile?.id === internship.provider_id;
  const isStudent = profile?.role === 'student';
  const risky = internship.honour_score < 60;

  return (
    <div className="container-page py-8 max-w-5xl">
      <button onClick={() => navigate({ name: 'browse' })} className="btn-ghost pl-0 mb-4 text-sm">
        <ArrowLeft size={16} /> Back
      </button>

      {risky && (
        <div className="rounded-xl bg-danger-50 border border-danger-200 p-4 mb-5 flex gap-3">
          <ShieldAlert size={20} className="text-danger-600 shrink-0" />
          <div>
            <p className="font-semibold text-danger-800">This listing carries elevated risk</p>
            <p className="text-sm text-danger-700 mt-0.5">
              Its honour score is {internship.honour_score}. Review the red flags below before applying. If anything looks off, file a report.
            </p>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[1fr_300px] gap-6">
        {/* Main */}
        <div className="space-y-5">
          <div className="card p-6">
            <div className="flex items-start justify-between gap-4 mb-3">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={classNames('chip', statusColor(internship.status))}>{internship.status}</span>
                  {internship.domain_verified && (
                    <span className="chip bg-brand-100 text-brand-700"><ShieldCheck size={11} /> Domain verified</span>
                  )}
                </div>
                <h1 className="text-2xl font-bold font-display text-ink-900">{internship.title}</h1>
                <p className="text-ink-500 mt-1">{internship.company_name}</p>
              </div>
              <HonourScore score={internship.honour_score} size="md" showLabel />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 text-sm">
              <InfoTile icon={MapPin} label="Location" value={internship.is_remote ? 'Remote' : internship.location || '—'} />
              <InfoTile icon={Clock} label="Duration" value={internship.duration_weeks ? `${internship.duration_weeks} weeks` : '—'} />
              <InfoTile icon={Users} label="Applicants" value={`${internship.application_count}`} />
              <InfoTile icon={Wallet} label="Stipend" value={internship.stipend_min || internship.stipend_max ? `${rupee(internship.stipend_min)}${internship.stipend_min && internship.stipend_max ? '–' : ''}${rupee(internship.stipend_max)}` : '—'} />
            </div>

            <div className="flex flex-wrap gap-1.5 mt-4">
              {internship.skills.map((s) => <span key={s} className="chip bg-ink-100 text-ink-600">{s}</span>)}
            </div>
          </div>

          {internship.dismiss_reason && (
            <div className="card p-5 border-danger-200 bg-danger-50/40">
              <h3 className="font-semibold text-danger-800 flex items-center gap-2"><AlertTriangle size={16} /> Why this was dismissed</h3>
              <p className="text-sm text-danger-700 mt-2 leading-relaxed">{internship.dismiss_reason}</p>
            </div>
          )}

          <div className="card p-6">
            <h3 className="font-bold text-ink-900 font-display mb-2">About the role</h3>
            <p className="text-sm text-ink-600 whitespace-pre-wrap leading-relaxed">{internship.description}</p>
          </div>

          <div className="card p-6">
            <h3 className="font-bold text-ink-900 font-display mb-2">Requirements</h3>
            <p className="text-sm text-ink-600 whitespace-pre-wrap leading-relaxed">{internship.requirements || 'No specific requirements listed.'}</p>
          </div>

          {/* Honour ledger */}
          <CollapsibleSection title="Honour score history" icon={<ShieldCheck size={16} className="text-brand-600" />} defaultOpen={false}>
            {events.length === 0 ? (
              <p className="text-sm text-ink-400">No honour events recorded yet. This listing has a clean record.</p>
            ) : (
              <div className="space-y-2">
                {events.map((e) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-2 border-b border-ink-100 last:border-0">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink-800">{e.reason}</p>
                      <p className="text-xs text-ink-400">{timeAgo(e.created_at)} · {e.source}</p>
                    </div>
                    <span className={classNames('chip border', severityColor(e.severity), e.delta < 0 ? 'text-danger-600' : 'text-brand-600')}>
                      {e.delta > 0 ? '+' : ''}{e.delta}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleSection>

          {/* Reports (visible to provider owner + admin) */}
          {(isOwner || profile?.is_admin) && reports.length > 0 && (
            <CollapsibleSection title={`Red-flag reports (${reports.length})`} icon={<Flag size={16} className="text-danger-600" />} defaultOpen={false}>
              <div className="space-y-2">
                {reports.map((r) => (
                  <div key={r.id} className="rounded-xl border border-ink-200 p-3">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-sm font-semibold text-ink-800">{r.flag_code.replace(/_/g, ' ')}</span>
                      <span className={classNames('chip', statusColor(r.status))}>{r.status}</span>
                    </div>
                    <p className="text-xs text-ink-500">{r.details}</p>
                    {r.ai_analysis && <p className="text-xs text-ink-400 mt-1.5 italic">AI: {r.ai_analysis.summary}</p>}
                  </div>
                ))}
              </div>
            </CollapsibleSection>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4">
          <div className="card p-5">
            <p className="text-xs uppercase tracking-wide text-ink-400 font-semibold mb-2">Posted by</p>
            <div className="flex items-center gap-3">
              <div className="h-11 w-11 rounded-xl bg-ink-100 text-ink-600 flex items-center justify-center font-bold">
                <Building2 size={20} />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-ink-900 truncate">{provider?.company_name || internship.company_name}</p>
                <p className="text-xs text-ink-500 truncate flex items-center gap-1"><Mail size={11} /> {provider?.email}</p>
              </div>
            </div>
            {provider?.is_banned && (
              <p className="mt-3 text-xs font-semibold text-danger-600 bg-danger-50 rounded-lg px-2 py-1.5">This provider is banned</p>
            )}
            <p className="text-xs text-ink-400 mt-3">Posted {formatDate(internship.created_at)}</p>
          </div>

          {isStudent && (
            <div className="card p-5 space-y-3">
              {existingApp ? (
                <>
                  <p className="text-sm font-semibold text-ink-800">You've applied</p>
                  <span className={classNames('chip', statusColor(existingApp.status))}>{existingApp.status}</span>
                  <p className="text-xs text-ink-400">Applied {timeAgo(existingApp.created_at)}. You can track this from your dashboard.</p>
                </>
              ) : internship.status === 'active' && !provider?.is_banned ? (
                <>
                  <button onClick={() => setApplyOpen(true)} className="btn-primary w-full">
                    <Send size={16} /> Apply now
                  </button>
                  {risky ? (
                    <button onClick={() => setReportOpen(true)} className="btn-secondary w-full text-danger-600 border-danger-200 hover:bg-danger-50">
                      <Flag size={16} /> File a red flag
                    </button>
                  ) : (
                    <button onClick={() => setReportOpen(true)} className="btn-ghost w-full text-sm">
                      <Flag size={14} /> Report this listing
                    </button>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-500">This listing is not accepting applications.</p>
              )}
            </div>
          )}

          {!isStudent && !isOwner && (
            <div className="card p-5">
              <p className="text-sm text-ink-500">Sign in as a student to apply to this internship.</p>
            </div>
          )}

          {internship.risk_assessment && (
            <div className="card p-5">
              <p className="text-xs uppercase tracking-wide text-ink-400 font-semibold mb-2">AI risk assessment</p>
              <p className="text-sm text-ink-600">{internship.risk_assessment.summary}</p>
            </div>
          )}
        </aside>
      </div>

      <ReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        internshipId={internship.id}
        internshipTitle={internship.title}
      />

      <Modal
        open={applyOpen}
        onClose={() => { setApplyOpen(false); setApplySuccess(false); setApplyError(null); }}
        title={applySuccess ? 'Application sent' : 'Apply to this internship'}
        description={applySuccess ? undefined : internship.title}
        footer={applySuccess ? (
          <button onClick={() => { setApplyOpen(false); setApplySuccess(false); }} className="btn-primary">Done</button>
        ) : (
          <>
            <button onClick={() => setApplyOpen(false)} className="btn-secondary">Cancel</button>
            <button onClick={submitApplication} disabled={submitting || resume.trim().length < 20} className="btn-primary">
              {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              Submit application
            </button>
          </>
        )}
      >
        {applySuccess ? (
          <div className="text-center py-6">
            <div className="h-12 w-12 rounded-full bg-brand-100 text-brand-700 mx-auto flex items-center justify-center mb-3">
              <CheckCircle2 size={24} />
            </div>
            <p className="font-semibold text-ink-900">Your application is on its way</p>
            <p className="text-sm text-ink-500 mt-1">Track its status from your dashboard.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="label">Cover note (optional)</label>
              <textarea value={cover} onChange={(e) => setCover(e.target.value)} rows={3} className="input resize-none" placeholder="Why are you a great fit?" />
            </div>
            <div>
              <label className="label">Paste your resume</label>
              <textarea value={resume} onChange={(e) => setResume(e.target.value)} rows={6} className="input resize-none font-mono text-xs" placeholder="Paste your resume text. Tip: use the Resume Builder, then paste here." />
              <p className="text-xs text-ink-400 mt-1">Need a resume? Use the AI Resume Builder in the menu.</p>
            </div>
            {applyError && <p className="text-sm text-danger-600">{applyError}</p>}
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-ink-50 p-3">
      <p className="text-xs text-ink-400 flex items-center gap-1 mb-0.5"><Icon size={12} /> {label}</p>
      <p className="text-sm font-semibold text-ink-800 truncate">{value}</p>
    </div>
  );
}
