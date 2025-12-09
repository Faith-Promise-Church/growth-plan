import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../utils/AuthContext';
import { isSupabaseConfigured } from '../../utils/supabaseClient';
import { 
  formatPhoneNumber, 
  isValidPhoneNumber,
  isValidEmail,
  validatePassword,
  passwordsMatch
} from '../../utils/validation';
import Input from '../shared/Input';
import Button from '../shared/Button';
import './SignupForm.css';

export default function SignupForm({ onSwitchToLogin, onSuccess }) {
  const { signUp, checkPhoneExists } = useAuth();
  const [step, setStep] = useState(1); // 1 = info, 2 = password
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  // Step 1 fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Step 2 fields
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password validation state
  const passwordValidation = validatePassword(password);
  const doPasswordsMatch = passwordsMatch(password, confirmPassword);

  const handlePhoneChange = (value) => {
    setPhone(formatPhoneNumber(value));
    setError('');
  };

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError('');

    // Check if Supabase is configured
    if (!isSupabaseConfigured) {
      setError('Database not configured. Please contact support.');
      return;
    }

    // Validate all fields
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name');
      return;
    }

    if (!isValidPhoneNumber(phone)) {
      setError('Please enter a valid phone number (xxx-xxx-xxxx)');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);

    try {
      // Check if phone number already exists
      const result = await checkPhoneExists(phone);
      
      if (result.error) {
        if (result.error.includes('timed out')) {
          setError('Connection timed out. Please check your internet and try again.');
        } else {
          setError('An error occurred. Please try again.');
        }
        setLoading(false);
        return;
      }
      
      if (result.exists) {
        setShowDuplicateModal(true);
        setLoading(false);
        return;
      }

      // Proceed to step 2
      setStep(2);
    } catch (err) {
      console.error('Check phone error:', err);
      if (err.message?.includes('timed out')) {
        setError('Connection timed out. Please check your internet and try again.');
      } else {
        setError('An error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate password requirements
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
      const result = await signUp({
        email,
        password,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone,
      });

      if (result.success) {
        onSuccess?.();
      } else {
        const errorMsg = result.error?.message || '';
        if (errorMsg.includes('timed out')) {
          setError('Connection timed out. Please check your internet and try again.');
        } else if (errorMsg.includes('not configured')) {
          setError('Database not configured. Please contact support.');
        } else {
          setError(errorMsg || 'Failed to create account. Please try again.');
        }
      }
    } catch (err) {
      console.error('Sign up error:', err);
      if (err.message?.includes('timed out')) {
        setError('Connection timed out. Please check your internet and try again.');
      } else {
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateYes = () => {
    setShowDuplicateModal(false);
    onSwitchToLogin();
  };

  const handleDuplicateNo = () => {
    setShowDuplicateModal(false);
    setPhone('');
    setFirstName('');
    setLastName('');
    setEmail('');
  };

  return (
    <>
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.form 
            key="step1"
            className="signup-form"
            onSubmit={handleStep1Submit}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="signup-form__title">Create Account</h2>
            
            <div className="signup-form__row">
              <Input
                label="First Name"
                value={firstName}
                onChange={setFirstName}
                placeholder="John"
                autoComplete="given-name"
                required
              />
              <Input
                label="Last Name"
                value={lastName}
                onChange={setLastName}
                placeholder="Doe"
                autoComplete="family-name"
                required
              />
            </div>

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
              type="email"
              label="Email Address"
              value={email}
              onChange={setEmail}
              placeholder="john@example.com"
              autoComplete="email"
              required
            />

            {error && (
              <motion.div 
                className="signup-form__error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                {error}
              </motion.div>
            )}

            <Button 
              type="submit" 
              variant="primary"
              dimensionColor="var(--dark-neutral)"
              fullWidth 
              disabled={loading}
            >
              {loading ? 'Checking...' : 'Enter'}
            </Button>
          </motion.form>
        ) : (
          <motion.form 
            key="step2"
            className="signup-form"
            onSubmit={handleStep2Submit}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            <h2 className="signup-form__title">Create Password</h2>
            
            <Input
              type="password"
              label="Password"
              value={password}
              onChange={setPassword}
              placeholder="Create a password"
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
              placeholder="Confirm your password"
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
                className="signup-form__error"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
              >
                {error}
              </motion.div>
            )}

            <div className="signup-form__buttons">
              <Button 
                type="button"
                variant="outlined"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <Button 
                type="submit" 
                variant="primary"
                disabled={loading || !passwordValidation.isValid || !doPasswordsMatch}
              >
                {loading ? 'Creating...' : 'Confirm Password'}
              </Button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Duplicate Phone Modal */}
      <AnimatePresence>
        {showDuplicateModal && (
          <motion.div 
            className="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <p className="modal__text">
                A user already exists with that phone number. Log in?
              </p>
              <div className="modal__buttons">
                <Button variant="primary" onClick={handleDuplicateYes}>Yes</Button>
                <Button variant="outlined" onClick={handleDuplicateNo}>No</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
