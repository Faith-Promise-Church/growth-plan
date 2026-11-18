import { useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext.jsx';
import { Button, Dialog, Banner } from '../ui/index.jsx';
import { useToast } from '../ui/Toast.jsx';
import { DIMENSIONS } from '../../content/dimensions.js';
import { buildShareText, shareableDimensions, planWordVerse, SHARE_DAYS } from '../../lib/share.js';
import { listPlanShares, createPlanShare, revokePlanShare } from '../../data/api.js';
import { formatDate } from '../../lib/time.js';

async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the older way
  }
  try {
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    el.remove();
    return ok;
  } catch {
    return false;
  }
}

/**
 * "Share my plan". The person chooses which areas to include. Habits only, unless they add
 * their scores. They can hand a text summary to the phone's share sheet, or make a private
 * read-only link that stops working after SHARE_DAYS days or when they stop it.
 */
export default function SharePlan({ plan, goals, scores }) {
  const { user } = useAuth();
  const toast = useToast();
  const available = useMemo(() => shareableDimensions(plan, goals), [plan, goals]);
  const [open, setOpen] = useState(false);
  const [chosen, setChosen] = useState([]);
  const [withScores, setWithScores] = useState(false);
  const [withWordVerse, setWithWordVerse] = useState(true);
  // undefined: not loaded. null: links are not available. Array: this plan's active links.
  const [links, setLinks] = useState(undefined);
  const [error, setError] = useState('');

  if (!plan || !available.length) return null;

  const canUseShareSheet = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const wordVerse = planWordVerse(plan);
  const hasWordVerse = Boolean(wordVerse.word || wordVerse.verse);
  const text = buildShareText({ plan, goals, dimensions: chosen, scores: withScores ? scores : null, includeWordVerse: withWordVerse });
  const linkFor = (share) => `${window.location.origin}/shared/${share.id}`;

  function openDialog() {
    setChosen(available);
    setWithScores(false);
    setWithWordVerse(true);
    setError('');
    setOpen(true);
    listPlanShares(plan.id)
      .then(setLinks)
      .catch(() => setLinks(null));
  }

  function toggle(d) {
    setError('');
    setChosen((c) => (c.includes(d) ? c.filter((x) => x !== d) : [...c, d]));
  }

  async function share() {
    if (!chosen.length) {
      setError('Choose at least one area to share.');
      return;
    }
    if (canUseShareSheet) {
      try {
        await navigator.share({ title: `My ${plan.year} growth plan`, text });
      } catch {
        // The person closed the share sheet. Nothing to do.
      }
      return;
    }
    if (await copyText(text)) toast.show('Copied. Paste it into a text or an email.', { tone: 'success' });
    else setError('Copying did not work on this device. Select the text above and copy it.');
  }

  async function createLink() {
    if (!chosen.length) {
      setError('Choose at least one area to share.');
      return;
    }
    setError('');
    try {
      const row = await createPlanShare({ userId: user.id, planId: plan.id, dimensions: chosen, includeWordVerse: withWordVerse });
      setLinks((l) => [row, ...(l ?? [])]);
      if (await copyText(linkFor(row))) toast.show('Link created and copied.', { tone: 'success' });
    } catch (err) {
      setError(err.message);
    }
  }

  async function copyLink(row) {
    if (await copyText(linkFor(row))) toast.show('Link copied.', { tone: 'success' });
    else setError('Copying did not work on this device.');
  }

  async function stop(row) {
    setError('');
    try {
      await revokePlanShare(row.id);
      setLinks((l) => (l ?? []).filter((x) => x.id !== row.id));
      toast.show('That link no longer works.');
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Button variant="secondary" size="sm" onClick={openDialog}>
        Share
      </Button>
      <Dialog
        open={open}
        title="Share my plan"
        onClose={() => setOpen(false)}
        actions={
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Close
          </Button>
        }
      >
        <div className="share">
          <p className="muted">Choose the areas to share. Only your habits are included unless you add your scores.</p>
          <div className="chip-grid" role="group" aria-label="Areas to share">
            {available.map((d) => (
              <label key={d} className="chip chip--small" style={{ '--sel': `var(--${d}-ink)` }}>
                <input type="checkbox" checked={chosen.includes(d)} onChange={() => toggle(d)} />
                <span>{DIMENSIONS[d].name}</span>
              </label>
            ))}
          </div>
          {hasWordVerse ? (
            <label className="checkbox">
              <input type="checkbox" checked={withWordVerse} onChange={(e) => setWithWordVerse(e.target.checked)} />
              <span>Include my word and verse of the year</span>
            </label>
          ) : null}
          {scores ? (
            <label className="checkbox">
              <input type="checkbox" checked={withScores} onChange={(e) => setWithScores(e.target.checked)} />
              <span>Include my scores</span>
            </label>
          ) : null}
          <div className="share__preview" aria-live="polite">
            <span className="share__label">What will be shared</span>
            <pre>{text || 'Choose at least one area.'}</pre>
          </div>
          {error ? <Banner tone="error">{error}</Banner> : null}
          <div>
            <Button onClick={share}>{canUseShareSheet ? 'Share' : 'Copy to share'}</Button>
          </div>

          {links !== null ? (
            <section className="share__links" aria-labelledby="share-link-title">
              <h3 id="share-link-title">Or share a private link</h3>
              <p className="muted">
                {`Anyone with the link can read the habits in the areas you chose, with your first name${hasWordVerse && withWordVerse ? ' and your word and verse of the year' : ''}. It never shows scores, and it stops working after ${SHARE_DAYS} days.`}
              </p>
              {links?.length ? (
                <ul className="share__list">
                  {links.map((row) => (
                    <li key={row.id}>
                      <span>
                        {row.dimensions.map((d) => DIMENSIONS[d]?.name).join(', ')}
                        <span className="muted">{` · until ${formatDate(row.expires_at)}`}</span>
                      </span>
                      <span className="button-row">
                        <Button size="sm" variant="ghost" onClick={() => copyLink(row)}>
                          Copy link
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => stop(row)}>
                          Stop sharing
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <Button variant="secondary" size="sm" onClick={createLink} disabled={links === undefined}>
                Create a link
              </Button>
            </section>
          ) : null}
        </div>
      </Dialog>
    </>
  );
}
