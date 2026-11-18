import { useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listAssessments, listPlans, listGoals, ensurePlan, updatePlan, saveGoal, newId } from '../../data/api.js';
import { Button, Card, PageHeader, LoadingBlock, Banner, Stepper } from '../../components/ui/index.jsx';
import CheckinOptIn from '../../components/app/CheckinOptIn.jsx';
import { DIMENSIONS, DIMENSION_ORDER } from '../../content/dimensions.js';
import { CADENCES, LIMITS, composeHabitSentence, decodeCadence, encodeCadence, visibleGoals, activeHabits } from '../../lib/habits.js';
import { scoresFromRow, suggestFocus } from '../../lib/scoring.js';
import { isValidPlanYear, daysBetween } from '../../lib/time.js';

const STALE_DAYS = 90;

function AdjustFields({ value, onChange, idPrefix }) {
  return (
    <div className="stack stack--tight">
      <label className="field__label" htmlFor={`${idPrefix}-what`}>
        What I will do
      </label>
      <textarea id={`${idPrefix}-what`} className="input textarea" rows={2} maxLength={LIMITS.what} value={value.what} onChange={(e) => onChange({ ...value, what: e.target.value })} />
      <fieldset className="chips-field">
        <legend className="field__label">How often</legend>
        <div className="chips">
          {CADENCES.filter((c) => c.value !== 'other').map((c) => (
            <label key={c.value} className="chip chip--small">
              <input type="radio" name={`${idPrefix}-cad`} checked={value.cadence === c.value} onChange={() => onChange({ ...value, cadence: c.value })} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <p className="habit-editor__preview">{composeHabitSentence(value)}</p>
    </div>
  );
}

export default function StartFlow() {
  const { year: yearParam } = useParams();
  const year = Number(yearParam);
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data, loading, error, reload } = useAsync(async () => {
    const [assessments, plans] = await Promise.all([listAssessments(user.id, 1), listPlans(user.id)]);
    const target = plans.find((p) => p.year === year) ?? null;
    const previous = plans.filter((p) => p.year < year).sort((a, b) => b.year - a.year)[0] ?? null;
    const [prevGoals, targetGoals] = await Promise.all([
      previous ? listGoals(previous.id) : Promise.resolve([]),
      target ? listGoals(target.id) : Promise.resolve([]),
    ]);
    return { latest: assessments[0] ?? null, target, previous, prevGoals: activeHabits(prevGoals).concat(visibleGoals(prevGoals).filter((g) => g.status === 'paused')), targetGoals };
  }, [user.id, year]);

  const [stage, setStage] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [dimIndex, setDimIndex] = useState(0);
  const [focus, setFocus] = useState(null);
  const [err, setErr] = useState('');
  // One new id per copied habit, so a retry after a failure updates instead of duplicating.
  const copyIds = useRef({});

  const dimsWithHabits = useMemo(
    () => (data ? DIMENSION_ORDER.filter((d) => data.prevGoals.some((g) => g.dimension === d)) : []),
    [data],
  );

  if (!isValidPlanYear(year)) return <Navigate to="/home" replace />;
  if (loading && !data) return <div className="page"><LoadingBlock /></div>;
  if (error && !data) {
    return (
      <div className="page">
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>
          This page did not load.
        </Banner>
      </div>
    );
  }

  const stale = !data.latest || daysBetween(data.latest.assessment_date, new Date()) > STALE_DAYS;
  const hasReview = dimsWithHabits.length > 0;
  const current = stage ?? (stale ? 'retake' : hasReview ? 'review' : 'focus');

  if (data.targetGoals.some((g) => String(g.goal_text ?? '').trim()) && current !== 'done' && current !== 'focus') {
    return (
      <div className="page">
        <PageHeader title={`Your ${year} plan`} />
        <Card>
          <p>{`You already have habits in your ${year} plan.`}</p>
          <Button to={`/plan/${year}`}>{`Go to my ${year} plan`}</Button>
        </Card>
      </div>
    );
  }

  const decisionFor = (g) => decisions[g.id] ?? { choice: 'keep' };
  const setDecision = (g, patch) => setDecisions((d) => ({ ...d, [g.id]: { ...decisionFor(g), ...patch } }));

  async function copyKept() {
    setErr('');
    try {
      const plan = data.target ?? (await ensurePlan(user.id, year, { copied_from_plan_id: data.previous.id, focus_dimensions: data.previous.focus_dimensions ?? null }));
      if (!plan.copied_from_plan_id) await updatePlan(plan.id, { copied_from_plan_id: data.previous.id });
      let order = 0;
      for (const g of data.prevGoals) {
        const dcs = decisionFor(g);
        if (dcs.choice === 'let-go') continue;
        const adjusted = dcs.choice === 'adjust' && dcs.draft;
        const goal_text = adjusted ? composeHabitSentence(dcs.draft) : g.goal_text;
        if (!String(goal_text).trim()) continue;
        copyIds.current[g.id] ??= newId();
        await saveGoal({
          id: copyIds.current[g.id],
          growth_plan_id: plan.id,
          dimension: g.dimension,
          discipline: g.discipline ?? null,
          goal_name: g.goal_name ?? '',
          goal_text,
          is_mandatory: false,
          sort_order: order++,
          practice_key: g.practice_key ?? null,
          cadence: adjusted ? encodeCadence(dcs.draft.cadence, '') : g.cadence ?? null,
          anchor: adjusted ? null : g.anchor ?? null,
          status: 'active',
        });
      }
      setFocus(data.previous.focus_dimensions?.length ? data.previous.focus_dimensions : null);
      setStage('focus');
    } catch (e) {
      setErr(e.message);
    }
  }

  async function saveFocus() {
    const chosen = focus ?? defaultFocus;
    if (!chosen.length) {
      setErr('Choose at least one focus area.');
      return;
    }
    setErr('');
    try {
      const plan = await ensurePlan(user.id, year);
      await updatePlan(plan.id, { focus_dimensions: chosen });
      setStage('done');
    } catch (e) {
      setErr(e.message);
    }
  }

  const latestScores = scoresFromRow(data.latest);
  const defaultFocus = data.previous?.focus_dimensions?.length ? data.previous.focus_dimensions : latestScores ? suggestFocus(latestScores, 2) : [];

  return (
    <div className="page">
      <PageHeader title={`Start your ${year} plan`} back={{ to: '/home', label: 'Home' }} />
      {err ? <Banner tone="error">{err}</Banner> : null}

      {current === 'retake' ? (
        <Card>
          <h2 className="card__title">{data.latest ? 'Your assessment is more than three months old' : 'Start with the assessment'}</h2>
          <p>{data.latest ? 'A lot can change in a few months. Retaking it helps your new plan fit where you are now.' : 'The assessment shows where to start. It takes about ten minutes.'}</p>
          <div className="button-row">
            <Button to="/assessment/take/1">{data.latest ? 'Retake the assessment' : 'Take the assessment'}</Button>
            <Button variant="secondary" onClick={() => setStage(hasReview ? 'review' : 'focus')}>
              Continue without it
            </Button>
          </div>
        </Card>
      ) : null}

      {current === 'review' && hasReview ? (
        <>
          <Stepper current={dimIndex + 1} total={dimsWithHabits.length} label={`Your ${data.previous.year} habits`} />
          {(() => {
            const d = dimsWithHabits[dimIndex];
            return (
              <Card accent={d}>
                <h2 className="card__title">{DIMENSIONS[d].name}</h2>
                <p className="muted">Keep the habits that helped, adjust the ones that need it, and let go of the rest.</p>
                <ul className="review-list">
                  {data.prevGoals
                    .filter((g) => g.dimension === d)
                    .map((g) => {
                      const dcs = decisionFor(g);
                      const { cadence } = decodeCadence(g.cadence);
                      return (
                        <li key={g.id} className="review-item">
                          <p className="review-item__text">{g.goal_text}</p>
                          <fieldset className="chips-field">
                            <legend className="visually-hidden">{`What to do with: ${g.goal_text}`}</legend>
                            <div className="chips">
                              {[
                                ['keep', 'Keep'],
                                ['adjust', 'Adjust'],
                                ['let-go', 'Let go'],
                              ].map(([v, label]) => (
                                <label key={v} className="chip chip--small">
                                  <input
                                    type="radio"
                                    name={`decide-${g.id}`}
                                    checked={dcs.choice === v}
                                    onChange={() =>
                                      setDecision(g, {
                                        choice: v,
                                        draft: v === 'adjust' ? dcs.draft ?? { what: String(g.goal_text).replace(/\.\s*$/, ''), cadence: cadence ?? 'weekly', cadenceText: '', anchor: '' } : dcs.draft,
                                      })
                                    }
                                  />
                                  <span>{label}</span>
                                </label>
                              ))}
                            </div>
                          </fieldset>
                          {dcs.choice === 'adjust' && dcs.draft ? (
                            <AdjustFields idPrefix={`adj-${g.id}`} value={dcs.draft} onChange={(draft) => setDecision(g, { draft })} />
                          ) : null}
                        </li>
                      );
                    })}
                </ul>
                <div className="step-nav">
                  <Button variant="secondary" onClick={() => (dimIndex === 0 ? setStage(stale ? 'retake' : 'review') : setDimIndex(dimIndex - 1))} disabled={dimIndex === 0 && !stale}>
                    Back
                  </Button>
                  {dimIndex < dimsWithHabits.length - 1 ? (
                    <Button onClick={() => setDimIndex(dimIndex + 1)}>Next</Button>
                  ) : (
                    <Button onClick={copyKept}>{`Copy into my ${year} plan`}</Button>
                  )}
                </div>
              </Card>
            );
          })()}
        </>
      ) : null}

      {current === 'focus' ? (
        <Card>
          <h2 className="card__title">Choose your focus areas</h2>
          <p>Pick two or three areas to focus on this year.</p>
          <div className="chip-grid" role="group" aria-label="Focus areas">
            {DIMENSION_ORDER.map((d) => {
              const chosen = focus ?? defaultFocus;
              return (
                <label key={d} className="chip" style={{ '--sel': `var(--${d}-ink)` }}>
                  <input
                    type="checkbox"
                    checked={chosen.includes(d)}
                    onChange={() => {
                      const next = chosen.includes(d) ? chosen.filter((x) => x !== d) : chosen.length >= 3 ? chosen : [...chosen, d];
                      if (!chosen.includes(d) && chosen.length >= 3) setErr('Choose up to three focus areas.');
                      else setErr('');
                      setFocus(next);
                    }}
                  />
                  <span>{DIMENSIONS[d].name}</span>
                </label>
              );
            })}
          </div>
          <Button onClick={saveFocus}>Save focus areas</Button>
        </Card>
      ) : null}

      {current === 'done' ? (
        <Card>
          <h2 className="card__title">{`Your ${year} plan is ready to build`}</h2>
          <p>One more thing. Would a short monthly email help you stay with it?</p>
          <CheckinOptIn />
          <div className="button-row">
            <Button onClick={() => navigate(`/plan/${year}`)}>{`Go to my ${year} plan`}</Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}
