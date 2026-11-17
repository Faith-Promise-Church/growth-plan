import { useEffect, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { getEmailPreferences, saveEmailPreferences } from '../../data/api.js';
import { isValidEmail } from '../../lib/validation.js';
import { Button, Field, Banner } from '../ui/index.jsx';
import { useToast } from '../ui/Toast.jsx';

export const OPT_IN_LABEL = 'Email me a monthly check-in on the first Monday of each month.';

// The opt-in. Off by default for everyone; nothing is saved until the person presses Save.
export default function CheckinOptIn({ compact = false, onSaved }) {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [prefs, setPrefs] = useState(undefined);
  const [checked, setChecked] = useState(false);
  const [editing, setEditing] = useState(false);
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    if (!user) return undefined;
    getEmailPreferences(user.id)
      .then((p) => {
        if (!live) return;
        setPrefs(p ?? null);
        setChecked(Boolean(p?.monthly_checkin));
        setEmail(p?.email || '');
      })
      .catch(() => live && setPrefs(null));
    return () => {
      live = false;
    };
  }, [user]);

  const address = (prefs?.email || profile?.email || user?.email || '').trim();
  const dirty = prefs !== undefined && (checked !== Boolean(prefs?.monthly_checkin) || (editing && email.trim() !== (prefs?.email || '')));

  async function save() {
    setError('');
    let nextEmail;
    if (editing) {
      if (email.trim() && !isValidEmail(email.trim())) {
        setError('Enter an email address like name@example.com.');
        return;
      }
      nextEmail = email.trim() || null;
    }
    try {
      const saved = await saveEmailPreferences(user.id, { monthly_checkin: checked, email: nextEmail });
      setPrefs(saved);
      setEditing(false);
      toast.show(saved.monthly_checkin ? 'You will get a check-in on the first Monday of each month.' : 'Monthly check-ins are off.', { tone: 'success' });
      onSaved?.(saved);
    } catch (err) {
      setError(err.message);
    }
  }

  if (prefs === undefined) return <div className="skeleton" style={{ height: 72 }} aria-hidden="true" />;

  return (
    <div className={compact ? 'optin optin--compact' : 'optin'}>
      <label className="checkbox">
        <input type="checkbox" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
        <span>{OPT_IN_LABEL}</span>
      </label>
      {editing ? (
        <Field label="Send check-ins to" hint="This changes where check-ins go. It does not change how you log in." error={error}>
          {(a) => <input {...a} className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} />}
        </Field>
      ) : (
        <p className="optin__address">
          {address ? (
            <>
              It will go to <strong>{address}</strong>.{' '}
            </>
          ) : (
            'Add the address it should go to. '
          )}
          <button type="button" className="link-button" onClick={() => { setEditing(true); setEmail(address); }}>
            Use a different address
          </button>
        </p>
      )}
      {error && !editing ? <Banner tone="error">{error}</Banner> : null}
      <Button variant="secondary" onClick={save} disabled={!dirty || (checked && !address && !email.trim())}>
        Save
      </Button>
    </div>
  );
}
