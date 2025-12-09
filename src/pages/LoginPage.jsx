import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../utils/AuthContext';
import { isSupabaseConfigured, supabase } from '../utils/supabaseClient';
import Logo from '../components/shared/Logo';
import Button from '../components/shared/Button';
import LoginForm from '../components/auth/LoginForm';
import SignupForm from '../components/auth/SignupForm';
import PasswordRecovery from '../components/auth/PasswordRecovery';
import './LoginPage.css';

export default function LoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [view, setView] = useState('choice'); // 'choice' | 'login' | 'signup' | 'recovery'

  // Debug: Log auth state
  useEffect(() => {
    console.log('LoginPage - Auth state:', { isAuthenticated, loading });
  }, [isAuthenticated, loading]);

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && isAuthenticated) {
      console.log('LoginPage - User is authenticated, redirecting to home');
      navigate('/home', { replace: true });
    }
  }, [isAuthenticated, loading, navigate]);

  // Manual session clear function for debugging
  const handleClearSession = async () => {
    console.log('Manually clearing session...');
    await supabase.auth.signOut({ scope: 'local' });
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') || key.includes('supabase')) {
        localStorage.removeItem(key);
      }
    });
    window.location.reload();
  };

  const handleSignupSuccess = () => {
    navigate('/home', { replace: true });
  };

  const renderContent = () => {
    switch (view) {
      case 'login':
        return (
          <LoginForm 
            onSwitchToSignup={() => setView('signup')}
            onForgotPassword={() => setView('recovery')}
          />
        );
      case 'signup':
        return (
          <SignupForm 
            onSwitchToLogin={() => setView('login')}
            onSuccess={handleSignupSuccess}
          />
        );
      case 'recovery':
        return (
          <PasswordRecovery 
            onBack={() => setView('login')}
          />
        );
      default:
        return (
          <motion.div 
            className="login-choice"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <Button 
              variant="primary"
              fullWidth
              onClick={() => setView('signup')}
            >
              New User
            </Button>
            <Button 
              variant="outlined"
              fullWidth
              onClick={() => setView('login')}
            >
              Existing User Login
            </Button>
          </motion.div>
        );
    }
  };

  if (loading) {
    return (
      <div className="login-page">
        <div className="login-page__loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="login-page">
      {/* Configuration Warning Banner */}
      {!isSupabaseConfigured && (
        <div className="login-page__config-warning">
          <strong>⚠️ Database Not Configured</strong>
          <p>Please update your .env.local file with valid Supabase credentials.</p>
          <p style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>
            Check the browser console for detailed instructions.
          </p>
        </div>
      )}

      <motion.div 
        className="login-page__container"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="login-page__header">
          <Logo 
            type="app"
            appLogo="growth-plan-builder-dark"
            className="login-page__logo"
          />
        </div>

        <AnimatePresence mode="wait">
          <div key={view} className="login-page__content">
            {renderContent()}
          </div>
        </AnimatePresence>

        {view !== 'choice' && view !== 'recovery' && (
          <button 
            className="login-page__back"
            onClick={() => setView('choice')}
          >
            ← Back
          </button>
        )}

        <p className="login-page__disclaimer">
          This login process is independent of your Faith Promise App login.
        </p>
      </motion.div>
    </div>
  );
}
