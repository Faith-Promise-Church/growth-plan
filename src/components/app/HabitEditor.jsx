import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { Button, Banner } from '../ui/index.jsx';
import { CADENCES, LIMITS, composeHabitSentence, decodeCadence, encodeCadence } from '../../lib/habits.js';
import { getPractice } from '../../content/practices.js';
import { saveGoal, newId } from '../../data/api.js';

export const AUTOSAVE_MS = 600;

function draftFromGoal(goal) {
  const { cadence, cadenceText } = decodeCadence(goal?.cadence);
  if (goal?.practice_key || goal?.cadence) {
    // v2 habit: rebuild the parts from what was stored.
    return {
      what: whatFromSentence(goal.goal_text, cadence, cadenceText, goal.anchor),
      cadence: cadence ?? 'weekly',
      cadenceText,
      anchor: goal.anchor ?? '',
    };
  }
  // v1 goal: the whole text becomes "what", with no cadence.
  return { what: String(goal?.goal_text ?? '').replace(/\.\s*$/, ''), cadence: null, cadenceText: '', anchor: '' };
}

// Recover the "what" part from a stored sentence, so editing does not repeat the cadence.
function whatFromSentence(sentence, cadence, cadenceText, anchor) {
  let s = String(sentence ?? '').trim().replace(/\.\s*$/, '');
  const phrase = CADENCES.find((c) => c.value === cadence)?.phrase || (cadence === 'other' ? cadenceText : '');
  if (phrase && s.toLowerCase().endsWith(` ${phrase.toLowerCase()}`)) s = s.slice(0, -(phrase.length + 1));
  if (anchor && s.toLowerCase().startsWith(`${anchor.toLowerCase()}, `)) {
    s = s.slice(anchor.length + 2);
    s = s.charAt(0).toUpperCase() + s.slice(1);
  }
  return s;
}

/**
 * Edits one habit. A new habit (not yet saved) shows "Add to my plan". After that, and for
 * existing habits, every change autosaves after 600ms and on close.
 */
