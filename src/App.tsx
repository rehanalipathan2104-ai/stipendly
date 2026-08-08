import { useEffect } from 'react';
import { AuthProvider, useAuth } from '@/lib/auth';
import { RouterProvider, useRouter, type Route } from '@/lib/router';
import NavBar from '@/components/NavBar';
import LandingPage from '@/pages/LandingPage';
import AuthPage from '@/pages/AuthPage';
import BrowsePage from '@/pages/BrowsePage';
import InternshipDetailPage from '@/pages/InternshipDetailPage';
import PostInternshipPage from '@/pages/PostInternshipPage';
import ProviderDashboardPage from '@/pages/ProviderDashboardPage';
import StudentDashboardPage from '@/pages/StudentDashboardPage';
import ResumeBuilderPage from '@/pages/ResumeBuilderPage';
import AdminDashboardPage from '@/pages/AdminDashboardPage';
import { Loader2 } from 'lucide-react';

function PageGate() {
  const { route, navigate } = useRouter();
  const { profile, session, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const needsAuth = route.name !== 'landing' && route.name !== 'auth';
    if (needsAuth && !profile && !session) {
      navigate({ name: 'auth', mode: 'signin' });
    }
  }, [loading, profile, session, route, navigate]);

  if (loading || (session && !profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-brand-600" />
      </div>
    );
  }

  return <>{renderRoute(route, profile)}</>;
}

function renderRoute(route: Route, profile: ReturnType<typeof useAuth>['profile']) {
  switch (route.name) {
    case 'landing':
      return <LandingPage />;
    case 'auth':
      return <AuthPage mode={route.mode} />;
    case 'browse':
      return <BrowsePage />;
    case 'internship':
      return <InternshipDetailPage id={route.id} />;
    case 'post':
      return <PostInternshipPage />;
    case 'provider':
      return <ProviderDashboardPage />;
    case 'student':
      return <StudentDashboardPage />;
    case 'resume':
      return <ResumeBuilderPage />;
    case 'admin':
      return <AdminDashboardPage />;
  }
}

function Shell() {
  const { route } = useRouter();
  const { profile, loading } = useAuth();
  const isLanding = route.name === 'landing';
  const isAuth = route.name === 'auth';
  const showNav = !isLanding && !isAuth && !loading;

  return (
    <div className="min-h-screen flex flex-col">
      {showNav && <NavBar />}
      <main className="flex-1">
        <PageGate />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RouterProvider>
        <Shell />
      </RouterProvider>
    </AuthProvider>
  );
}
