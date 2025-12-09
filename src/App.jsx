import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './utils/AuthContext';
import { useEffect, useState } from 'react';
import ErrorBoundary from './components/shared/ErrorBoundary';
import SplashScreen from './pages/SplashScreen';
import LoginPage from './pages/LoginPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import HomePage from './pages/HomePage';
import AssessmentPage from './pages/AssessmentPage';
import GrowthPlanPage from './pages/GrowthPlanPage';
import AdminDashboard from './pages/AdminDashboard';
import './styles/global.css';

// Protected Route wrapper
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const [timedOut, setTimedOut] = useState(false);
  
  // Add timeout to prevent infinite loading
  useEffect(() => {
    if (loading) {
      const timeout = setTimeout(() => {
        setTimedOut(true);
      }, 5000); // 5 second timeout
      return () => clearTimeout(timeout);
    }
  }, [loading]);
  
  if (loading && !timedOut) {
    return (
      <div className="page gradient-home" style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center',
        minHeight: '100vh',
        gap: '16px'
      }}>
        <div className="loading-spinner" style={{
          width: '40px',
          height: '40px',
          border: '3px solid rgba(255, 255, 255, 0.3)',
          borderTop: '3px solid white',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: 'var(--light-neutral)' }}>Loading...</p>
      </div>
    );
  }
  
  // If timed out or not authenticated, redirect to login
  if (timedOut || !isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<SplashScreen />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/assessment" 
        element={
          <ProtectedRoute>
            <AssessmentPage />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/growth-plan" 
        element={
          <ProtectedRoute>
            <GrowthPlanPage />
          </ProtectedRoute>
        } 
      />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
