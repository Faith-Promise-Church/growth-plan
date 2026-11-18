import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { listPlans, listGoals } from '../../data/api.js';
import { PageHeader, Card, LoadingBlock, EmptyState, Button, Banner } from '../../components/ui/index.jsx';
import { activeHabits } from '../../lib/habits.js';
import { currentPlanYear } from '../../lib/time.js';

// Every plan the person has made, newest first.
export default function PlanHistoryPage() {
  const { user } = useAuth();
  const thisYear = currentPlanYear();
  const { data, loading, error, reload } = useAsync(async () => {
    const plans = await listPlans(user.id);
    const sorted = [...plans].sort((a, b) => b.year - a.year);
    const counts = await Promise.all(sorted.map((p) => listGoals(p.id).then((goals) => activeHabits(goals).length)));
    return sorted.map((p, i) => ({ ...p, habits: counts[i] }));
  }, [user.id]);

  return (
    <div className="page">
      <PageHeader title="Plan history" back={{ to: `/plan/${thisYear}`, label: `${thisYear} plan` }} />
      {loading && !data ? <LoadingBlock /> : null}
      {error ? (
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>
          Your plans did not load.
        </Banner>
      ) : null}
      {data && !data.length ? (
        <EmptyState title="No plans yet" action={<Button to={`/plan/${thisYear}`}>{`Go to my ${thisYear} plan`}</Button>} />
      ) : null}
      {data?.length ? (
        <Card>
          <ul className="link-list">
            {data.map((p) => (
              <li key={p.id}>
                <Link to={`/plan/${p.year}`} className="link-list__item">
                  <span>
                    {`${p.year} plan`}
                    {p.year === thisYear ? <span className="tag">This year</span> : null}
                  </span>
                  <span className="muted">{p.habits === 1 ? '1 habit' : `${p.habits} habits`}</span>
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
