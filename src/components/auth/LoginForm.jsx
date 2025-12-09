import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../utils/AuthContext';
import { 
  formatPhoneNumber, 
  isValidPhoneNumber,
  getRateLimitStatus,
  recordFailedAttempt,
  clearRateLimitOnSuccess
} from '../../utils/validation';
import { supabase, isSupabaseConfigured } from '../../utils/supabaseClient';
import Input from '../shared/Input';
import Button from '../shared/Button';
import './LoginForm.css';

export default function LoginForm({ onSwitchToSignup, onForgotPassword }) {
  const { signIn } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePhoneChange = (value) => {
    setPhone(formatPhoneNumber(value));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      setError('Database not configured. Please contact support.');
      return;
    }

    // Validate phone format
    if (!isValidPhoneNumber(phone)) {
      setError('Please enter a valid phone number (xxx-xxx-xxxx)');
      return;
    }

    // Check rate limiting
    const rateStatus = getRateLimitStatus(phone);
    if (rateStatus.isLocked) {
      setError(`Too many failed attempts. Please try again in ${rateStatus.remainingMinutes} minutes.`);
      return;
    }

    setLoading(true);

    try {
      console.log('Looking up email for phone:', phone);
      
      // Look up the email by phone number from user_profiles
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('phone', phone)
        .maybeSingle(); // Use maybeSingle to avoid error when no match
      
      console.log('Phone lookup result:', { profileData, profileError });

      if (profileError) {
        console.error('Profile lookup error:', profileError);
        setError('An error occurred. Please try again.');
        setLoading(false);
        return;
      }

      if (!profileData || !profileData.email) {
        const result = recordFailedAttempt(phone);
        if (result.isLocked) {
          setError('Too many failed attempts. Please try again in 15 minutes.');
        } else {
          setError('Phone Number and Password do not match our system. Try again or create a login.');
        }
        setLoading(false);
        return;
      }

      console.log('Found email, attempting sign in...');
      
      // Sign in with the email from the profile
      const result = await signIn({ email: profileData.email, password });

      if (result.success) {
        console.log('Sign in successful');
        clearRateLimitOnSuccess(phone);
        // Navigation will be handled by the parent component
      } else {
        console.log('Sign in failed:', result.error);
        const rateResult = recordFailedAttempt(phone);
        if (rateResult.isLocked) {
          setError('Too many failed attempts. Please try again in 15 minutes.');
        } else {
          setError('Phone Number and Password do not match our system. Try again or create a login.');
        }
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.form 
      className="login-form"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="login-form__title">Welcome Back</h2>
      
      <Input
        label="Phone Number"
        value={phone}
        onChange={handlePhoneChange}
        placeholder="865-123-4567"
        inputMode="tel"
        autoComplete="tel"
        required
      />

      <Input
        type="password"
        label="Password"
        value={password}
        onChange={setPassword}
        placeholder="Enter your password"
        autoComplete="current-password"
        showPasswordToggle
        required
      />

      <AnimatePresence>
        {error && (
          <motion.div 
            className="login-form__error"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            {error}
            {error.includes('create a login') && (
              <button 
                type="button" 
                className="login-form__error-link"
                onClick={onSwitchToSignup}
              >
                Create Login
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <Button 
        type="submit" 
        variant="primary"
        fullWidth 
        disabled={loading || !phone || !password}
      >
        {loading ? 'Logging in...' : 'Login'}
      </Button>

      <button 
        type="button"
        className="login-form__forgot"
        onClick={onForgotPassword}
      >
        Forgot Password?
      </button>
    </motion.form>
  );
}
