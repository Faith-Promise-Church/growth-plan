import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { fetchCheckinSession, submitCheckin, saveGoal, listGoals, getPlan, listCheckins } from '../data/api.js';
import { Button, Card, PageHeader, LoadingBlock, Banner, FrequencyInput, EmptyState } from '../components/ui/index.jsx';
import { useToast } from '../components/ui/Toast.jsx';
import { DIMENSIONS } from '../content/dimensions.js';
import { FREQUENCY_OPTIONS } from '../content/assessment.js';
import { orderedDimensions, composeHabitSentence, starterToDraft, encodeCadence } from '../lib/habits.js';
import { getPractice } from '../content/practices.js';
import { MAX_NOTE_LENGTH, buildAdjustments } from '../lib/checkinCore.js';
import { addMonths } from '../lib/time.js';

const PENDING_KEY = 'gp-checkin-pending-action';

export default function CheckInPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const toast = useToast();
  // Read the token once; the address bar is cleaned below.
  const [token] = useState(() => new URLSearchParams(location.search).get('token'));

  const [session, setSession] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [responses, setResponses] = useState({});
  const [note, setNote] = useState('');
  const [result, setResult] = useState(null);
  const [submitError, setSubmitError] = useState('');
  const [busy, setBusy] = useState(false);

  // Keep the token out of the address bar (and out of history and screenshots).
  useEffect(() => {
    if (token) window.history.replaceState(window.history.state, '', location.pathname);
  }, [token, location.pathname]);

  useEffect(() => {
    let live = true;
    if (!token && !isAuthenticated) return undefined;
    let pending = null;
    try {
      pending = JSON.parse(sessionStorage.getItem(PENDING_KEY) || 'null');
    } catch {
      pending = null;
    }
    fetchCheckinSession(token, token ? undefined : pending?.period)
      .then(async (s) => {
        if (!live) return;
        setSession(s);
        if (s.existing?.responses) setResponses(s.existing.responses);
        if (s.existing?.note) setNote(s.existing.note);
        // Coming back after signing in to apply a suggestion: show the summary again.
        if (pending && s.via === 'session' && s.existing?.responses && user) {
          const history = await listCheckins(user.id, 3).catch(() => []);
          const last = history.find((c) => c.period === addMonths(s.period, -1));
          if (live) setResult({ adjustments: buildAdjustments(s.habits, s.existing.responses, last?.responses ?? null) });
          try {
            sessionStorage.removeItem(PENDING_KEY);
          } catch {
            // ignore
          }
        }
      })
      .catch((err) => live && setLoadError(err));
    return () => {
      live = false;
    };
  }, [token, isAuthenticated, user]);

  async function submit() {
    if (busy) return;
    setBusy(true);
    setSubmitError('');
    try {
      const res = await submitCheckin({ token, responses, note: note.trim() ? note : null });
      setResult(res);
      window.scrollTo(0, 0);
    } catch (err) {
      setSubmitError(err.status === 401 ? err.message : 'Your check-in was not saved. Your answers are still here. Try again.');
    } finally {
      setBusy(false);
    }
  }

  // Applying a suggestion changes the plan, so it needs a signed-in session.
  async function apply(habit, action) {
    if (!isAuthenticated) {
      try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify({ habitId: habit.id, action: action.key, period: session.period }));
      } catch {
        // ignore
      }
      navigate('/login', { state: { from: '/check-in' } });
      return;
    }
    try {
      const plan = session.planYear ? await getPlan(user.id, session.planYear) : null;
      const goals = plan ? await listGoals(plan.id) : [];
      const goal = goals.find((g) => g.id === habit.id);
      if (!goal) throw new Error('That habit is not in your plan any more.');
      if (action.key === 'pause') await saveGoal({ ...goal, status: 'paused' });
      else if (action.key === 'let-go') await saveGoal({ ...goal, status: 'done' });
      else if (action.key === 'smaller' || action.key === 'stretch') {
        const practice = getPractice(goal.practice_key);
        const size = action.key === 'smaller' ? 'small' : 'stretch';
        if (practice?.[size]) {
          const d = starterToDraft(practice, size);
          await saveGoal({ ...goal, goal_text: composeHabitSentence(d), cadence: encodeCadence(d.cadence, d.cadenceText), anchor: null });
        } else {
          navigate(`/plan/${session.planYear}/${goal.dimension}`);
          return;
        }
      }
      setResult((r) => ({ ...r, applied: { ...(r?.applied ?? {}), [habit.id]: action.key } }));
      toast.show(action.key === 'keep' ? 'Kept as it is.' : 'Your plan is updated.', { tone: 'success' });
    } catch (err) {
      toast.show(err.message || 'That change was not saved.', { tone: 'error' });
    }
  }

  if (!token && !isAuthenticated) {
    return (
      <div className="page">
        <PageHeader title="Monthly check-in" />
        <EmptyState title="Sign in to check in" action={<Button to="/login" state={{ from: '/check-in' }}>Log in</Button>}>
          <p>Or open the link in your monthly check-in email.</p>
        </EmptyState>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="page">
        <PageHeader title="Monthly check-in" />
        <Banner tone="error">{loadError.status === 401 ? loadError.message : 'Your check-in did not load. Check your connection and try again.'}</Banner>
        {!isAuthenticated ? (
          <Button to="/login" state={{ from: '/check-in' }}>
            Log in
          </Button>
        ) : null}
      </div>
    );
  }

  if (!session) return <div className="page"><LoadingBlock label="Loading your check-in" /></div>;

  const habits = session.habits ?? [];
  const order = orderedDimensions(session.focus);
  const groups = order.map((d) => ({ d, items: habits.filter((h) => h.dimension === d) })).filter((g) => g.items.length);
  const allAnswered = habits.length > 0 && habits.every((h) => Number.isInteger(responses[h.id]));

  if (!habits.length) {
    return (
      <div className="page">
        <PageHeader title={`${session.monthLabel} check-in`} />
        <EmptyState title="There are no active habits to check in on" action={<Button to={isAuthenticated ? `/plan/${session.planYear ?? ''}` : '/login'}>{isAuthenticated ? 'Go to my plan' : 'Log in to build your plan'}</Button>}>
          <p>Add a habit or two to your plan, and next month you can check in on them here.</p>
        </EmptyState>
      </div>
    );
  }

  if (result) {
    return (
      <div className="page">
        <PageHeader title="Thank you for checking in" lead={`Here is your ${session.monthLabel} summary.`} />
        {groups.map(({ d, items }) => (
          <Card key={d} accent={d}>
            <h2 className="card__title">{DIMENSIONS[d].name}</h2>
            <ul className="checkin-summary">
              {items.map((h) => {
                const adj = result.adjustments?.[h.id];
                const applied = result.applied?.[h.id];
                return (
                  <li key={h.id}>
                    <p className="checkin-summary__habit">{h.sentence}</p>
                    <p className="muted">{FREQUENCY_OPTIONS[responses[h.id]]?.label}</p>
                    {adj?.message ? <p>{adj.message}</p> : null}
                    {adj?.actions?.length && !applied ? (
                      <div className="stack stack--tight">
                        {adj.actions.find((a) => a.sentence) ? <p className="habit-editor__preview">{adj.actions.find((a) => a.sentence).sentence}</p> : null}
                        <div className="button-row">
                          {adj.actions.map((a) => (
                            <Button key={a.key} size="sm" variant="secondary" onClick={() => apply(h, a)}>
                              {a.label}
                            </Button>
                          ))}
                        </div>
                        {!isAuthenticated ? <p className="muted">You will be asked to log in before anything changes.</p> : null}
                      </div>
                    ) : null}
                    {applied ? <p className="muted">Done.</p> : null}
                  </li>
                );
              })}
            </ul>
          </Card>
        ))}
        <div className="button-row">
          {isAuthenticated ? <Button to="/home">Go home</Button> : <Button to="/login">Log in to see your plan</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <PageHeader
        title={`${session.monthLabel} check-in`}
        lead={`${session.firstName ? `Hi ${session.firstName}. ` : ''}For each habit, choose how steady it was over the last month.`}
      />
      {groups.map(({ d, items }) => (
        <Card key={d} accent={d}>
          <h2 className="card__title">
            {DIMENSIONS[d].name}
            {session.focus?.includes(d) ? <span className="tag">Focus</span> : null}
          </h2>
          {items.map((h) => (
            <FrequencyInput
              key={h.id}
              name={`h-${h.id}`}
              legend={h.sentence}
              value={responses[h.id]}
              onChange={(v) => setResponses((r) => ({ ...r, [h.id]: v }))}
              dimension={d}
            />
          ))}
        </Card>
      ))}
      <Card>
        <label className="field__label" htmlFor="checkin-note">
          Anything you want to remember about this month? (optional)
        </label>
        <textarea id="checkin-note" className="input textarea" rows={3} maxLength={MAX_NOTE_LENGTH} value={note} onChange={(e) => setNote(e.target.value)} />
      </Card>
      {submitError ? <Banner tone="error">{submitError}</Banner> : null}
      <div className="step-nav">
        {isAuthenticated ? <Link className="text-link" to="/home">Cancel</Link> : <span />}
        <Button onClick={submit} disabled={!allAnswered} loading={busy}>
          Save my check-in
        </Button>
      </div>
      {!allAnswered ? <p className="muted step-hint">Answer every habit to save.</p> : null}
    </div>
  );
}
