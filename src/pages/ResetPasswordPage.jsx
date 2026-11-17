import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../data/client.js';
import { validatePassword } from '../lib/validation.js';
import { Button, Field, Banner } from '../components/ui/index.jsx';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [ready, setReady] = useState(null);
  const [done, setDone] = useState(false);
  const pw = validatePassword(password);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data?.session)));
  }, []);

  async function submit(e) {
    e.preventDefault();
    if (!pw.isValid) return setError('Use at least 8 characters with a capital letter and a number.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setError('');
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) return setError('Your password was not changed. Request a new reset link and try again.');
    setDone(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <img className="auth-card__logo" src="/assets/logos/growth-plan-builder-dark.png" alt="Growth Plan Builder" width="120" height="158" />
        <h1 className="auth-card__title">Choose a new password</h1>
        {done ? (
          <div className="stack">
            <Banner tone="success">Your password is changed.</Banner>
            <Button block onClick={() => navigate('/home')}>
              Go to my plan
            </Button>
          </div>
        ) : ready === false ? (
          <div className="stack">
            <Banner tone="error">This reset link has expired or was already used. Request a new one from the log in page.</Banner>
            <Link className="btn btn--secondary btn--block" to="/login">
              Back to log in
            </Link>
          </div>
        ) : (
          <form className="stack" onSubmit={submit} noValidate>
            <Field label="New password" hint="At least 8 characters, with a capital letter and a number.">
              {(a) => <input {...a} className="input" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />}
            </Field>
            <Field label="Type it again">
              {(a) => <input {...a} className="input" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />}
            </Field>
            {error ? <Banner tone="error">{error}</Banner> : null}
            <Button type="submit" block disabled={ready === null}>
              Save my new password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
