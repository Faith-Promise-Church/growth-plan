import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../data/client.js';
import { validatePassword } from '../lib/validation.js';
import { isUnreachable, readResetLink } from '../lib/resetLink.js';
import { Button, Field, Banner } from '../components/ui/index.jsx';

const UNREACHABLE = 'We could not reach the server. Check your connection and try again.';

// Two ways in. A current email carries the one-time link in the address, and the link is spent
// only when the person saves (see src/lib/resetLink.js). An older email signs the person in on
// the way here, so the page looks for that session instead.
export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const { search } = useLocation();
  const link = readResetLink(search);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [hasSession, setHasSession] = useState(null);
  const [spent, setSpent] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const pw = validatePassword(password);

  useEffect(() => {
    if (link.kind !== 'none') return undefined;
    let live = true;
    supabase.auth.getSession().then(({ data }) => live && setHasSession(Boolean(data?.session)));
    return () => {
      live = false;
    };
  }, [link.kind]);

  const ready = link.kind === 'link' ? !spent : link.kind === 'invalid' ? false : hasSession;

  async function submit(e) {
    e.preventDefault();
    if (saving) return undefined;
    if (!pw.isValid) return setError('Use at least 8 characters with a capital letter and a number.');
    if (password !== confirm) return setError('The two passwords do not match.');
    setError('');
    setSaving(true);
    try {
      if (link.kind === 'link') {
        const { error: linkErr } = await supabase.auth.verifyOtp({ token_hash: link.tokenHash, type: 'recovery' });
        if (linkErr) {
          if (isUnreachable(linkErr)) return setError(UNREACHABLE);
          return setSpent(true);
        }
        // The link is used now and the person is signed in. Take it out of the address so a
        // reload or a second try carries on from the session.
        setHasSession(true);
        navigate('/reset-password', { replace: true });
      }
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        if (isUnreachable(err)) return setError(UNREACHABLE);
        if (err.code === 'same_password') return setError('That is already your password. Choose a different one.');
        return setError('Your password was not changed. Request a new reset link and try again.');
      }
      return setDone(true);
    } finally {
      setSaving(false);
    }
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
            <Button type="submit" block disabled={ready === null || saving}>
              Save my new password
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
