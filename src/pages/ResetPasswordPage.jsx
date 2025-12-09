import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../utils/supabaseClient';
import { validatePassword, passwordsMatch } from '../utils/validation';
import Input from '../components/shared/Input';
import Button from '../components/shared/Button';
import Logo from '../components/shared/Logo';
import './LoginPage.css';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const passwordValidation = validatePassword(password);
  const doPasswordsMatch = passwordsMatch(password, confirmPassword);

  // Check if we have a valid session from the reset link
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Invalid or expired reset link. Please request a new password reset.');
      }
    };
    checkSession();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!passwordValidation.isValid) {
      setError('Password does not meet all requirements');
      return;
    }

    if (!doPasswordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: password
      });

      if (updateError) throw updateError;

      setSuccess(true);
      
      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError(err.message || 'Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <header className="login-page__header">
        <Logo 
          type="app"
          appLogo="growth-plan-builder-dark"
          size={180}
          className="login-page__logo"
        />
      </header>

      <main className="login-page__content">
        {success ? (
          <motion.div 
            className="reset-success"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="reset-success__icon">✓</div>
            <h2>Password Reset Successfully!</h2>
            <p>Redirecting to login...</p>
          </motion.div>
        ) : (
          <motion.form 
            className="login-form"
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="login-form__title">Reset Your Password</h2>
            <p style={{ marginBottom: '24px', opacity: 0.8 }}>
              Enter your new password below.
            </p>
            
            <Input
              type="password"
              label="New Password"
              value={password}
              onChange={setPassword}
              placeholder="Create a new password"
              autoComplete="new-password"
              showPasswordToggle
              required
            />

            <div className="signup-form__requirements">
              <div className={`requirement ${passwordValidation.requirements.minLength ? 'met' : ''}`}>
                <span className="requirement__icon">{passwordValidation.requirements.minLength ? '✓' : '○'}</span>
                At least 8 characters
              </div>
              <div className={`requirement ${passwordValidation.requirements.hasUppercase ? 'met' : ''}`}>
                <span className="requirement__icon">{passwordValidation.requirements.hasUppercase ? '✓' : '○'}</span>
                At least 1 uppercase letter
              </div>
              <div className={`requirement ${passwordValidation.requirements.hasNumber ? 'met' : ''}`}>
                <span className="requirement__icon">{passwordValidation.requirements.hasNumber ? '✓' : '○'}</span>
                At least 1 number
              </div>
            </div>

            <Input
              type="password"
              label="Confirm Password"
              value={confirmPassword}
              onChange={setConfirmPassword}
              placeholder="Confirm your new password"
              autoComplete="new-password"
              showPasswordToggle
              required
            />

            {confirmPassword && (
              <div className={`signup-form__match ${doPasswordsMatch ? 'match' : 'no-match'}`}>
                {doPasswordsMatch ? '✓ Passwords match' : '✗ Passwords do not match'}
              </div>
            )}

            {error && (
              <motion.div 
                className="login-form__error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                {error}
              </motion.div>
            )}

            <Button 
              type="submit" 
              variant="primary"
              fullWidth 
              disabled={loading || !passwordValidation.isValid || !doPasswordsMatch}
            >
              {loading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <button 
              type="button"
              className="login-form__forgot"
              onClick={() => navigate('/login')}
            >
              Back to Login
            </button>
          </motion.form>
        )}
      </main>
    </div>
  );
}
