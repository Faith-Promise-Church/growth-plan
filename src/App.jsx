import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext.jsx';
import { ToastProvider } from './components/ui/Toast.jsx';
import ErrorBoundary from './components/app/ErrorBoundary.jsx';
import AppShell from './components/app/AppShell.jsx';
import { LoadingBlock, EmptyState, Button } from './components/ui/index.jsx';
import LoginPage from './pages/LoginPage.jsx';
import ResetPasswordPage from './pages/ResetPasswordPage.jsx';
import HomePage from './pages/HomePage.jsx';
import AssessmentIntro from './pages/assessment/AssessmentIntro.jsx';
import AssessmentTake from './pages/assessment/AssessmentTake.jsx';
import ResultsPage from './pages/assessment/ResultsPage.jsx';
import HistoryPage from './pages/assessment/HistoryPage.jsx';
import PlanOverview from './pages/plan/PlanOverview.jsx';
import DimensionPage from './pages/plan/DimensionPage.jsx';
import StartFlow from './pages/plan/StartFlow.jsx';
import CheckInPage from './pages/CheckInPage.jsx';
import EmailPreferencesPage from './pages/EmailPreferencesPage.jsx';
import { currentPlanYear } from './lib/time.js';

const AdminPage = lazy(() => import('./pages/admin/AdminPage.jsx'));
const AdminCheckinsPage = lazy(() => import('./pages/admin/AdminCheckinsPage.jsx'));
const PrintPage = lazy(() => import('./pages/plan/PrintPage.jsx'));

function Loading() {
  return (
    <div className="page">
      <LoadingBlock />
    </div>
  );
}

function RootRedirect() {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loading />;
  return <Navigate to={isAuthenticated ? '/home' : '/login'} replace />;
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading />;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: `${location.pathname}${location.search}` }} />;
  return children;
}

// Works signed in (inside the app shell) or signed out with a token from the email.
function FlexibleRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <Loading />;
  if (isAuthenticated) return <AppShell>{children}</AppShell>;
  return (
    <div className="shell shell--public">
      <header className="shell__header">
        <div className="shell__header-inner">
          <img src="/assets/logos/growth-plan-dark.png" alt="Growth Plan" width="143" height="25" />
        </div>
      </header>
      <main id="main" className="shell__main">
        {children}
      </main>
    </div>
  );
}

function NotFound() {
  return (
    <div className="page">
      <EmptyState title="We could not find that page" action={<Button to="/home">Go home</Button>} />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <ToastProvider>
            <Suspense fallback={<Loading />}>
              <Routes>
                <Route path="/" element={<RootRedirect />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/check-in" element={<FlexibleRoute><CheckInPage /></FlexibleRoute>} />
                <Route path="/email/preferences" element={<FlexibleRoute><EmailPreferencesPage /></FlexibleRoute>} />
                <Route
                  path="/plan/:year/print"
                  element={
                    <ProtectedRoute>
                      <PrintPage />
                    </ProtectedRoute>
                  }
                />
                <Route
                  element={
                    <ProtectedRoute>
                      <AppShell />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/assessment" element={<AssessmentIntro />} />
                  <Route path="/assessment/take/:step" element={<AssessmentTake />} />
                  <Route path="/assessment/results/:id" element={<ResultsPage />} />
                  <Route path="/assessment/history" element={<HistoryPage />} />
                  <Route path="/plan" element={<Navigate to={`/plan/${currentPlanYear()}`} replace />} />
                  <Route path="/plan/:year" element={<PlanOverview />} />
                  <Route path="/plan/:year/start" element={<StartFlow />} />
                  <Route path="/plan/:year/:dimension" element={<DimensionPage />} />
                  <Route path="/admin" element={<AdminPage />} />
                  <Route path="/admin/check-ins" element={<AdminCheckinsPage />} />
                  <Route path="/growth-plan" element={<Navigate to={`/plan/${currentPlanYear()}`} replace />} />
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Suspense>
          </ToastProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
