import { useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usePlanData } from '../../hooks/useUserData.js';
import { ensurePlan, saveGoal, deleteGoal, newId } from '../../data/api.js';
import { Button, Card, LoadingBlock, Banner, useConfirm } from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import HabitEditor from '../../components/app/HabitEditor.jsx';
import HelperPanel from '../../components/app/HelperPanel.jsx';
import { DIMENSIONS, dimensionIcon, isDimension, DIMENSION_ORDER } from '../../content/dimensions.js';
import { scoresFromRow, getRead, formatScore } from '../../lib/scoring.js';
import { visibleGoals, isNotStartedLegacy, goalPracticeKey, starterToDraft } from '../../lib/habits.js';
import { isValidPlanYear, currentPlanYear } from '../../lib/time.js';

function HabitRow({ goal, editing, readOnly, onEdit, onClose, onSaved, onToggle, onRemove }) {
  const paused = goal.status === 'paused';
  const done = goal.status === 'done';
  if (editing) {
    return (
      <li className="habit habit--editing">
        <HabitEditor goal={goal} onSaved={onSaved} onClose={onClose} />
      </li>
    );
  }
  return (
    <li className={`habit${paused || done ? ' habit--inactive' : ''}`}>
      <p className="habit__text">
        {goal.goal_text}
        {paused ? <span className="tag">Paused</span> : null}
        {done ? <span className="tag">Done</span> : null}
      </p>
      {readOnly ? null : (
        <div className="button-row">
          <Button size="sm" variant="secondary" onClick={onEdit}>
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={onToggle}>
            {paused || done ? 'Make active' : 'Pause'}
          </Button>
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove
          </Button>
        </div>
      )}
    </li>
  );
}

