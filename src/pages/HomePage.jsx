import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../utils/AuthContext';
import Logo from '../components/shared/Logo';
import Button from '../components/shared/Button';
import './HomePage.css';

export default function HomePage() {
  const navigate = useNavigate();
  const { profile, signOut } = useAuth();

  const handleLogout = async () => {
    console.log('Logout button clicked');
    try {
      await signOut();
      console.log('SignOut completed, redirecting...');
      // Force a complete page reload to clear all state
      window.location.replace('/login');
    } catch (err) {
      console.error('Logout failed:', err);
      // Force redirect anyway
      window.location.replace('/login');
    }
  };

  return (
    <div className="home-page">
      <motion.header 
        className="home-page__header"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Logo 
          type="app"
          appLogo="growth-plan-builder"
          className="home-page__logo"
        />
        {profile && (
          <p className="home-page__greeting">
            Welcome, {profile.first_name}!
          </p>
        )}
      </motion.header>

      <motion.main 
        className="home-page__content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="home-page__buttons">
          <Button
            variant="primary-on-color"
            fullWidth
            onClick={() => navigate('/assessment')}
            className="home-page__button"
          >
            Assessment
          </Button>
          
          <Button
            variant="primary-on-color"
            fullWidth
            onClick={() => navigate('/growth-plan')}
            className="home-page__button"
          >
            Growth Plan
          </Button>
        </div>
      </motion.main>

      <motion.footer 
        className="home-page__footer"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <button 
          className="home-page__logout"
          onClick={handleLogout}
        >
          Log Out
        </button>
      </motion.footer>
    </div>
  );
}
