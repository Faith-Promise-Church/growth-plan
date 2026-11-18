import { useState } from 'react';
import { Button, Card, Field, Banner } from '../ui/index.jsx';
import { useToast } from '../ui/Toast.jsx';
import { updatePlan } from '../../data/api.js';
import { WORD_MAX, VERSE_MAX, planWordVerse } from '../../lib/share.js';

/**
 * A small place on the plan for a word of the year and the reference for a verse of the year.
 * Both are optional. On a plan from an earlier year it only shows what was set.
 */
export default function PlanWordVerse({ plan, readOnly = false, onSaved }) {
  const toast = useToast();
  const current = planWordVerse(plan);
  const [editing, setEditing] = useState(false);
  const [word, setWord] = useState('');
  const [verse, setVerse] = useState('');
  const [error, setError] = useState('');

  // The columns arrive with a migration. Until then there is nowhere to save, so show nothing.
  if (!plan || !('word_of_year' in plan)) return null;
  const hasAny = Boolean(current.word || current.verse);
  if (readOnly && !hasAny) return null;

  function start() {
    setWord(current.word ?? '');
    setVerse(current.verse ?? '');
    setError('');
    setEditing(true);
  }

  async function save() {
    setError('');
    try {
      await updatePlan(plan.id, { word_of_year: word.trim() || null, verse_of_year: verse.trim() || null });
      setEditing(false);
      toast.show('Saved.', { tone: 'success' });
      onSaved?.();
    } catch {
      setError('That was not saved. Check your connection and try again.');
    }
  }

  if (editing) {
    return (
      <Card className="word-verse">
        <h2 className="card__title">Word and verse of the year</h2>
        <div className="word-verse__fields">
          <Field label="Word of the year" hint="One word to come back to all year.">
            {(a) => <input {...a} className="input" value={word} maxLength={WORD_MAX} onChange={(e) => setWord(e.target.value)} />}
          </Field>
          <Field label="Verse of the year" hint="The reference, like Galatians 6:9.">
            {(a) => <input {...a} className="input" value={verse} maxLength={VERSE_MAX} onChange={(e) => setVerse(e.target.value)} />}
          </Field>
        </div>
        {error ? <Banner tone="error">{error}</Banner> : null}
        <div className="button-row">
          <Button variant="secondary" onClick={save}>
            Save
          </Button>
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </Card>
    );
  }

  if (!hasAny) {
    return (
      <Card className="word-verse row-card">
        <div>
          <h2 className="card__title">Word and verse of the year</h2>
          <p className="muted">One word and one verse to come back to all year.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={start} aria-label="Add a word and verse of the year">
          Add
        </Button>
      </Card>
    );
  }

  return (
    <Card className="word-verse row-card">
      <dl className="word-verse__values">
        {current.word ? (
          <div>
            <dt>Word of the year</dt>
            <dd className="word-verse__word">{current.word}</dd>
          </div>
        ) : null}
        {current.verse ? (
          <div>
            <dt>Verse of the year</dt>
            <dd className="word-verse__verse">{current.verse}</dd>
          </div>
        ) : null}
      </dl>
      {readOnly ? null : (
        <Button variant="ghost" size="sm" onClick={start} aria-label="Edit word and verse of the year">
          Edit
        </Button>
      )}
    </Card>
  );
}
