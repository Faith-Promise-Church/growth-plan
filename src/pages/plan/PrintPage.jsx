import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { usePlanData } from '../../hooks/useUserData.js';
import { Button, LoadingBlock, Banner } from '../../components/ui/index.jsx';
import { DIMENSIONS } from '../../content/dimensions.js';
import { visibleGoals, groupByDimension, orderedDimensions } from '../../lib/habits.js';
import { isValidPlanYear } from '../../lib/time.js';
import './print.css';

export default function PrintPage() {
  const { year: yearParam } = useParams();
  const year = Number(yearParam);
  const { profile } = useAuth();
  const { data, loading, error, reload } = usePlanData(year);

  if (!isValidPlanYear(year)) return <Navigate to="/home" replace />;
  if (loading && !data) return <div className="print-page"><LoadingBlock /></div>;
  if (error && !data) {
    return (
      <div className="print-page">
        <Banner tone="error" action={<Button size="sm" variant="secondary" onClick={reload}>Try again</Button>}>
          Your plan did not load.
        </Banner>
      </div>
    );
  }
  const focus = data.plan?.focus_dimensions ?? [];
  const byDim = groupByDimension(visibleGoals(data.goals).filter((g) => g.status !== 'done'));
  const name = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');

  return (
    <div className="print-page">
      <div className="print-toolbar no-print">
        <Link to={`/plan/${year}`} className="text-link">
          <span aria-hidden="true">←</span> Back to my plan
        </Link>
        <Button onClick={() => window.print()}>Print or save as PDF</Button>
      </div>
      <article className="print-sheet">
        <header className="print-sheet__header">
          <img src="/assets/logos/growth-plan-dark.png" alt="Growth Plan" width="200" height="35" />
          <div>
            <h1 className="print-sheet__title">{`${year} Growth Plan`}</h1>
            {name ? <p className="print-sheet__name">{name}</p> : null}
          </div>
        </header>
        {focus.length ? (
          <p className="print-sheet__focus">
            <strong>Focus areas:</strong> {focus.map((d) => DIMENSIONS[d]?.name).join(', ')}
          </p>
        ) : null}
        {orderedDimensions(focus).map((d) => {
          const list = byDim[d];
          if (!list.length) return null;
          return (
            <section key={d} className="print-section" style={{ '--dim': `var(--${d})` }}>
              <h2 className="print-section__title">
                <img src={`/assets/logos/${DIMENSIONS[d].name}-standard.png`} alt="" width="28" height="28" />
                {DIMENSIONS[d].name}
              </h2>
              <ul>
                {list.map((g) => (
                  <li key={g.id}>
                    {g.goal_text}
                    {g.status === 'paused' ? ' (paused)' : ''}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
        {!visibleGoals(data.goals).length ? <p>This plan has no habits yet.</p> : null}
        <footer className="print-sheet__footer">Faith Promise Church</footer>
      </article>
    </div>
  );
}
