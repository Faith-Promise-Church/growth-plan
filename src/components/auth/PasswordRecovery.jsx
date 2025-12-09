import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../../utils/AuthContext';
import { isValidEmail } from '../../utils/validation';
import Input from '../shared/Input';
import Button from '../shared/Button';
import './PasswordRecovery.css';

export default function PasswordRecovery({ onBack }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      const result = await resetPassword(email);
      
      if (result.success) {
        setSuccess(true);
      } else {
        // Don't reveal if email exists or not for security
        setSuccess(true);
      }
    } catch (err) {
      console.error('Reset password error:', err);
      // Still show success to not reveal email existence
      setSuccess(true);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <motion.div 
        className="password-recovery password-recovery--success"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="password-recovery__icon">✓</div>
        <h2 className="password-recovery__title">Check Your Email</h2>
        <p className="password-recovery__text">
          If an account exists with that email, a reset link has been sent.
        </p>
        <Button 
          variant="primary"
          onClick={onBack}
          fullWidth
        >
          Back to Login
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.form 
      className="password-recovery"
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="password-recovery__title">Reset Password</h2>
      <p className="password-recovery__text">
        Enter your email address and we'll send you a link to reset your password.
      </p>
      
      <Input
        type="email"
        label="Email Address"
        value={email}
        onChange={setEmail}
        placeholder="john@example.com"
        autoComplete="email"
        error={error}
        required
      />

      <Button 
        type="submit" 
        variant="primary"
        fullWidth 
        disabled={loading || !email}
      >
        {loading ? 'Sending...' : 'Send Reset Link'}
      </Button>

      <button 
        type="button"
        className="password-recovery__back"
        onClick={onBack}
      >
        ← Back to Login
      </button>
    </motion.form>
  );
}