export default function HabitEditor({ goal, initialDraft, isNew = false, onSaved, onClose, autoFocus = true }) {
  const formId = useId();
  const [draft, setDraft] = useState(() => initialDraft ?? draftFromGoal(goal));
  const [saved, setSaved] = useState(!isNew);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const timer = useRef(null);
  const pending = useRef(null);
  const latestGoal = useRef(goal);
  const firstInput = useRef(null);

  const sentence = composeHabitSentence(draft);
  const practice = getPractice(goal?.practice_key);

  useEffect(() => {
    if (autoFocus) firstInput.current?.focus();
  }, [autoFocus]);

  const buildRow = useCallback(
    (d) => {
      const g = latestGoal.current;
      return {
        ...g,
        id: g.id ?? newId(),
        goal_name: g.goal_name?.trim() ? g.goal_name : practice?.name ?? d.what.slice(0, 60),
        goal_text: composeHabitSentence(d).slice(0, LIMITS.goalText),
        cadence: d.cadence ? encodeCadence(d.cadence, d.cadenceText) : g.cadence ?? null,
        anchor: d.anchor.trim() ? d.anchor.trim().slice(0, LIMITS.anchor) : null,
        status: g.status ?? 'active',
      };
    },
    [practice],
  );

  // Saves run one after another, in the order they were asked for, so an older save can never
  // land after a newer one. The latest onSaved is read from a ref so a parent re-render never
  // re-runs anything.
  const queue = useRef(Promise.resolve());
  const onSavedRef = useRef(onSaved);
  const mounted = useRef(true);
  useEffect(() => {
    onSavedRef.current = onSaved;
  }, [onSaved]);

  const persist = useCallback(
    (d) => {
      if (!d.what.trim()) return Promise.resolve(false);
      const row = buildRow(d);
      const run = async () => {
        if (mounted.current) {
          setStatus('saving');
          setError('');
        }
        try {
          const savedRow = await saveGoal(row);
          latestGoal.current = { ...latestGoal.current, ...savedRow };
          if (mounted.current) setStatus('saved');
          onSavedRef.current?.(savedRow);
          return true;
        } catch {
          if (mounted.current) {
            setStatus('error');
            setError('Your change was not saved. Your text is still here.');
          }
          return false;
        }
      };
      const next = queue.current.then(run, run);
      queue.current = next;
      return next;
    },
    [buildRow],
  );

  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  // Debounced autosave once the habit exists.
  function change(patch) {
    setDraft((d) => {
      const next = { ...d, ...patch };
      if (saved) {
        pending.current = next;
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const toSave = pending.current;
          pending.current = null;
          if (toSave) persistRef.current(toSave);
        }, AUTOSAVE_MS);
        setStatus('editing');
      }
      return next;
    });
  }

  // Flush on unmount only.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
      const toSave = pending.current;
      pending.current = null;
      if (toSave) persistRef.current(toSave);
    };
  }, []);

  async function add() {
    if (!draft.what.trim()) {
      setError('Describe what you will do.');
      return;
    }
    if (await persist(draft)) setSaved(true);
  }

  function close() {
    clearTimeout(timer.current);
    const toSave = pending.current;
    pending.current = null;
    if (toSave) persist(toSave);
    onClose?.();
  }

  return (
    <div className="habit-editor" role="group" aria-labelledby={`${formId}-title`}>
      <h3 id={`${formId}-title`} className="habit-editor__title">
        {isNew && !saved ? 'Add a habit' : 'Edit habit'}
        {practice ? <span className="muted">{` (${practice.name})`}</span> : null}
      </h3>
      <div className="field">
        <label className="field__label" htmlFor={`${formId}-what`}>
          What I will do
        </label>
        <textarea
          ref={firstInput}
          id={`${formId}-what`}
          className="input textarea"
          rows={2}
          maxLength={LIMITS.what}
          value={draft.what}
          onChange={(e) => change({ what: e.target.value })}
        />
      </div>
      <fieldset className="chips-field">
        <legend className="field__label">How often</legend>
        <div className="chips">
          {CADENCES.map((c) => (
            <label key={c.value} className="chip chip--small">
              <input type="radio" name={`${formId}-cadence`} checked={draft.cadence === c.value} onChange={() => change({ cadence: c.value })} />
              <span>{c.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      {draft.cadence === 'other' ? (
        <div className="field">
          <label className="field__label" htmlFor={`${formId}-other`}>
            How often, in your words
          </label>
          <input
            id={`${formId}-other`}
            className="input"
            maxLength={LIMITS.cadenceText}
            placeholder="twice a month"
            value={draft.cadenceText}
            onChange={(e) => change({ cadenceText: e.target.value })}
          />
        </div>
      ) : null}
      <div className="field">
        <label className="field__label" htmlFor={`${formId}-anchor`}>
          When or where (optional)
        </label>
        <input
          id={`${formId}-anchor`}
          className="input"
          maxLength={LIMITS.anchor}
          placeholder="After my morning coffee"
          value={draft.anchor}
          onChange={(e) => change({ anchor: e.target.value })}
        />
      </div>
      <div className="habit-editor__preview" aria-live="polite">
        <span className="muted">Your habit</span>
        <p>{sentence || 'Start typing above to see your habit.'}</p>
      </div>
      {status === 'error' ? (
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={() => persist(draft)}>Try again</Button>}>
          {error}
        </Banner>
      ) : error ? (
        <Banner tone="error">{error}</Banner>
      ) : null}
      <div className="habit-editor__actions">
        {isNew && !saved ? (
          <>
            <Button onClick={add} disabled={!draft.what.trim()}>
              Add to my plan
            </Button>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </>
        ) : (
          <>
            <span className="save-state" aria-live="polite">
              {status === 'saving' ? 'Saving' : status === 'saved' ? 'Saved' : status === 'editing' ? 'Editing' : ''}
            </span>
            <Button variant="secondary" onClick={close}>
              Done
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
