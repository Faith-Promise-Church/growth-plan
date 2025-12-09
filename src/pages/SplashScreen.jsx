import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../utils/AuthContext';
import Logo from '../components/shared/Logo';
import './SplashScreen.css';

export default function SplashScreen() {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [showLogo, setShowLogo] = useState(false);
  const [hasNavigated, setHasNavigated] = useState(false);

  // Helper function to handle navigation
  const handleNavigation = () => {
    if (hasNavigated) return;
    setHasNavigated(true);
    
    if (isAuthenticated) {
      navigate('/home', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  };

  useEffect(() => {
    // Show logo with fade in
    const showTimer = setTimeout(() => {
      setShowLogo(true);
    }, 100);

    return () => clearTimeout(showTimer);
  }, []);

  // Navigate after splash duration when auth is ready
  useEffect(() => {
    if (!loading && showLogo && !hasNavigated) {
      const navTimer = setTimeout(() => {
        handleNavigation();
      }, 2500); // 2.5 second display after logo shows
      
      return () => clearTimeout(navTimer);
    }
  }, [loading, showLogo, isAuthenticated, hasNavigated]);

  // Emergency fallback - navigate after 6 seconds regardless of loading state
  useEffect(() => {
    const emergencyTimer = setTimeout(() => {
      if (!hasNavigated) {
        console.warn('Emergency timeout triggered - forcing navigation to login');
        setHasNavigated(true);
        navigate('/login', { replace: true });
      }
    }, 6000);
    
    return () => clearTimeout(emergencyTimer);
  }, [navigate, hasNavigated]);

  return (
    <div className="splash-screen">
      <motion.div
        className="splash-screen__content"
        initial={{ opacity: 0 }}
        animate={{ opacity: showLogo ? 1 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <Logo 
          type="app"
          appLogo="growth-plan-builder"
          className="splash-screen__logo"
        />
      </motion.div>
    </div>
  );
}
