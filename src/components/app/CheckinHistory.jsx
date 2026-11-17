import { FREQUENCY_OPTIONS } from '../../content/assessment.js';
import { shortMonth, monthYearLabel } from '../../lib/time.js';
import { activeHabits } from '../../lib/habits.js';

// A month-by-month row of how steady each habit has been.
export default function CheckinHistory({ checkins, goals }) {
  const months = [...(checkins ?? [])].sort((a, b) => (a.period < b.period ? -1 : 1)).slice(-6);
  const habits = activeHabits(goals);
  if (!months.length || !habits.length) return null;
  const latest = months[months.length - 1];
  return (
    <div className="checkin-history">
      <p className="muted">{`Last check-in: ${monthYearLabel(latest.period)}`}</p>
      <div className="table-scroll">
        <table className="checkin-table">
          <caption className="visually-hidden">How steady each habit has been, by month</caption>
          <thead>
            <tr>
              <th scope="col">Habit</th>
              {months.map((m) => (
                <th scope="col" key={m.period}>
                  {shortMonth(m.period)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {habits.map((h) => (
              <tr key={h.id}>
                <th scope="row" className="checkin-table__habit">
                  {h.goal_text}
                </th>
                {months.map((m) => {
                  const v = m.responses?.[h.id];
                  const label = v == null ? 'No answer' : FREQUENCY_OPTIONS[v]?.label;
                  return (
                    <td key={m.period}>
                      <span className={`dot dot--${v ?? 'none'}`} title={label}>
                        <span className="visually-hidden">{label}</span>
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
