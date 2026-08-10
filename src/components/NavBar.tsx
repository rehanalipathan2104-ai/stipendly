import { useState } from 'react';
import { LayoutDashboard, Briefcase, FileText, ShieldCheck, LogOut, Menu, X, Plus, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useRouter, type Route } from '@/lib/router';
import Logo from './Logo';
import { classNames } from '@/lib/utils';

export default function NavBar() {
  const { profile, signOut } = useAuth();
  const { route, navigate } = useRouter();
  const [open, setOpen] = useState(false);

  const go = (r: Route) => {
    navigate(r);
    setOpen(false);
  };

  const links: { label: string; icon: typeof Search; route: Route; show: boolean }[] = [
    { label: 'Browse', icon: Search, route: { name: 'browse' }, show: !!profile },
    { label: 'Post internship', icon: Plus, route: { name: 'post' }, show: profile?.role === 'provider' || profile?.role === 'admin' || false },
    { label: 'My listings', icon: Briefcase, route: { name: 'provider' }, show: profile?.role === 'provider' || false },
    { label: 'Dashboard', icon: LayoutDashboard, route: { name: 'student' }, show: profile?.role === 'student' || false },
    { label: 'Resume builder', icon: FileText, route: { name: 'resume' }, show: profile?.role === 'student' || profile?.role === 'admin' || false },
    { label: 'Admin', icon: ShieldCheck, route: { name: 'admin' }, show: profile?.is_admin || false },
  ];

  const isActive = (r: Route): boolean => r.name === route.name;

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-ink-200/70">
      <div className="container-page h-16 flex items-center justify-between">
        <button onClick={() => go(profile ? { name: 'browse' } : { name: 'landing' })} className="shrink-0">
          <Logo />
        </button>

        {profile ? (
          <>
            <nav className="hidden md:flex items-center gap-1">
              {links.filter((l) => l.show).map((l) => (
                <button
                  key={l.label}
                  onClick={() => go(l.route)}
                  className={classNames(
                    'px-3 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-1.5',
                    isActive(l.route) ? 'text-brand-700 bg-brand-50' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100',
                  )}
                >
                  <l.icon size={16} />
                  {l.label}
                </button>
              ))}
            </nav>
            <div className="hidden md:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-ink-800 leading-tight">{profile.full_name || 'User'}</p>
                <p className="text-xs text-ink-400 capitalize">{profile.role}{profile.is_banned && ' · banned'}</p>
              </div>
              <button onClick={() => signOut()} className="btn-ghost p-2" aria-label="Sign out">
                <LogOut size={18} />
              </button>
            </div>
            <button onClick={() => setOpen((o) => !o)} className="md:hidden p-2 text-ink-700" aria-label="Menu">
              {open ? <X size={22} /> : <Menu size={22} />}
            </button>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button onClick={() => go({ name: 'auth', mode: 'signin' })} className="btn-ghost hidden sm:inline-flex">Sign in</button>
            <button onClick={() => go({ name: 'auth', mode: 'signup' })} className="btn-primary">Get started</button>
          </div>
        )}
      </div>

      {open && profile && (
        <div className="md:hidden border-t border-ink-200 bg-white animate-fade-in">
          <div className="container-page py-3 space-y-1">
            {links.filter((l) => l.show).map((l) => (
              <button
                key={l.label}
                onClick={() => go(l.route)}
                className={classNames(
                  'w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2',
                  isActive(l.route) ? 'text-brand-700 bg-brand-50' : 'text-ink-700 hover:bg-ink-100',
                )}
              >
                <l.icon size={18} />
                {l.label}
              </button>
            ))}
            <button onClick={() => signOut()} className="w-full text-left px-3 py-2.5 rounded-lg text-sm font-semibold text-ink-700 hover:bg-ink-100 flex items-center gap-2">
              <LogOut size={18} />
              Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
