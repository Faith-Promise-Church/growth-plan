import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Button, Stepper, ScaleInput, FrequencyInput, Banner } from '../../components/ui/index.jsx';
import { DIMENSION_ORDER, DIMENSIONS, dimensionIcon } from '../../content/dimensions.js';
import { FLOURISHING_QUESTIONS, FLOURISHING_SCALE, HABIT_ITEMS, HABIT_STEM } from '../../content/assessment.js';
import { loadDraft, saveDraft, clearDraft, emptyDraft, isStepComplete, completedSteps } from '../../lib/draft.js';
import { buildAssessmentRow } from '../../lib/scoring.js';
import { insertAssessment } from '../../data/api.js';

export default function AssessmentTake() {
  const { step: stepParam } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(() => loadDraft(user.id) ?? emptyDraft());
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const headingRef = useRef(null);

  const step = Number(stepParam);
  const valid = Number.isInteger(step) && step >= 1 && step <= 7;
  const dimension = valid ? DIMENSION_ORDER[step - 1] : null;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  if (!valid) return <Navigate to="/assessment/take/1" replace />;
  // You cannot skip ahead past an unfinished step.
  const firstOpen = completedSteps(draft) + 1;
  if (step > firstOpen) return <Navigate to={`/assessment/take/${firstOpen}`} replace />;

  const data = DIMENSIONS[dimension];
  const complete = isStepComplete(draft, dimension);
  const isLast = step === 7;

  function update(kind, k, v) {
    setDraft((d) => {
      const next = { ...d, [kind]: { ...d[kind], [k]: v } };
      saveDraft(user.id, next);
      return next;
    });
  }

  async function finish() {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    setSaveError('');
    try {
      const row = buildAssessmentRow({ userId: user.id, flourishing: draft.flourishing, habits: draft.habits });
      const saved = await insertAssessment(row);
      clearDraft(user.id);
      navigate(`/assessment/results/${saved.id}`, { replace: true, state: { justSaved: true } });
    } catch (err) {
      setSaveError(err?.message?.startsWith('Missing answer') ? 'Some answers are missing. Go back and finish each step.' : 'Your answers were not saved. They are still here on this device. Check your connection and try again.');
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  }

  let qNumber = 0;
  return (
    <div className="page assessment-step" style={{ '--dim': `var(--${dimension})`, '--dim-ink': `var(--${dimension}-ink)`, '--dim-on': `var(--${dimension}-on)` }}>
      <Stepper current={step} total={7} label="Flourishing assessment" />
      <div className="dim-band">
        <img src={dimensionIcon(dimension, 'inverse')} alt="" width="56" height="56" />
        <h1 className="dim-band__title" tabIndex={-1} ref={headingRef}>
          {data.name}
        </h1>
      </div>

      <section className="assessment-section" aria-labelledby={`how-${dimension}`}>
        <h2 id={`how-${dimension}`} className="section-title">How life is going</h2>
        <p className="muted">Choose how much you agree with each statement.</p>
        {FLOURISHING_QUESTIONS[dimension].map((q) => {
          qNumber += 1;
          return (
            <ScaleInput
              key={q.column}
              name={q.column}
              number={qNumber}
              legend={q.text}
              value={draft.flourishing[q.column]}
              onChange={(v) => update('flourishing', q.column, v)}
              lowLabel={FLOURISHING_SCALE.lowLabel}
              highLabel={FLOURISHING_SCALE.highLabel}
              dimension={dimension}
            />
          );
        })}
      </section>

      <section className="assessment-section" aria-labelledby={`practice-${dimension}`}>
        <h2 id={`practice-${dimension}`} className="section-title">What you are practicing</h2>
        <p className="muted">{HABIT_STEM}</p>
        {HABIT_ITEMS[dimension].map((h) => (
          <FrequencyInput
            key={h.key}
            name={h.key}
            legend={h.text}
            value={draft.habits[h.key]}
            onChange={(v) => update('habits', h.key, v)}
            dimension={dimension}
          />
        ))}
      </section>

      {saveError ? (
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={finish}>Try again</Button>}>
          {saveError}
        </Banner>
      ) : null}

      <div className="step-nav">
        <Button variant="secondary" onClick={() => navigate(step === 1 ? '/assessment' : `/assessment/take/${step - 1}`)}>
          Back
        </Button>
        {isLast ? (
          <Button onClick={finish} disabled={!complete || completedSteps(draft) < 7} loading={saving}>
            See my results
          </Button>
        ) : (
          <Button onClick={() => navigate(`/assessment/take/${step + 1}`)} disabled={!complete}>
            Next
          </Button>
        )}
      </div>
      {!complete ? <p className="muted step-hint">Answer every question in this step to continue.</p> : null}
    </div>
  );
}
