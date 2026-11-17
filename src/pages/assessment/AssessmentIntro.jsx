import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listAssessments } from '../../data/api.js';
import { Button, Card, PageHeader, useConfirm, LoadingBlock } from '../../components/ui/index.jsx';
import { HARVARD_ATTRIBUTION, HARVARD_SOURCE_URL } from '../../content/assessment.js';
import { loadDraft, clearDraft, hasAnyAnswer, completedSteps } from '../../lib/draft.js';
import { formatDate } from '../../lib/time.js';

export function Attribution() {
  return (
    <p className="attribution">
      {HARVARD_ATTRIBUTION}{' '}
      <a href={HARVARD_SOURCE_URL} target="_blank" rel="noopener noreferrer">
        About the Flourishing measure
      </a>
    </p>
  );
}

export default function AssessmentIntro() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [confirm, confirmDialog] = useConfirm();
  const { data: assessments, loading } = useAsync(() => listAssessments(user.id, 1), [user.id]);
  const draft = loadDraft(user.id);
  const resumable = hasAnyAnswer(draft);
  const latest = assessments?.[0];

  async function startOver() {
    const ok = await confirm({
      title: 'Start over?',
      body: 'This clears the answers you have given so far.',
      confirmLabel: 'Start over',
      danger: true,
    });
    if (ok) {
      clearDraft(user.id);
      navigate('/assessment/take/1');
    }
  }

  return (
    <div className="page">
      <PageHeader
        title="Flourishing assessment"
        lead="Seven short steps, one for each area of life. Each step asks how life is going and what you are practicing right now."
      />
      <Card>
        <h2 className="card__title">How it works</h2>
        <ul className="plain-list">
          <li>Answer each question honestly. There are no right answers.</li>
          <li>It takes about ten minutes, and your answers are saved on this device as you go.</li>
          <li>At the end you will see where you are strong, where to start, and two suggested focus areas.</li>
        </ul>
        <div className="button-row">
          {resumable ? (
            <>
              <Button to={`/assessment/take/${Math.min(7, completedSteps(draft) + 1)}`}>Keep going</Button>
              <Button variant="secondary" onClick={startOver}>
                Start over
              </Button>
            </>
          ) : (
            <Button to="/assessment/take/1">Start the assessment</Button>
          )}
        </div>
      </Card>

      {loading ? (
        <LoadingBlock />
      ) : latest ? (
        <Card className="row-card">
          <div>
            <h2 className="card__title">Your latest results</h2>
            <p className="muted">{`Taken ${formatDate(latest.assessment_date)}`}</p>
          </div>
          <div className="button-row">
            <Button variant="secondary" to={`/assessment/results/${latest.id}`}>
              See results
            </Button>
            <Button variant="ghost" to="/assessment/history">
              History
            </Button>
          </div>
        </Card>
      ) : null}

      <Attribution />
      {confirmDialog}
    </div>
  );
}