export default function DimensionPage() {
  const { year: yearParam, dimension } = useParams();
  const year = Number(yearParam);
  const { user } = useAuth();
  const toast = useToast();
  const [confirm, confirmDialog] = useConfirm();
  const { data, loading, error, reload, setData } = usePlanData(year);
  const [editingId, setEditingId] = useState(null);
  const [newDraft, setNewDraft] = useState(null);
  const [actionError, setActionError] = useState('');
  // A plan from an earlier year opens as a record. The person can choose to change it.
  const [reopened, setReopened] = useState(false);

  if (!isValidPlanYear(year) || !isDimension(dimension)) return <Navigate to="/home" replace />;
  if (loading && !data) return <div className="page"><LoadingBlock /></div>;
  if (error && !data) {
    return (
      <div className="page">
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>
          Your plan did not load.
        </Banner>
      </div>
    );
  }

  const info = DIMENSIONS[dimension];
  const scores = scoresFromRow(data.latest)?.[dimension] ?? null;
  const read = scores?.habit != null ? getRead(scores.flourishing, scores.habit) : null;
  const goals = data.goals.filter((g) => g.dimension === dimension);
  const shown = visibleGoals(goals);
  const isFocus = Boolean(data.plan?.focus_dimensions?.includes(dimension));
  const idx = DIMENSION_ORDER.indexOf(dimension);
  const isPast = year < currentPlanYear();
  const readOnly = isPast && !reopened;

  function upsertLocal(row) {
    setData((d) => {
      const exists = d.goals.some((g) => g.id === row.id);
      return { ...d, goals: exists ? d.goals.map((g) => (g.id === row.id ? { ...g, ...row } : g)) : [...d.goals, row] };
    });
  }

  async function startAdd(practice, size) {
    setActionError('');
    try {
      const plan = data.plan ?? (await ensurePlan(user.id, year));
      if (!data.plan) setData((d) => ({ ...d, plan }));
      // Reuse a blank v1 required goal for the same practice, so no duplicate row is created.
      const legacy = practice ? goals.find((g) => isNotStartedLegacy(g) && goalPracticeKey(g) === practice.key) : null;
      const maxOrder = Math.max(-1, ...goals.map((g) => g.sort_order ?? 0));
      const base = legacy
        ? { ...legacy, practice_key: practice.key }
        : {
            id: newId(),
            growth_plan_id: plan.id,
            dimension,
            discipline: null,
            goal_name: practice?.name ?? '',
            goal_text: '',
            is_mandatory: false,
            sort_order: maxOrder + 1,
            practice_key: practice?.key ?? null,
            status: 'active',
          };
      setEditingId(null);
      setNewDraft({ goal: base, draft: practice ? starterToDraft(practice, size) : { what: '', cadence: 'weekly', cadenceText: '', anchor: '' } });
    } catch (err) {
      setActionError(err.message);
    }
  }

  async function toggle(goal) {
    const next = goal.status === 'active' || !goal.status ? 'paused' : 'active';
    try {
      const row = await saveGoal({ ...goal, status: next });
      upsertLocal(row);
      toast.show(next === 'paused' ? 'Habit paused.' : 'Habit is active again.');
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    }
  }

  async function remove(goal) {
    const ok = await confirm({ title: 'Remove this habit?', body: goal.goal_text, confirmLabel: 'Remove', danger: true });
    if (!ok) return;
    try {
      if (goal.is_mandatory) {
        // v1 required goals are kept as rows; clearing the text returns them to "not started".
        const row = await saveGoal({ ...goal, goal_text: '', status: 'active' });
        upsertLocal(row);
      } else {
        await deleteGoal(goal.id);
        setData((d) => ({ ...d, goals: d.goals.filter((g) => g.id !== goal.id) }));
      }
      toast.show('Habit removed.');
    } catch (err) {
      toast.show(err.message, { tone: 'error' });
    }
  }

  return (
    <div className="page" style={{ '--dim': `var(--${dimension})`, '--dim-ink': `var(--${dimension}-ink)`, '--dim-on': `var(--${dimension}-on)` }}>
      <div className="page-main">
        <Link className="page-header__back" to={`/plan/${year}`}>
          <span aria-hidden="true">←</span> {`${year} plan`}
        </Link>
        <div className="dim-band">
          <img src={dimensionIcon(dimension, 'inverse')} alt="" width="56" height="56" />
          <h1 className="dim-band__title">{info.name}</h1>
          {isFocus ? <span className="dim-band__tag">Focus area</span> : null}
        </div>
        <div className="score-strip">
          <div>
            <span className="muted">Flourishing</span>
            <strong>{scores?.flourishing != null ? formatScore(scores.flourishing) : 'Not measured'}</strong>
          </div>
          {scores?.habit != null ? (
            <div>
              <span className="muted">Habits</span>
              <strong>{formatScore(scores.habit)}</strong>
            </div>
          ) : null}
          {read ? <p className="read">{read.label}</p> : null}
        </div>

        {isPast ? (
          <Banner
            tone="info"
            action={
              readOnly ? (
                <Button size="sm" variant="secondary" onClick={() => setReopened(true)}>
                  Make changes
                </Button>
              ) : null
            }
          >
            {readOnly ? `This plan is from ${year}. It is kept as a record.` : `You are changing your ${year} plan.`}
          </Banner>
        ) : null}

        <Card>
          <h2 className="card__title">My habits</h2>
          {actionError ? <Banner tone="error">{actionError}</Banner> : null}
          {shown.length ? (
            <ul className="habits">
              {shown.map((g) => (
                <HabitRow
                  key={g.id}
                  goal={g}
                  editing={!readOnly && editingId === g.id}
                  readOnly={readOnly}
                  onEdit={() => { setNewDraft(null); setEditingId(g.id); }}
                  onClose={() => setEditingId(null)}
                  onSaved={upsertLocal}
                  onToggle={() => toggle(g)}
                  onRemove={() => remove(g)}
                />
              ))}
            </ul>
          ) : readOnly ? (
            <p className="muted">There were no habits in this area.</p>
          ) : !newDraft ? (
            <p className="muted">No habits here yet. The Helper below can suggest a place to start, or you can write your own.</p>
          ) : null}
          {newDraft && !readOnly ? (
            <HabitEditor
              key={newDraft.goal.id ?? 'new'}
              goal={newDraft.goal}
              initialDraft={newDraft.draft}
              isNew
              onSaved={(row) => upsertLocal(row)}
              onClose={() => setNewDraft(null)}
            />
          ) : null}
        </Card>

        {readOnly ? null : (
          <HelperPanel
            userId={user.id}
            dimension={dimension}
            scores={scores}
            habitResponses={data.latest?.version === 2 ? data.latest.habit_responses : null}
            goals={goals}
            isFocus={isFocus}
            focusCount={data.plan?.focus_dimensions?.length ?? 0}
            onAdd={startAdd}
            onWriteOwn={() => startAdd(null)}
          />
        )}

        <details className="about card">
          <summary>About this area</summary>
          <h3>What it is</h3>
          <p>{info.definition}</p>
          <h3>Why it matters</h3>
          <p>{info.whyItMatters}</p>
          <h3>How to grow</h3>
          <p>{info.growthFocus}</p>
        </details>

        <nav className="pager" aria-label="Other areas">
          {idx > 0 ? (
            <Button variant="ghost" to={`/plan/${year}/${DIMENSION_ORDER[idx - 1]}`}>
              {`← ${DIMENSIONS[DIMENSION_ORDER[idx - 1]].name}`}
            </Button>
          ) : <span />}
          {idx < 6 ? (
            <Button variant="ghost" to={`/plan/${year}/${DIMENSION_ORDER[idx + 1]}`}>
              {`${DIMENSIONS[DIMENSION_ORDER[idx + 1]].name} →`}
            </Button>
          ) : <span />}
        </nav>
      </div>
      {confirmDialog}
    </div>
  );
}
