import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button, Card, ExternalLink } from '../ui/index.jsx';
import { getSuggestions } from '../../lib/helper.js';
import { starterSentence } from '../../lib/habits.js';
import { practicesFor } from '../../content/practices.js';
import { links, hasLink } from '../../content/links.js';

const dismissKey = (userId, dimension) => `gp-helper-dismissed:${userId}:${dimension}`;

function loadDismissed(userId, dimension) {
  try {
    return JSON.parse(localStorage.getItem(dismissKey(userId, dimension)) || '[]');
  } catch {
    return [];
  }
}

const SIZE_LABEL = { small: 'A small start', steady: 'A steady step', stretch: 'A stretch' };

/**
 * The Helper for one dimension. It only offers. "Add to my plan" calls onAdd(practice, size),
 * which opens the habit editor prefilled; nothing is saved until the person confirms there.
 */
export default function HelperPanel({ userId, dimension, scores, habitResponses, goals, isFocus, focusCount, onAdd, onWriteOwn }) {
  const [dismissed, setDismissed] = useState(() => loadDismissed(userId, dimension));
  const [showLibrary, setShowLibrary] = useState(false);
  const result = getSuggestions({
    dimension,
    flourishing: scores?.flourishing ?? null,
    habitScore: scores?.habit ?? null,
    habitResponses: habitResponses ?? null,
    goals,
    isFocus,
    dismissed,
    focusCount,
  });

  function notForMe(key) {
    const next = [...new Set([...dismissed, key])];
    setDismissed(next);
    try {
      localStorage.setItem(dismissKey(userId, dimension), JSON.stringify(next));
    } catch {
      // ignore
    }
  }

  function resetDismissed() {
    setDismissed([]);
    try {
      localStorage.removeItem(dismissKey(userId, dimension));
    } catch {
      // ignore
    }
  }

  return (
    <Card className="helper" aria-labelledby={`helper-${dimension}`}>
      <h2 id={`helper-${dimension}`} className="card__title">
        Helper
      </h2>
      <p>{result.lead}</p>
      {result.notes.map((n) => (
        <p key={n} className="note">
          {n}
        </p>
      ))}
      {result.showCare && hasLink('care') ? (
        <p>
          <ExternalLink href={links.care} className="text-link">
            Talk with someone from our care team
          </ExternalLink>
        </p>
      ) : null}
      {result.inviteAssessment ? (
        <p>
          <Link className="text-link" to="/assessment">
            Take the assessment for suggestions that fit you
          </Link>
        </p>
      ) : null}

      <ul className="suggestions">
        {result.suggestions.map((sg) => (
          <li key={sg.key} className="suggestion">
            <div className="suggestion__head">
              <h3 className="suggestion__name">{sg.practice.name}</h3>
              {sg.recommended ? <span className="tag tag--brand">Recommended by Faith Promise</span> : null}
            </div>
            <p className="muted">{sg.practice.why}</p>
            <p className="suggestion__starter">
              <span className="suggestion__size">{SIZE_LABEL[sg.size]}:</span> {starterSentence(sg.practice, sg.size)}
            </p>
            <div className="button-row">
              <Button size="sm" variant="secondary" onClick={() => onAdd(sg.practice, sg.size)}>
                Add to my plan
              </Button>
              {sg.offerAsIs ? (
                <Button size="sm" variant="ghost" onClick={() => onAdd(sg.practice, 'steady')}>
                  Add my current rhythm
                </Button>
              ) : null}
              <Button size="sm" variant="ghost" onClick={() => notForMe(sg.key)}>
                Not for me
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {!result.suggestions.length ? <p className="muted">You have added everything the Helper would suggest here.</p> : null}

      <div className="button-row">
        <Button size="sm" variant="ghost" onClick={() => setShowLibrary((v) => !v)} aria-expanded={showLibrary}>
          {showLibrary ? 'Fewer ideas' : 'More ideas'}
        </Button>
        <Button size="sm" variant="ghost" onClick={onWriteOwn}>
          Write my own
        </Button>
        {dismissed.length ? (
          <Button size="sm" variant="ghost" onClick={resetDismissed}>
            Show hidden ideas
          </Button>
        ) : null}
      </div>

      {showLibrary ? (
        <ul className="library">
          {practicesFor(dimension).map((p) => (
            <li key={p.key} className="library__item">
              <div>
                <p className="library__name">
                  {p.name}
                  {p.core ? <span className="tag tag--brand">Recommended by Faith Promise</span> : null}
                </p>
                <p className="muted">{starterSentence(p, 'small')}</p>
              </div>
              <Button size="sm" variant="secondary" onClick={() => onAdd(p, 'small')}>
                Add
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
    </Card>
  );
}
