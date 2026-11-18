import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { unsubscribeWithToken } from '../data/api.js';
import { Button, Card, PageHeader, Banner } from '../components/ui/index.jsx';
import CheckinOptIn from '../components/app/CheckinOptIn.jsx';

export default function EmailPreferencesPage() {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  // Read the token once; the address bar is cleaned below.
  const [token] = useState(() => new URLSearchParams(location.search).get('token'));
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (token) window.history.replaceState(window.history.state, '', location.pathname);
  }, [token, location.pathname]);

  // Opening this page never changes anything. Unsubscribing happens on the button press.
  async function unsubscribe() {
    setError('');
    try {
      await unsubscribeWithToken(token);
      setDone(true);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <PageHeader title="Email preferences" />
      {token ? (
        <Card>
          {done ? (
            <Banner tone="success">You will not get any more monthly check-ins. You can turn them back on here after you log in.</Banner>
          ) : (
            <>
              <h2 className="card__title">Stop monthly check-ins?</h2>
              <p>You will stop getting the check-in email on the first Monday of each month.</p>
              {error ? <Banner tone="error">{error}</Banner> : null}
              <Button onClick={unsubscribe}>Stop monthly check-ins</Button>
            </>
          )}
        </Card>
      ) : null}
      {isAuthenticated ? (
        <Card>
          <h2 className="card__title">Monthly check-in</h2>
          <CheckinOptIn />
        </Card>
      ) : !token ? (
        <Card>
          <p>Log in to change your email preferences.</p>
          <Button to="/login" state={{ from: '/email/preferences' }}>
            Log in
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
