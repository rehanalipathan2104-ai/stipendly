import { ShieldCheck, Sparkles, Search, ArrowRight, FileText, AlertTriangle, BadgeCheck, Lock, Scale, Download } from 'lucide-react';
import { useRouter } from '@/lib/router';
import { useAuth } from '@/lib/auth';
import Logo from '@/components/Logo';

export default function LandingPage() {
  const { navigate } = useRouter();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 right-0 h-96 w-96 rounded-full bg-brand-200/30 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-96 w-96 rounded-full bg-accent-200/20 blur-3xl" />
        </div>
        <div className="container-page pt-20 pb-24 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-brand-50 border border-brand-200 px-4 py-1.5 text-xs font-semibold text-brand-700 mb-6 animate-fade-in">
            <ShieldCheck size={14} /> AI-powered fake-internship detection
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold font-display text-ink-900 max-w-4xl mx-auto leading-[1.05]">
            Internships you can <span className="text-brand-600">actually trust.</span>
          </h1>
          <p className="mt-5 text-lg text-ink-500 max-w-2xl mx-auto leading-relaxed">
            Stipendly scores every provider on an honour scale, flags fake internships before students lose out, and uses AI to sharpen your resume and job posts.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <button onClick={() => navigate(profile ? { name: 'browse' } : { name: 'auth', mode: 'signup' })} className="btn-primary px-6 py-3 text-base">
              {profile ? 'Browse internships' : 'Start free'}
              <ArrowRight size={18} />
            </button>
            <button onClick={() => navigate({ name: 'auth', mode: 'signin' })} className="btn-secondary px-6 py-3 text-base">
              Sign in
            </button>
            <a
              href="/stipendly-source.zip"
              download="stipendly-source.zip"
              className="btn-secondary px-6 py-3 text-base inline-flex items-center gap-2"
            >
              <Download size={18} /> Download source code
            </a>
          </div>
          <div className="mt-10 flex items-center justify-center gap-6 text-xs text-ink-400">
            <span className="flex items-center gap-1.5"><Lock size={13} /> Email & domain verified</span>
            <span className="flex items-center gap-1.5"><Scale size={13} /> Honour-score tracked</span>
            <span className="flex items-center gap-1.5"><Sparkles size={13} /> AI-assisted</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container-page py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-3xl font-bold font-display text-ink-900">Built to keep students safe</h2>
          <p className="mt-3 text-ink-500">Every feature exists to surface honest opportunities and shut down the fake ones — fast.</p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div key={f.title} className="card p-6 card-hover">
              <div className={`h-11 w-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                <f.icon size={20} className={f.fg} />
              </div>
              <h3 className="font-bold text-ink-900 font-display">{f.title}</h3>
              <p className="text-sm text-ink-500 mt-1.5 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Honour score explainer */}
      <section className="bg-ink-900 text-white py-20">
        <div className="container-page grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="chip bg-brand-500/20 text-brand-300 border border-brand-500/30 mb-4">The honour score</span>
            <h2 className="text-3xl sm:text-4xl font-bold font-display leading-tight">
              A single number that tells you if a provider is legit.
            </h2>
            <p className="mt-4 text-ink-300 leading-relaxed">
              Every listing starts at 100. Each verified red flag — a student report, an AI risk signal, an unverified domain —
              chips away at the score. Drop below 40 and the provider is automatically banned. No manual review needed.
            </p>
            <ul className="mt-6 space-y-3">
              {honourSteps.map((s, i) => (
                <li key={s} className="flex items-center gap-3">
                  <span className="h-7 w-7 rounded-full bg-brand-500 text-white text-sm font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-ink-200">{s}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-ink-800 rounded-2xl p-8 border border-ink-700">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-sm text-ink-400">Sample listing</p>
                <p className="font-bold text-lg">Frontend Intern · Acme Labs</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold font-display text-brand-400">72</p>
                <p className="text-xs text-ink-400 uppercase tracking-wide">Honour</p>
              </div>
            </div>
            <div className="space-y-3">
              {sampleEvents.map((e) => (
                <div key={e.label} className="flex items-center justify-between bg-ink-950/50 rounded-xl p-3 border border-ink-700">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle size={15} className="text-accent-400" />
                    <span className="text-sm text-ink-200">{e.label}</span>
                  </div>
                  <span className="text-sm font-semibold text-danger-400">{e.delta}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-ink-400">
              <BadgeCheck size={14} className="text-brand-400" />
              Auto-ban triggers at 40 — protecting students automatically.
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="container-page py-20 text-center">
        <Logo size="lg" />
        <h2 className="mt-6 text-3xl sm:text-4xl font-bold font-display text-ink-900">Find an internship worth your time.</h2>
        <p className="mt-3 text-ink-500 max-w-xl mx-auto">Join students and vetted providers on a platform that puts safety first.</p>
        <button onClick={() => navigate({ name: 'auth', mode: 'signup' })} className="btn-primary mt-6 px-6 py-3 text-base">
          Create your account
          <ArrowRight size={18} />
        </button>
      </section>

      <footer className="border-t border-ink-200 py-8">
        <div className="container-page flex items-center justify-between text-sm text-ink-400">
          <Logo size="sm" />
          <p>Stipendly — internships you can trust.</p>
        </div>
      </footer>
    </div>
  );
}

const features = [
  { title: 'Honour score & auto-ban', desc: 'Every provider starts at 100. Red flags decay the score; below 40 the account is suspended automatically.', icon: Scale, bg: 'bg-brand-100', fg: 'text-brand-700' },
  { title: 'AI fake-provider detection', desc: 'The engine scans listings for upfront-fee requests, PII harvesting, unrealistic pay, and scam language.', icon: ShieldCheck, bg: 'bg-danger-100', fg: 'text-danger-700' },
  { title: 'AI resume & JD builder', desc: 'Students generate tailored, polished resumes; providers get a clear, trustworthy job description in one click.', icon: Sparkles, bg: 'bg-accent-100', fg: 'text-accent-700' },
  { title: 'Email & domain validation', desc: 'Providers verify a company email and their domain — unverified listings are visibly flagged.', icon: Lock, bg: 'bg-ink-100', fg: 'text-ink-700' },
  { title: 'Red-flag reporting', desc: 'Students file structured reports; AI corroborates the claim and the honour score updates instantly.', icon: AlertTriangle, bg: 'bg-orange-100', fg: 'text-orange-700' },
  { title: 'Admin dashboard', desc: 'A control center to review reports, adjust honour scores, ban providers, and manage the flag glossary.', icon: FileText, bg: 'bg-brand-100', fg: 'text-brand-700' },
];

const honourSteps = [
  'Listing opens with a 100 honour score.',
  'AI reviews the post and flags suspicious signals.',
  'Student reports deduct points based on severity.',
  'Score below 40 auto-bans the provider.',
];

const sampleEvents = [
  { label: 'Upfront fee mentioned', delta: '-40' },
  { label: 'Generic email used', delta: '-8' },
  { label: 'No mentorship described', delta: '-5' },
  { label: 'Domain not verified', delta: '-12' },
];
