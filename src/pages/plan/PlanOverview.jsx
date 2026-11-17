import { Navigate, useParams } from 'react-router-dom';
import { usePlanData } from '../../hooks/useUserData.js';
import { Button, Card, PageHeader, LoadingBlock, Banner, EmptyState, DimensionTile } from '../../components/ui/index.jsx';
import CheckinOptIn from '../../components/app/CheckinOptIn.jsx';
import { DIMENSIONS } from '../../content/dimensions.js';
import { scoresFromRow, formatScore } from '../../lib/scoring.js';
import { visibleGoals, activeHabits, groupByDimension, orderedDimensions } from '../../lib/habits.js';
import { isValidPlanYear, currentPlanYear } from '../../lib/time.js';

export default function PlanOverview() {
  const { year: yearParam } = useParams();
  const year = Number(yearParam);
  const { data, loading, error, reload } = usePlanData(isValidPlanYear(year) ? year : currentPlanYear(), { withCheckins: true });

  if (!isValidPlanYear(year)) return <Navigate to={`/plan/${currentPlanYear()}`} replace />;
  if (loading && !data) return <div className="page"><LoadingBlock /></div>;
  if (error && !data) {
    return (
      <div className="page">
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>
          Your plan did not load.
        </Banner>
      </div>
    );
  }

  const { plan, goals, latest } = data;
  if (!plan) {
    const hasEarlier = data.plans.some((p) => p.year < year);
    return (
      <div className="page">
        <PageHeader title={`Your ${year} growth plan`} />
        <EmptyState
          title="You have not started this plan yet"
          action={<Button to={hasEarlier ? `/plan/${year}/start` : latest ? `/assessment/results/${latest.id}#focus` : '/assessment'}>{hasEarlier ? `Start your ${year} plan` : latest ? 'Choose focus areas' : 'Take the assessment first'}</Button>}
        >
          <p>{latest ? 'Choose two or three focus areas, then add a habit or two in each.' : 'The assessment shows where to start. It takes about ten minutes.'}</p>
        </EmptyState>
      </div>
    );
  }

  const scores = scoresFromRow(latest);
  const focus = plan.focus_dimensions ?? [];
  const byDim = groupByDimension(visibleGoals(goals));
  const activeCount = activeHabits(goals).length;

  return (
    <div className="page page--wide">
      <div className="page-main">
        <PageHeader
          title={`Your ${year} growth plan`}
          lead={activeCount ? `${activeCount === 1 ? '1 active habit' : `${activeCount} active habits`} across your plan.` : 'Add a habit or two in your focus areas to get started.'}
          actions={
            <Button variant="secondary" size="sm" to={`/plan/${year}/print`}>
              Print
            </Button>
          }
        />
        {focus.length ? (
          <p className="focus-line">
            <span className="muted">Focus areas: </span>
            {focus.map((d) => DIMENSIONS[d]?.name).join(', ')}
          </p>
        ) : latest ? (
          <Banner tone="info" action={<Button size="sm" variant="secondary" to={`/assessment/results/${latest.id}#focus`}>Choose focus areas</Button>}>
            You have not chosen focus areas for this plan yet.
          </Banner>
        ) : null}

        <div className="plan-grid">
          {orderedDimensions(focus).map((d) => {
            const list = byDim[d];
            const s = scores?.[d];
            return (
              <Card key={d} accent={d} className={`plan-card${focus.includes(d) ? ' plan-card--focus' : ''}`}>
                <div className="plan-card__head">
                  <DimensionTile dimension={d} size={36} />
                  <h2 className="plan-card__name">{DIMENSIONS[d].name}</h2>
                  {focus.includes(d) ? <span className="tag">Focus</span> : null}
                </div>
                <p className="plan-card__scores muted">
                  {s?.flourishing != null ? `Flourishing ${formatScore(s.flourishing)}` : 'No assessment yet'}
                  {s?.habit != null ? ` · Habits ${formatScore(s.habit)}` : ''}
                  {` · ${list.length === 1 ? '1 habit' : `${list.length} habits`}`}
                </p>
                {list.length ? (
                  <ul className="plan-card__habits">
                    {list.slice(0, 2).map((g) => (
                      <li key={g.id} className={g.status !== 'active' ? 'is-inactive' : ''}>
                        {g.goal_text}
                      </li>
                    ))}
                    {list.length > 2 ? <li className="muted">{`and ${list.length - 2} more`}</li> : null}
                  </ul>
                ) : null}
                <Button variant="secondary" size="sm" to={`/plan/${year}/${d}`} aria-label={`Edit ${DIMENSIONS[d].name}`}>
                  Edit
                </Button>
              </Card>
            );
          })}
        </div>
      </div>
      <aside className="page-rail">
        {activeCount ? (
          <Card>
            <h2 className="card__title">Stay on track</h2>
            {!data.prefs?.monthly_checkin ? (
              <>
                <p className="muted">A short email on the first Monday of each month brings you back to your plan.</p>
                <CheckinOptIn compact onSaved={reload} />
              </>
            ) : (
              <>
                <p className="muted">Monthly check-ins are on.</p>
                <Button variant="secondary" to="/check-in">
                  Check in now
                </Button>
              </>
            )}
          </Card>
        ) : null}
      </aside>
    </div>
  );
}
