// The flourishing wheel, drawn by hand in SVG (replaces recharts). Seven wedges, one per
// dimension; each wedge's length is the flourishing score out of 10. An optional outline shows
// the previous assessment.

import { DIMENSION_ORDER, DIMENSIONS } from '../../content/dimensions.js';
import { formatScore } from '../../lib/scoring.js';

const SIZE = 320;
const C = SIZE / 2;
const INNER = 22;
const OUTER = 128;

function polar(r, angle) {
  return [C + r * Math.cos(angle), C + r * Math.sin(angle)];
}

function wedgePath(r, a0, a1) {
  const [x0, y0] = polar(INNER, a0);
  const [x1, y1] = polar(r, a0);
  const [x2, y2] = polar(r, a1);
  const [x3, y3] = polar(INNER, a1);
  return `M${x0},${y0} L${x1},${y1} A${r},${r} 0 0 1 ${x2},${y2} L${x3},${y3} A${INNER},${INNER} 0 0 0 ${x0},${y0} Z`;
}

export default function Wheel({ scores, previous, size = SIZE, showLabels = true, title = 'Flourishing wheel' }) {
  const step = (Math.PI * 2) / DIMENSION_ORDER.length;
  const start = -Math.PI / 2 - step / 2;
  const radius = (v) => INNER + ((OUTER - INNER) * Math.max(0, Math.min(10, Number(v) || 0))) / 10;
  const description = DIMENSION_ORDER.map((d) => `${DIMENSIONS[d].name} ${formatScore(scores?.[d]) || 'not measured'}`).join(', ');

  return (
    <figure className="wheel" style={{ maxWidth: size }}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${title}: ${description}`}>
        {[2, 4, 6, 8, 10].map((g) => (
          <circle key={g} cx={C} cy={C} r={radius(g)} fill="none" stroke="var(--line)" strokeWidth="1" />
        ))}
        {DIMENSION_ORDER.map((d, i) => {
          const a0 = start + i * step + 0.02;
          const a1 = start + (i + 1) * step - 0.02;
          const v = scores?.[d];
          return (
            <g key={d}>
              <path d={wedgePath(OUTER, a0, a1)} fill={`var(--${d})`} opacity="0.12" />
              {v != null ? <path d={wedgePath(radius(v), a0, a1)} fill={`var(--${d})`} /> : null}
              {previous?.[d] != null ? (
                <path d={wedgePath(radius(previous[d]), a0, a1)} fill="none" stroke="var(--ink)" strokeWidth="1.5" strokeDasharray="3 3" />
              ) : null}
            </g>
          );
        })}
        {showLabels
          ? DIMENSION_ORDER.map((d, i) => {
              const mid = start + (i + 0.5) * step;
              const [x, y] = polar(OUTER + 18, mid);
              const anchor = Math.abs(Math.cos(mid)) < 0.2 ? 'middle' : Math.cos(mid) > 0 ? 'start' : 'end';
              return (
                <text key={d} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="wheel__label">
                  {formatScore(scores?.[d]) || '-'}
                </text>
              );
            })
          : null}
      </svg>
      {showLabels ? (
        <figcaption className="wheel__legend">
          {DIMENSION_ORDER.map((d) => (
            <span key={d} className="wheel__key">
              <span className="wheel__swatch" style={{ background: `var(--${d})` }} aria-hidden="true" />
              {DIMENSIONS[d].name}
            </span>
          ))}
          {previous ? (
            <span className="wheel__key">
              <span className="wheel__swatch wheel__swatch--prev" aria-hidden="true" />
              Last time
            </span>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
