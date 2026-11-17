import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { Button, Field, Banner } from '../components/ui/index.jsx';
import { formatPhoneNumber, isValidPhoneNumber, isValidEmail, validatePassword, getRateLimitStatus, recordFailedAttempt, clearRateLimitOnSuccess } from '../lib/validation.js';
import { phoneIsRegistered } from '../data/api.js';
import { isConfigured } from '../data/client.js';
import { DEMO_PEOPLE, DEMO_PASSWORD } from '../data/demoSeed.js';

function LoginForm({ onForgot }) {
  const { signInWithPhone } = useAuth();
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError('');
    if (!isValidPhoneNumber(phone)) {
      setError('Enter your phone number as 865-555-1234.');
      return;
    }
    const limit = getRateLimitStatus(phone);
    if (limit.isLocked) {
      setError(`Too many tries. Wait ${limit.remainingMinutes} minutes and try again.`);
      return;
    }
    setBusy(true);
    const result = await signInWithPhone(phone, password);
    setBusy(false);
    if (result.ok) {
      clearRateLimitOnSuccess(phone);
    } else {
      const r = recordFailedAttempt(phone);
      setError(r.isLocked ? 'Too many tries. Wait 15 minutes and try again.' : result.error);
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <Field label="Phone number">
        {(a) => (
          <input
            {...a}
            className="input"
            inputMode="tel"
            autoComplete="tel"
            placeholder="865-555-1234"
            value={phone}
            onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
            required
          />
        )}
      </Field>
      <Field label="Password">
        {(a) => (
          <input
            {...a}
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        )}
      </Field>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button type="submit" block loading={busy} disabled={!phone || !password}>
        Log in
      </Button>
      <button type="button" className="link-button" onClick={onForgot}>
        Forgot your password?
      </button>
    </form>
  );
}

function SignupForm({ onDone }) {
  const { signUp } = useAuth();
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const pw = validatePassword(form.password);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: k === 'phone' ? formatPhoneNumber(e.target.value) : e.target.value }));

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    const next = {};
    if (!form.firstName.trim()) next.firstName = 'Enter your first name.';
    if (!form.lastName.trim()) next.lastName = 'Enter your last name.';
    if (!isValidPhoneNumber(form.phone)) next.phone = 'Enter your phone number as 865-555-1234.';
    if (!isValidEmail(form.email)) next.email = 'Enter an email address like name@example.com.';
    if (!pw.isValid) next.password = 'Use at least 8 characters with a capital letter and a number.';
    setErrors(next);
    setError('');
    if (Object.keys(next).length) return;
    setBusy(true);
    try {
      if (await phoneIsRegistered(form.phone)) {
        setError('That phone number already has an account. Log in instead, or reset your password.');
        return;
      }
      const result = await signUp({
        email: form.email.trim(),
        password: form.password,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone,
      });
      if (!result.ok) setError(result.error);
      else onDone(result);
    } catch {
      setError('We could not reach the server. Check your connection and try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="stack" onSubmit={submit} noValidate>
      <div className="grid-2">
        <Field label="First name" error={errors.firstName}>
          {(a) => <input {...a} className="input" autoComplete="given-name" value={form.firstName} onChange={set('firstName')} maxLength={60} />}
        </Field>
        <Field label="Last name" error={errors.lastName}>
          {(a) => <input {...a} className="input" autoComplete="family-name" value={form.lastName} onChange={set('lastName')} maxLength={60} />}
        </Field>
      </div>
      <Field label="Phone number" hint="You will use this to log in." error={errors.phone}>
        {(a) => <input {...a} className="input" inputMode="tel" autoComplete="tel" placeholder="865-555-1234" value={form.phone} onChange={set('phone')} />}
      </Field>
      <Field label="Email" error={errors.email}>
        {(a) => <input {...a} className="input" type="email" autoComplete="email" value={form.email} onChange={set('email')} maxLength={254} />}
      </Field>
      <Field label="Password" hint="At least 8 characters, with a capital letter and a number." error={errors.password}>
        {(a) => <input {...a} className="input" type="password" autoComplete="new-password" value={form.password} onChange={set('password')} />}
      </Field>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button type="submit" block loading={busy}>
        Create my account
      </Button>
    </form>
  );
}

function ForgotForm({ onBack }) {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError('Enter an email address like name@example.com.');
      return;
    }
    setError('');
    try {
      await resetPassword(email.trim());
    } catch {
      // Same message either way, so the form never reveals which emails have accounts.
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="stack">
        <Banner tone="success">If an account uses that email, we sent it a link to reset the password.</Banner>
        <Button variant="secondary" block onClick={onBack}>
          Back to log in
        </Button>
      </div>
    );
  }
  return (
    <form className="stack" onSubmit={submit} noValidate>
      <p>Enter the email on your account and we will send you a link to reset your password.</p>
      <Field label="Email" error={error}>
        {(a) => <input {...a} className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />}
      </Field>
      <Button type="submit" block>
        Send the link
      </Button>
      <button type="button" className="link-button" onClick={onBack}>
        Back to log in
      </button>
    </form>
  );
}

export default function LoginPage() {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [checkEmail, setCheckEmail] = useState(false);
  const from = location.state?.from;
  const target = from && typeof from === 'string' && from.startsWith('/') && !from.startsWith('//') ? from : '/home';

  if (!loading && isAuthenticated) return <Navigate to={target} replace />;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img className="auth-card__logo" src="/assets/logos/growth-plan-builder-dark.png" alt="Growth Plan Builder" width="120" height="158" />
        {!isConfigured ? (
          <Banner tone="error">The app is not connected to its database. Contact the Faith Promise communications team.</Banner>
        ) : null}
        {import.meta.env.VITE_DEMO === '1' ? (
          <Banner tone="info">
            Demo mode. Log in with {DEMO_PEOPLE.map((p) => p.phone).join(', ')} and the password {DEMO_PASSWORD}.
          </Banner>
        ) : null}
        {checkEmail ? (
          <div className="stack">
            <h1 className="auth-card__title">Check your email</h1>
            <p>We sent you a link to confirm your account. Open it, then come back and log in.</p>
            <Button variant="secondary" block onClick={() => { setCheckEmail(false); setMode('login'); }}>
              Back to log in
            </Button>
          </div>
        ) : (
          <>
            {mode !== 'forgot' ? (
              <div className="segmented" role="tablist" aria-label="Log in or sign up">
                <button type="button" role="tab" aria-selected={mode === 'login'} className={mode === 'login' ? 'is-active' : ''} onClick={() => setMode('login')}>
                  Log in
                </button>
                <button type="button" role="tab" aria-selected={mode === 'signup'} className={mode === 'signup' ? 'is-active' : ''} onClick={() => setMode('signup')}>
                  Create an account
                </button>
              </div>
            ) : (
              <h1 className="auth-card__title">Reset your password</h1>
            )}
            {mode === 'login' ? <h1 className="visually-hidden">Log in</h1> : null}
            {mode === 'signup' ? <h1 className="visually-hidden">Create an account</h1> : null}
            {mode === 'login' ? <LoginForm onForgot={() => setMode('forgot')} /> : null}
            {mode === 'signup' ? (
              <SignupForm
                onDone={(r) => {
                  if (r.signedIn) navigate('/home', { replace: true });
                  else setCheckEmail(true);
                }}
              />
            ) : null}
            {mode === 'forgot' ? <ForgotForm onBack={() => setMode('login')} /> : null}
          </>
        )}
        <p className="auth-card__note">This login is separate from your Faith Promise app login.</p>
      </div>
    </div>
  );
}
