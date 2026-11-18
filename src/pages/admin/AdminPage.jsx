import { Link } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import { useAsync } from '../../hooks/useAsync.js';
import { adminStats } from '../../data/api.js';
import { Button, Card, PageHeader, LoadingBlock, Banner, Meter, EmptyState } from '../../components/ui/index.jsx';
import { DIMENSION_ORDER, DIMENSIONS } from '../../content/dimensions.js';
import { FLOURISHING_QUESTIONS } from '../../content/assessment.js';
import { getPractice } from '../../content/practices.js';
import { formatDate } from '../../lib/time.js';

export function AdminGate({ children }) {
  const { profile, loading, profileReady } = useAuth();
  if (loading || !profileReady) return <div className="page"><LoadingBlock /></div>;
  if (!profile?.is_admin) {
    return (
      <div className="page">
        <EmptyState title="This page is for admins" action={<Button to="/home">Go home</Button>}>
          <p>Your account does not have access to it.</p>
        </EmptyState>
      </div>
    );
  }
  return children;
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <span className="stat__value">{value ?? 0}</span>
      <span className="stat__label">{label}</span>
    </div>
  );
}

export default function AdminPage() {
  const { data, loading, error, reload } = useAsync(() => adminStats(), []);
  return (
    <AdminGate>
      <div className="page page--wide page--admin">
        <div className="page-main page-main--full">
          <PageHeader
            title="Admin"
            lead={data ? `Updated ${formatDate(data.generated_at)}` : undefined}
            actions={
              <div className="button-row">
                <Button variant="secondary" size="sm" to="/admin/check-ins">
                  Check-ins
                </Button>
                <Button variant="ghost" size="sm" onClick={reload}>
                  Refresh
                </Button>
              </div>
            }
          />
          {loading && !data ? <LoadingBlock /> : null}
          {error ? <Banner tone="error">{error.message}</Banner> : null}
          {data ? (
            <>
              <div className="stats">
                <Stat label="People" value={data.totals.users} />
                <Stat label="Assessments" value={data.totals.assessments} />
                <Stat label="With habits (v2)" value={data.totals.assessments_v2} />
                <Stat label="Plans" value={data.totals.plans} />
                <Stat label="Habits" value={data.totals.habits} />
                <Stat label="Habits per plan" value={data.avg_habits_per_plan ?? 0} />
              </div>
              <div className="admin-grid">
                <Card>
                  <h2 className="card__title">Average flourishing</h2>
                  {DIMENSION_ORDER.map((d) => (
                    <Meter key={d} label={DIMENSIONS[d].name} value={data.flourishing?.[d]} dimension={d} />
                  ))}
                </Card>
                <Card>
                  <h2 className="card__title">Average habits</h2>
                  <p className="muted">{`From ${data.habits?.responses ?? 0} assessments with the habits layer.`}</p>
                  {DIMENSION_ORDER.map((d) => (
                    <Meter key={d} label={DIMENSIONS[d].name} value={data.habits?.[d]} dimension={d} />
                  ))}
                </Card>
                <Card>
                  <h2 className="card__title">Plans by year</h2>
                  {data.plans_by_year?.length ? (
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th scope="col">Year</th>
                          <th scope="col">Plans</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.plans_by_year.map((r) => (
                          <tr key={r.year}>
                            <td>{r.year}</td>
                            <td>{r.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p className="muted">No plans yet.</p>
                  )}
                </Card>
                <Card>
                  <h2 className="card__title">Most-added practices</h2>
                  {data.top_practices?.length ? (
                    <ol className="ranked">
                      {data.top_practices.map((p) => (
                        <li key={p.practice_key}>
                          <span>{getPractice(p.practice_key)?.name ?? p.practice_key}</span>
                          <span className="muted">{p.count}</span>
                        </li>
                      ))}
                    </ol>
                  ) : (
                    <p className="muted">No practices added from the library yet.</p>
                  )}
                </Card>
              </div>
              <Card>
                <h2 className="card__title">Average answer by question</h2>
                <p className="muted">{`From ${data.questions?.responses ?? 0} assessments.`}</p>
                <div className="table-scroll">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th scope="col">Question</th>
                      <th scope="col">Average</th>
                    </tr>
                  </thead>
                  <tbody>
                    {DIMENSION_ORDER.flatMap((d) =>
                      FLOURISHING_QUESTIONS[d].map((q) => (
                        <tr key={q.column}>
                          <td>
                            <span className="muted">{`${DIMENSIONS[d].name}: `}</span>
                            {q.text}
                          </td>
                          <td>{data.questions?.[q.column] ?? ''}</td>
                        </tr>
                      )),
                    )}
                  </tbody>
                </table>
                </div>
              </Card>
              <p className="muted">
                <Link to="/home">Back to the app</Link>
              </p>
            </>
          ) : null}
        </div>
      </div>
    </AdminGate>
  );
}
