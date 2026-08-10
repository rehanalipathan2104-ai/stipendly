import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type Route =
  | { name: 'landing' }
  | { name: 'auth'; mode: 'signin' | 'signup' }
  | { name: 'browse' }
  | { name: 'internship'; id: string }
  | { name: 'post' }
  | { name: 'provider' }
  | { name: 'student' }
  | { name: 'resume' }
  | { name: 'admin' };

interface RouterState {
  route: Route;
  navigate: (r: Route) => void;
}

const RouterContext = createContext<RouterState | undefined>(undefined);

function parseHash(): Route {
  const hash = window.location.hash.replace(/^#\/?/, '');
  const [path, ...rest] = hash.split('/');
  switch (path) {
    case '':
    case 'home':
      return { name: 'landing' };
    case 'auth':
      return { name: 'auth', mode: rest[0] === 'signup' ? 'signup' : 'signin' };
    case 'browse':
      return { name: 'browse' };
    case 'internship':
      return { name: 'internship', id: rest[0] ?? '' };
    case 'post':
      return { name: 'post' };
    case 'provider':
      return { name: 'provider' };
    case 'student':
      return { name: 'student' };
    case 'resume':
      return { name: 'resume' };
    case 'admin':
      return { name: 'admin' };
    default:
      return { name: 'landing' };
  }
}

function routeToHash(r: Route): string {
  switch (r.name) {
    case 'landing':
      return '#/';
    case 'auth':
      return `#/auth/${r.mode}`;
    case 'browse':
      return '#/browse';
    case 'internship':
      return `#/internship/${r.id}`;
    case 'post':
      return '#/post';
    case 'provider':
      return '#/provider';
    case 'student':
      return '#/student';
    case 'resume':
      return '#/resume';
    case 'admin':
      return '#/admin';
  }
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (r: Route) => {
    const h = routeToHash(r);
    if (window.location.hash !== h) {
      window.location.hash = h;
    } else {
      setRoute(r);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return <RouterContext.Provider value={{ route, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter(): RouterState {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used inside RouterProvider');
  return ctx;
}
