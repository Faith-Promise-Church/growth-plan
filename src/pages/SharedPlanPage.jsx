import { useParams } from 'react-router-dom';
import { useAsync } from '../hooks/useAsync.js';
import { fetchSharedPlan } from '../data/api.js';
import { Card, PageHeader, LoadingBlock, EmptyState, DimensionTile } from '../components/ui/index.jsx';
import { DIMENSIONS } from '../content/dimensions.js';
import { formatDate } from '../lib/time.js';

// The page behind a private link. Read-only, and it works signed out.
export default function SharedPlanPage() {
  const { id } = useParams();
  const { data, loading, error } = useAsync(() => fetchSharedPlan(id), [id]);

  if (loading && !data) return <div className="page"><LoadingBlock label="Loading the plan" /></div>;
  if (error || !data) {
    return (
      <div className="page">
        <EmptyState title="This link is no longer active">
          <p>Ask the person who shared it to send you a new one.</p>
        </EmptyState>
      </div>
    );
  }

  const owner = data.firstName ? `${data.firstName}'s` : 'A';
  return (
    <div className="page">
      <PageHeader
        title={`${owner} ${data.year} growth plan`}
        lead={`Shared with you from the Growth Plan Builder. This link works until ${formatDate(data.expiresAt)}.`}
      />
      {data.groups.map((group) => (
        <Card key={group.dimension} accent={group.dimension}>
          <div className="plan-card__head">
            <DimensionTile dimension={group.dimension} size={36} />
            <h2 className="plan-card__name">{DIMENSIONS[group.dimension]?.name}</h2>
          </div>
          <ul className="plan-card__habits">
            {group.habits.map((habit) => (
              <li key={habit}>{habit}</li>
            ))}
          </ul>
        </Card>
      ))}
      {!data.groups.length ? (
        <EmptyState title="There are no habits to show right now" />
      ) : (
        <p className="muted">A plan is easier to keep with someone beside you. Ask how it is going.</p>
      )}
    </div>
  );
}
