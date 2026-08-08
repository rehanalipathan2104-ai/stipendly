import { useEffect, useMemo, useState } from 'react';
import { ShieldCheck, Flag, Users, Briefcase, Loader2, Ban, CheckCircle2, XCircle, RefreshCw, AlertTriangle, Trash2, Plus, Pencil } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import type { Internship, Report, Profile, FlagGlossary, HonourEvent } from '@/lib/types';
import HonourScore from '@/components/HonourScore';
import Modal from '@/components/Modal';
import { classNames, severityColor, statusColor, timeAgo } from '@/lib/utils';
import { FLAG_DEFS } from '@/lib/ai';

type Tab = 'overview' | 'reports' | 'internships' | 'providers' | 'glossary';

export default function AdminDashboardPage() {
  const { profile } = useAuth();
  const [tab, setTab] = useState<Tab>('overview');
  const [internships, setInternships] = useState<Internship[]>([]);
  const [reports, setReports] = useState<(Report & { internship?: Internship; reporter?: Profile })[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [glossary, setGlossary] = useState<FlagGlossary[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [editingFlag, setEditingFlag] = useState<FlagGlossary | null>(null);
  const [flagOpen, setFlagOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const [jobs, reps, profs, gloss] = await Promise.all([
      supabase.from('internships').select('*').order('created_at', { ascending: false }),
      supabase.from('reports').select('*, internship:internships(*), reporter:profiles!reports_reporter_id_fkey(*)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('*').order('created_at', { ascending: false }),
      supabase.from('flag_glossary').select('*').order('points', { ascending: false }),
    ]);
    setInternships((jobs.data as Internship[]) ?? []);
    setReports((reps.data as (Report & { internship?: Internship; reporter?: Profile })[]) ?? []);
    setProfiles((profs.data as Profile[]) ?? []);
    setGlossary((gloss.data as FlagGlossary[]) ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const stats = useMemo(() => ({
    totalInternships: internships.length,
    banned: internships.filter((i) => i.status === 'banned').length,
    pendingReports: reports.filter((r) => r.status === 'open').length,
    providers: profiles.filter((p) => p.role === 'provider').length,
    students: profiles.filter((p) => p.role === 'student').length,
    bannedProviders: profiles.filter((p) => p.is_banned).length,
    avgHonour: internships.length ? Math.round(internships.reduce((s, i) => s + i.honour_score, 0) / internships.length) : 0,
  }), [internships, reports, profiles]);

  const setInternshipStatus = async (id: string, status: Internship['status'], reason?: string) => {
    setBusy(id);
    await supabase.from('internships').update({ status, dismiss_reason: reason ?? null }).eq('id', id);
    if (status === 'banned' || status === 'dismissed') {
      await supabase.from('honour_events').insert({
        internship_id: id,
        delta: status === 'banned' ? -30 : -15,
        reason: reason ?? `Admin set status to ${status}`,
        severity: status === 'banned' ? 'critical' : 'high',
        source: 'admin',
      });
    }
    setBusy(null);
    load();
  };

  const setReportStatus = async (id: string, status: Report['status']) => {
    setBusy(id);
    await supabase.from('reports').update({ status }).eq('id', id);
    setBusy(null);
    load();
  };

  const banProvider = async (p: Profile) => {
    setBusy(p.id);
    await supabase.from('profiles').update({ is_banned: !p.is_banned }).eq('id', p.id);
    if (!p.is_banned) {
      await supabase.from('internships').update({ status: 'banned' }).eq('provider_id', p.id).neq('status', 'closed');
    }
    setBusy(null);
    load();
  };

  const saveFlag = async (flag: Partial<FlagGlossary>) => {
    if (!flag.code || !flag.label) return;
    setBusy('flag');
    if (flag.id) {
      await supabase.from('flag_glossary').update({ label: flag.label, severity: flag.severity, points: flag.points, description: flag.description }).eq('id', flag.id);
    } else {
      await supabase.from('flag_glossary').insert({ code: flag.code, label: flag.label, severity: flag.severity, points: flag.points, description: flag.description });
    }
    setBusy(null);
    setFlagOpen(false);
    setEditingFlag(null);
    load();
  };

  const deleteFlag = async (id: string) => {
    await supabase.from('flag_glossary').delete().eq('id', id);
    load();
  };

  if (!profile?.is_admin) {
    return (
      <div className="container-narrow py-16 text-center">
        <ShieldCheck size={36} className="text-ink-300 mx-auto mb-3" />
        <p className="font-semibold text-ink-800">Admin access required</p>
        <p className="text-sm text-ink-500 mt-1">The first account on this project is the admin. Sign in with that account.</p>
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: typeof Flag; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: ShieldCheck },
    { id: 'reports', label: 'Reports', icon: Flag, count: stats.pendingReports },
    { id: 'internships', label: 'Internships', icon: Briefcase, count: stats.totalInternships },
    { id: 'providers', label: 'Users', icon: Users, count: profiles.length },
    { id: 'glossary', label: 'Flag glossary', icon: AlertTriangle, count: glossary.length },
  ];

  return (
    <div className="container-page py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold font-display text-ink-900 flex items-center gap-2"><ShieldCheck size={22} className="text-brand-600" /> Admin dashboard</h1>
          <p className="text-sm text-ink-500 mt-1">Moderate reports, manage honour scores, and configure the flag glossary.</p>
        </div>
        <button onClick={load} className="btn-ghost text-sm"><RefreshCw size={14} /> Refresh</button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-ink-200 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={classNames(
              'px-4 py-2.5 text-sm font-semibold flex items-center gap-2 border-b-2 -mb-px whitespace-nowrap transition-colors',
              tab === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-ink-500 hover:text-ink-800',
            )}
          >
            <t.icon size={15} />
            {t.label}
            {t.count != null && <span className={classNames('chip text-[10px]', tab === t.id ? 'bg-brand-100 text-brand-700' : 'bg-ink-100 text-ink-500')}>{t.count}</span>}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="skeleton h-24 w-full" />)}</div>
      ) : (
        <>
          {tab === 'overview' && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Internships" value={stats.totalInternships} icon={Briefcase} />
                <Stat label="Banned listings" value={stats.banned} icon={Ban} tone="danger" />
                <Stat label="Open reports" value={stats.pendingReports} icon={Flag} tone="accent" />
                <Stat label="Avg honour" value={stats.avgHonour} icon={ShieldCheck} tone="brand" />
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Stat label="Students" value={stats.students} icon={Users} />
                <Stat label="Providers" value={stats.providers} icon={Users} />
                <Stat label="Banned providers" value={stats.bannedProviders} icon={Ban} tone="danger" />
                <Stat label="Flag types" value={glossary.length} icon={AlertTriangle} />
              </div>

              <div className="card p-5">
                <h3 className="font-bold text-ink-900 font-display mb-3">Recent reports</h3>
                {reports.length === 0 ? <p className="text-sm text-ink-400">No reports filed yet.</p> : (
                  <div className="space-y-2">
                    {reports.slice(0, 5).map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-3 py-2 border-b border-ink-100 last:border-0">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-ink-800 truncate">{r.flag_code.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-ink-400">{r.internship?.title} · {timeAgo(r.created_at)}</p>
                        </div>
                        <span className={classNames('chip', statusColor(r.status))}>{r.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {tab === 'reports' && (
            <div className="space-y-3">
              {reports.length === 0 ? <EmptyState icon={Flag} text="No reports filed yet." /> : reports.map((r) => (
                <div key={r.id} className="card p-5">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={classNames('chip border', severityColor((FLAG_DEFS.find((f) => f.code === r.flag_code)?.severity) ?? 'medium'))}>{r.flag_code}</span>
                        <span className={classNames('chip', statusColor(r.status))}>{r.status}</span>
                      </div>
                      <p className="font-semibold text-ink-900">{r.internship?.title ?? 'Listing removed'}</p>
                      <p className="text-xs text-ink-400">by {r.reporter?.full_name ?? 'Unknown'} · {timeAgo(r.created_at)}</p>
                    </div>
                    <HonourScore score={r.internship?.honour_score ?? 100} size="sm" showLabel={false} />
                  </div>
                  <p className="text-sm text-ink-600 mt-2">{r.details}</p>
                  {r.ai_analysis && <p className="text-xs text-ink-400 mt-2 italic bg-ink-50 rounded-lg px-3 py-2">AI: {r.ai_analysis.summary}</p>}
                  <div className="flex gap-2 mt-3 pt-3 border-t border-ink-100">
                    {r.status !== 'resolved' && <button onClick={() => setReportStatus(r.id, 'resolved')} disabled={busy === r.id} className="btn-primary text-xs py-1.5"><CheckCircle2 size={13} /> Resolve</button>}
                    {r.status !== 'dismissed' && <button onClick={() => setReportStatus(r.id, 'dismissed')} disabled={busy === r.id} className="btn-secondary text-xs py-1.5"><XCircle size={13} /> Dismiss</button>}
                    {(() => { const job = r.internship; return job && job.status !== 'banned' ? <button onClick={() => setInternshipStatus(job.id, 'banned', `Banned due to report: ${r.flag_code}`)} disabled={busy === r.id} className="btn-danger text-xs py-1.5 ml-auto"><Ban size={13} /> Ban listing</button> : null; })()}
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'internships' && (
            <div className="space-y-2">
              {internships.length === 0 ? <EmptyState icon={Briefcase} text="No internships posted yet." /> : internships.map((job) => (
                <div key={job.id} className="card p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={classNames('chip', statusColor(job.status))}>{job.status}</span>
                      <span className="text-xs text-ink-400">{timeAgo(job.created_at)}</span>
                    </div>
                    <p className="font-semibold text-ink-900 truncate">{job.title}</p>
                    <p className="text-xs text-ink-400">{job.company_name}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <HonourScore score={job.honour_score} size="sm" showLabel={false} />
                    <div className="flex gap-1">
                      {job.status !== 'dismissed' && <button onClick={() => setInternshipStatus(job.id, 'dismissed', 'Dismissed by admin')} disabled={busy === job.id} className="btn-ghost text-xs p-2" title="Dismiss"><XCircle size={14} /></button>}
                      {job.status !== 'banned' && <button onClick={() => setInternshipStatus(job.id, 'banned', 'Banned by admin')} disabled={busy === job.id} className="btn-ghost text-xs p-2 text-danger-500" title="Ban"><Ban size={14} /></button>}
                      {job.status !== 'active' && <button onClick={() => setInternshipStatus(job.id, 'active')} disabled={busy === job.id} className="btn-ghost text-xs p-2 text-brand-600" title="Activate"><CheckCircle2 size={14} /></button>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tab === 'providers' && (
            <div className="space-y-2">
              {profiles.length === 0 ? <EmptyState icon={Users} text="No users yet." /> : profiles.map((p) => (
                <div key={p.id} className="card p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-10 w-10 rounded-xl bg-ink-100 text-ink-600 flex items-center justify-center font-bold">{(p.full_name || '?')[0]}</div>
                    <div className="min-w-0">
                      <p className="font-semibold text-ink-900 truncate">{p.full_name || 'Unnamed'}</p>
                      <p className="text-xs text-ink-400 truncate">{p.email}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="chip bg-ink-100 text-ink-600 capitalize text-[10px]">{p.role}</span>
                        {p.is_admin && <span className="chip bg-brand-100 text-brand-700 text-[10px]">admin</span>}
                        {p.is_banned && <span className="chip bg-danger-100 text-danger-700 text-[10px]">banned</span>}
                      </div>
                    </div>
                  </div>
                  {p.role !== 'admin' && (
                    <button onClick={() => banProvider(p)} disabled={busy === p.id} className={p.is_banned ? 'btn-secondary text-xs py-1.5' : 'btn-danger text-xs py-1.5'}>
                      {p.is_banned ? <CheckCircle2 size={13} /> : <Ban size={13} />}
                      {p.is_banned ? 'Unban' : 'Ban'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab === 'glossary' && (
            <div className="space-y-3">
              <div className="flex justify-end">
                <button onClick={() => { setEditingFlag(null); setFlagOpen(true); }} className="btn-primary text-sm"><Plus size={14} /> Add flag</button>
              </div>
              {glossary.length === 0 ? <EmptyState icon={AlertTriangle} text="No flags configured." /> : glossary.map((g) => (
                <div key={g.id} className="card p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-ink-500">{g.code}</span>
                      <span className={classNames('chip border', severityColor(g.severity))}>{g.severity}</span>
                      <span className="chip bg-ink-100 text-ink-600">-{g.points} pts</span>
                    </div>
                    <p className="font-semibold text-ink-900">{g.label}</p>
                    {g.description && <p className="text-xs text-ink-500 mt-0.5">{g.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setEditingFlag(g); setFlagOpen(true); }} className="btn-ghost p-2"><Pencil size={14} /></button>
                    <button onClick={() => deleteFlag(g.id)} className="btn-ghost p-2 text-danger-500"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <FlagEditorModal
        open={flagOpen}
        flag={editingFlag}
        busy={busy === 'flag'}
        onClose={() => { setFlagOpen(false); setEditingFlag(null); }}
        onSave={saveFlag}
      />
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone = 'default' }: { label: string; value: number | string; icon: typeof Briefcase; tone?: 'default' | 'brand' | 'accent' | 'danger' }) {
  const toneClass = tone === 'brand' ? 'text-brand-600' : tone === 'accent' ? 'text-accent-600' : tone === 'danger' ? 'text-danger-600' : 'text-ink-300';
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs text-ink-400 font-semibold uppercase tracking-wide">{label}</p>
        <Icon size={15} className={toneClass} />
      </div>
      <p className="text-2xl font-bold font-display text-ink-900">{value}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Flag; text: string }) {
  return (
    <div className="card p-12 text-center">
      <Icon size={32} className="text-ink-300 mx-auto mb-2" />
      <p className="text-sm text-ink-500">{text}</p>
    </div>
  );
}

function FlagEditorModal({ open, flag, busy, onClose, onSave }: { open: boolean; flag: FlagGlossary | null; busy: boolean; onClose: () => void; onSave: (f: Partial<FlagGlossary>) => void }) {
  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [severity, setSeverity] = useState<FlagGlossary['severity']>('medium');
  const [points, setPoints] = useState(10);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (flag) { setCode(flag.code); setLabel(flag.label); setSeverity(flag.severity); setPoints(flag.points); setDescription(flag.description ?? ''); }
    else { setCode(''); setLabel(''); setSeverity('medium'); setPoints(10); setDescription(''); }
  }, [flag, open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={flag ? 'Edit flag' : 'Add flag'}
      footer={
        <>
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={() => onSave({ id: flag?.id, code, label, severity, points, description })} disabled={busy || !code || !label} className="btn-primary">
            {busy ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
            Save flag
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div><label className="label">Code</label><input value={code} onChange={(e) => setCode(e.target.value)} disabled={!!flag} className="input font-mono" placeholder="new_flag" /></div>
          <div><label className="label">Points</label><input type="number" value={points} onChange={(e) => setPoints(Number(e.target.value))} className="input" min={1} /></div>
        </div>
        <div><label className="label">Label</label><input value={label} onChange={(e) => setLabel(e.target.value)} className="input" placeholder="Short human label" /></div>
        <div><label className="label">Severity</label>
          <select value={severity} onChange={(e) => setSeverity(e.target.value as FlagGlossary['severity'])} className="input">
            <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
          </select>
        </div>
        <div><label className="label">Description</label><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="input resize-none" /></div>
      </div>
    </Modal>
  );
}
