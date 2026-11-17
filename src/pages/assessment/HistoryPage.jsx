import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listAssessments } from '../../data/api.js';
import { PageHeader, Card, LoadingBlock, EmptyState, Button, Banner } from '../../components/ui/index.jsx';
import { DIMENSION_ORDER } from '../../content/dimensions.js';
import { formatDate } from '../../lib/time.js';
import { round1 } from '../../lib/scoring.js';

function average(row) {
  const vals = DIMENSION_ORDER.map((d) => Number(row[`${d}_score`])).filter(Number.isFinite);
  return vals.length ? round1(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(1) : null;
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { data, loading, error, reload } = useAsync(() => listAssessments(user.id, 50), [user.id]);
  return (
    <div className="page">
      <PageHeader title="Assessment history" back={{ to: '/assessment', label: 'Assessment' }} />
      {loading && !data ? <LoadingBlock /> : null}
      {error ? (
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>
          Your history did not load.
        </Banner>
      ) : null}
      {data && !data.length ? (
        <EmptyState title="No assessments yet" action={<Button to="/assessment/take/1">Take the assessment</Button>} />
      ) : null}
      {data?.length ? (
        <Card>
          <ul className="link-list">
            {data.map((a) => (
              <li key={a.id}>
                <Link to={`/assessment/results/${a.id}`} className="link-list__item">
                  <span>{formatDate(a.assessment_date)}</span>
                  <span className="muted">{`Average flourishing ${average(a) ?? ''}`}</span>
                  <span className="link-list__arrow" aria-hidden="true">→</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </div>
  );
}
