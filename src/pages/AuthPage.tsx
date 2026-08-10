import { useState } from 'react';
import { Loader2, GraduationCap, Building2, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter } from '@/lib/router';
import Logo from '@/components/Logo';
import { classNames } from '@/lib/utils';

export default function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const { navigate } = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'student' | 'provider'>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === 'signup';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = isSignup
      ? await signUp(email, password, fullName || email.split('@')[0], role)
      : await signIn(email, password);
    setLoading(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    navigate({ name: 'browse' });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between bg-ink-900 text-white p-12 relative overflow-hidden">
        <div className="absolute inset-0 -z-0">
          <div className="absolute top-20 -left-10 h-72 w-72 rounded-full bg-brand-500/20 blur-3xl" />
          <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-accent-500/15 blur-3xl" />
        </div>
        <div className="relative z-10">
          <button onClick={() => navigate({ name: 'landing' })}>
            <Logo size="lg" />
          </button>
        </div>
        <div className="relative z-10">
          <h2 className="text-3xl font-bold font-display leading-tight max-w-sm">
            {isSignup ? 'Join a marketplace that puts student safety first.' : 'Welcome back to a safer way to intern.'}
          </h2>
          <ul className="mt-8 space-y-4">
            {[
              { icon: ShieldCheck, text: 'Every provider scored on a live honour scale' },
              { icon: GraduationCap, text: 'AI resume builder tailored to each role' },
              { icon: Building2, text: 'Domain-verified companies only get the badge' },
            ].map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-ink-200">
                <span className="h-9 w-9 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
                  <f.icon size={18} />
                </span>
                {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative z-10 text-xs text-ink-400">Stipendly · Internships you can trust.</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8">
            <button onClick={() => navigate({ name: 'landing' })}>
              <Logo size="md" />
            </button>
          </div>
          <h1 className="text-2xl font-bold font-display text-ink-900">
            {isSignup ? 'Create your account' : 'Sign in to Stipendly'}
          </h1>
          <p className="text-sm text-ink-500 mt-1.5">
            {isSignup ? 'Start browsing vetted internships in minutes.' : 'Welcome back. Pick up where you left off.'}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            {isSignup && (
              <>
                <div>
                  <label className="label">Full name</label>
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} className="input" placeholder="Aarav Sharma" required />
                </div>
                <div>
                  <label className="label">I am a…</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(['student', 'provider'] as const).map((r) => (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setRole(r)}
                        className={classNames(
                          'rounded-xl border px-3 py-2.5 text-sm font-semibold transition-colors flex items-center justify-center gap-2 capitalize',
                          role === r ? 'border-brand-400 bg-brand-50 text-brand-700' : 'border-ink-200 text-ink-600 hover:border-ink-300',
                        )}
                      >
                        {r === 'student' ? <GraduationCap size={16} /> : <Building2 size={16} />}
                        {r}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="label">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" placeholder="you@example.com" required />
            </div>
            <div>
              <label className="label">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" placeholder="••••••••" required minLength={6} />
            </div>
            {error && <p className="text-sm text-danger-600 bg-danger-50 rounded-lg px-3 py-2">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary w-full py-3">
              {loading && <Loader2 size={18} className="animate-spin" />}
              {isSignup ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="text-sm text-ink-500 text-center mt-5">
            {isSignup ? 'Already have an account? ' : "Don't have one yet? "}
            <button
              onClick={() => navigate({ name: 'auth', mode: isSignup ? 'signin' : 'signup' })}
              className="font-semibold text-brand-600 hover:text-brand-700"
            >
              {isSignup ? 'Sign in' : 'Sign up'}
            </button>
          </p>
          {isSignup && (
            <p className="text-xs text-ink-400 text-center mt-3">
              The first account created on this project becomes the admin automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
