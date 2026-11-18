import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listAssessments, getPlan, ensurePlan, updatePlan } from '../../data/api.js';
import { Button, Card, PageHeader, LoadingBlock, Banner, DimensionTile, EmptyState, ExternalLink } from '../../components/ui/index.jsx';
import { useToast } from '../../components/ui/Toast.jsx';
import Wheel from '../../components/app/Wheel.jsx';
import { Attribution } from './AssessmentIntro.jsx';
import { DIMENSION_ORDER, DIMENSIONS } from '../../content/dimensions.js';
import { CARE_COLUMNS, CARE_THRESHOLD } from '../../content/assessment.js';
import { links, hasLink } from '../../content/links.js';
import { scoresFromRow, getRead, formatScore, formatChange, suggestFocus } from '../../lib/scoring.js';
import { currentPlanYear, formatDate } from '../../lib/time.js';

function Change({ current, previous }) {
  const c = formatChange(current, previous);
  if (!c) return null;
  return <span className={`change ${c.diff > 0 ? 'change--up' : c.diff < 0 ? 'change--down' : ''}`}>{c.label}</span>;
}

function FocusChooser({ scores, assessmentId }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const year = currentPlanYear();
  const suggested = suggestFocus(scores, 2);
  const [choice, setChoice] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let live = true;
    getPlan(user.id, year)
      .then((plan) => live && setChoice(plan?.focus_dimensions?.length ? plan.focus_dimensions : suggested))
      .catch(() => live && setChoice(suggested));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id, year, assessmentId]);

  function toggle(d) {
    setError('');
    setChoice((c) => {
      if (c.includes(d)) return c.filter((x) => x !== d);
      if (c.length >= 3) {
        setError('Choose up to three focus areas.');
        return c;
      }
      return [...c, d];
    });
  }

  async function save() {
    if (!choice?.length) {
      setError('Choose at least one focus area.');
      return;
    }
    try {
      const plan = await ensurePlan(user.id, year);
      await updatePlan(plan.id, { focus_dimensions: choice });
      toast.show('Your focus areas are saved.', { tone: 'success' });
      navigate(`/plan/${year}`);
    } catch (err) {
      setError(err.message);
    }
  }

  if (!choice) return <LoadingBlock />;

  return (
    <Card id="focus" className="focus-chooser">
      <h2 className="card__title">Choose your focus areas</h2>
      <p>
        We suggest starting with{' '}
        <strong>{suggested.map((d) => DIMENSIONS[d].name).join(' and ')}</strong>, where your flourishing scores are lowest. Keep these or choose up to three of your own.
      </p>
      <div className="chip-grid" role="group" aria-label="Focus areas">
        {DIMENSION_ORDER.map((d) => (
          <label key={d} className="chip" style={{ '--sel': `var(--${d}-ink)` }}>
            <input type="checkbox" checked={choice.includes(d)} onChange={() => toggle(d)} />
            <span>
              {DIMENSIONS[d].name}
              {suggested.includes(d) ? <span className="chip__note"> (suggested)</span> : null}
            </span>
          </label>
        ))}
      </div>
      {error ? <Banner tone="error">{error}</Banner> : null}
      <Button onClick={save}>Save and build my plan</Button>
    </Card>
  );
}

export default function ResultsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const { data: assessments, loading, error, reload } = useAsync(() => listAssessments(user.id, 50), [user.id]);

  useEffect(() => {
    if (location.hash === '#focus' && assessments) {
      document.getElementById('focus')?.scrollIntoView({ block: 'start' });
    }
  }, [location.hash, assessments]);

  if (loading && !assessments) return <div className="page"><LoadingBlock /></div>;
  if (error) {
    return (
      <div className="page">
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>
          Your results did not load.
        </Banner>
      </div>
    );
  }
  const index = assessments.findIndex((a) => a.id === id);
  if (index < 0) {
    return (
      <div className="page">
        <EmptyState title="We could not find those results" action={<Button to="/assessment">Go to the assessment</Button>} />
      </div>
    );
  }
  const row = assessments[index];
  const prevRow = assessments[index + 1] ?? null;
  const scores = scoresFromRow(row);
  const prev = scoresFromRow(prevRow);
  const isV2 = row.version === 2 && row.habit_scores;
  const isLatest = index === 0;
  const needsCare = CARE_COLUMNS.some((c) => Number(row[c]) <= CARE_THRESHOLD);
  const flourishing = Object.fromEntries(DIMENSION_ORDER.map((d) => [d, scores[d].flourishing]));
  const prevFlourishing = prev ? Object.fromEntries(DIMENSION_ORDER.map((d) => [d, prev[d].flourishing])) : null;

  return (
    <div className="page page--wide">
      <div className="page-main">
        <PageHeader
          title="Your results"
          lead={`Taken ${formatDate(row.assessment_date)}${prevRow ? `. Changes are compared with ${formatDate(prevRow.assessment_date)}.` : '.'}`}
          back={{ to: '/assessment', label: 'Assessment' }}
        />
        {location.state?.justSaved ? <Banner tone="success">Your answers are saved.</Banner> : null}

        {!isV2 ? (
          <Banner tone="info">This assessment was taken before the habits questions were added, so it shows flourishing scores only.</Banner>
        ) : null}

        <Card className="results-wheel results-wheel--inline">
          <h2 className="card__title">Your wheel</h2>
          <Wheel scores={flourishing} previous={prevFlourishing} size={300} />
        </Card>

        <div className="results-grid">
          {DIMENSION_ORDER.map((d) => {
            const s = scores[d];
            const read = isV2 ? getRead(s.flourishing, s.habit) : null;
            return (
              <Card key={d} accent={d} className="result-card">
                <div className="result-card__head">
                  <DimensionTile dimension={d} size={36} />
                  <h2 className="result-card__name">{DIMENSIONS[d].name}</h2>
                </div>
                <dl className="result-card__scores">
                  <div>
                    <dt>Flourishing</dt>
                    <dd>
                      <span className="big-number">{formatScore(s.flourishing)}</span>
                      <Change current={s.flourishing} previous={prev?.[d]?.flourishing} />
                    </dd>
                  </div>
                  {isV2 ? (
                    <div>
                      <dt>Habits</dt>
                      <dd>
                        <span className="big-number">{formatScore(s.habit)}</span>
                        <Change current={s.habit} previous={prev?.[d]?.habit} />
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {read ? (
                  <div className="result-card__read">
                    <p className="read">{read.label}</p>
                    <p className="read-note">{read.meaning}</p>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>

        {needsCare ? (
          <Card className="care-card">
            <h2 className="card__title">You do not have to walk through this alone</h2>
            <p>Some of your answers suggest this may be a hard season. Our care team would be glad to listen and pray with you.</p>
            {hasLink('care') ? (
              <ExternalLink className="btn btn--secondary" href={links.care}>
                Talk with someone from our care team
              </ExternalLink>
            ) : null}
          </Card>
        ) : null}

        {isLatest ? <FocusChooser scores={scores} assessmentId={row.id} /> : (
          <p className="muted">
            These are earlier results. <Link to={`/assessment/results/${assessments[0].id}`}>See your latest results</Link>
          </p>
        )}
      </div>
      <aside className="page-rail">
        <Card className="results-wheel results-wheel--rail">
          <h2 className="card__title">Your wheel</h2>
          <Wheel scores={flourishing} previous={prevFlourishing} size={280} />
        </Card>
      </aside>
      <Attribution />
    </div>
  );
}
