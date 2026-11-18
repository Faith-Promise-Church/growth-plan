import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import { usePlanData } from '../hooks/useUserData.js';
import { Button, Card, EmptyState, LoadingBlock, Banner, DimensionTile } from '../components/ui/index.jsx';
import Wheel from '../components/app/Wheel.jsx';
import CheckinOptIn from '../components/app/CheckinOptIn.jsx';
import CheckinHistory from '../components/app/CheckinHistory.jsx';
import { DIMENSION_ORDER, DIMENSIONS } from '../content/dimensions.js';
import { scoresFromRow, formatScore } from '../lib/scoring.js';
import { activeHabits, groupByDimension } from '../lib/habits.js';
import { currentPlanYear, offersNextYear, formatDate, zonedParts } from '../lib/time.js';
import { readDraftSummary } from '../lib/draft.js';

function greeting(name) {
  const h = zonedParts(new Date()).hour;
  const part = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
  return name ? `${part}, ${name}` : part;
}

function nextStep({ data, year, draft }) {
  const { latest, plan, goals } = data;
  if (draft) {
    return {
      title: 'Finish your assessment',
      body: `You have answered ${draft.done} of 7 areas. Pick up where you left off.`,
      to: `/assessment/take/${Math.min(7, draft.done + 1)}`,
      label: 'Keep going',
    };
  }
  if (!latest) {
    return {
      title: 'Start with the flourishing assessment',
      body: 'It takes about ten minutes. It shows how life is going in seven areas and what you are already practicing, so you know where to start.',
      to: '/assessment',
      label: 'Take the assessment',
    };
  }
  if (!plan?.focus_dimensions?.length) {
    return {
      title: 'Choose your focus areas',
      body: 'Pick two or three areas to focus on this year. Your results suggest where to start.',
      to: `/assessment/results/${latest.id}#focus`,
      label: 'Choose focus areas',
    };
  }
  if (!activeHabits(goals).length) {
    const first = plan.focus_dimensions[0];
    return {
      title: 'Build your plan',
      body: `Add a habit or two in ${DIMENSIONS[first]?.name ?? 'your first focus area'}. The Helper will suggest a place to start.`,
      to: `/plan/${year}/${first}`,
      label: 'Build my plan',
    };
  }
  return {
    title: 'Review your plan',
    body: 'Look over your habits and adjust anything that is not working.',
    to: `/plan/${year}`,
    label: 'Review my plan',
  };
}

export default function HomePage() {
  const { profile, user } = useAuth();
  const year = currentPlanYear();
  const { data, loading, error, reload } = usePlanData(year, { withCheckins: true });
  const draft = readDraftSummary(user?.id);

  if (loading && !data) return <div className="page"><LoadingBlock /></div>;
  if (error && !data) {
    return (
      <div className="page">
        <Banner tone="error" action={<Button variant="secondary" size="sm" onClick={reload}>Try again</Button>}>
          Your plan did not load. Check your connection and try again.
        </Banner>
      </div>
    );
  }

  const step = nextStep({ data, year, draft });
  const scores = scoresFromRow(data.latest);
  const byDim = groupByDimension(activeHabits(data.goals));
  const nextYear = year + 1;
  const hasNextYearPlan = data.plans.some((p) => p.year === nextYear);
  const flourishing = scores ? Object.fromEntries(DIMENSION_ORDER.map((d) => [d, scores[d].flourishing])) : null;

  return (
    <div className="page page--wide">
      <div className="page-main">
        <h1 className="home__greeting">{greeting(profile?.first_name)}</h1>

        <Card className="next-step">
          <h2 className="card__title next-step__title">{step.title}</h2>
          <p>{step.body}</p>
          <Button to={step.to}>{step.label}</Button>
        </Card>

        {offersNextYear() && data.plan && !hasNextYearPlan ? (
          <Card className="row-card">
            <div>
              <h2 className="card__title">{`Start your ${nextYear} plan`}</h2>
              <p className="muted">Keep what worked this year and let go of what did not.</p>
            </div>
            <Button variant="secondary" to={`/plan/${nextYear}/start`}>
              {`Start ${nextYear}`}
            </Button>
          </Card>
        ) : null}

        <Card>
          <h2 className="card__title">Your flourishing wheel</h2>
          {data.latest ? (
            <>
              <p className="muted">{`Taken ${formatDate(data.latest.assessment_date)}`}</p>
              <Wheel scores={flourishing} size={300} />
              <Link className="text-link" to={`/assessment/results/${data.latest.id}`}>
                See my results
              </Link>
            </>
          ) : (
            <EmptyState title="No assessment yet">
              <p>Your wheel appears here after your first assessment.</p>
            </EmptyState>
          )}
        </Card>

        <Card>
          <h2 className="card__title">{`Your ${year} plan by area`}</h2>
          <ul className="dim-rows">
            {DIMENSION_ORDER.map((d) => {
              const s = scores?.[d];
              const count = byDim[d].length;
              const isFocus = data.plan?.focus_dimensions?.includes(d);
              return (
                <li key={d}>
                  <Link className="dim-row" to={`/plan/${year}/${d}`}>
                    <DimensionTile dimension={d} size={40} />
                    <span className="dim-row__name">
                      {DIMENSIONS[d].name}
                      {isFocus ? <span className="tag">Focus</span> : null}
                    </span>
                    <span className="dim-row__scores">
                      {s?.flourishing != null ? <span>{`Flourishing ${formatScore(s.flourishing)}`}</span> : null}
                      {s?.habit != null ? <span>{`Habits ${formatScore(s.habit)}`}</span> : null}
                    </span>
                    <span className="dim-row__count">{count === 1 ? '1 habit' : `${count} habits`}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>

      <aside className="page-rail">
        <Card>
          <h2 className="card__title">Monthly check-in</h2>
          {!data.prefs?.monthly_checkin ? (
            <p className="muted">A short email on the first Monday of each month brings you back to your plan.</p>
          ) : (
            <p className="muted">
              Check-ins are on. <Link to="/email/preferences">Change this</Link>
            </p>
          )}
          {data.checkins?.length ? <CheckinHistory checkins={data.checkins} goals={data.goals} /> : null}
          {data.plan && activeHabits(data.goals).length ? (
            <Button variant="secondary" to="/check-in">
              Check in now
            </Button>
          ) : null}
          {!data.prefs?.monthly_checkin ? <CheckinOptIn compact onSaved={reload} /> : null}
        </Card>
      </aside>
    </div>
  );
}
