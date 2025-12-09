import { motion } from 'framer-motion';
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { DIMENSIONS, DIMENSION_ORDER } from '../../utils/dimensionData';
import Button from '../shared/Button';
import './RadarChart.css';

export default function RadarChart({ 
  scores, 
  previousScores = null, 
  onDimensionClick, 
  onRetake, 
  onHome,
  onViewHistory 
}) {
  // Transform scores for Recharts
  const chartData = DIMENSION_ORDER.map(dim => ({
    dimension: DIMENSIONS[dim].name,
    key: dim,
    score: scores?.[dim] || 0,
    previousScore: previousScores?.[dim] || null,
    fullMark: 10,
    color: DIMENSIONS[dim].color,
  }));

  // Custom dot component
  const CustomDot = (props) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy) return null;
    
    return (
      <g 
        onClick={() => onDimensionClick(payload.key)}
        style={{ cursor: 'pointer' }}
      >
        <circle 
          cx={cx} 
          cy={cy} 
          r={20} 
          fill={payload.color}
          stroke="white"
          strokeWidth={2}
        />
        <text
          x={cx}
          y={cy}
          textAnchor="middle"
          dominantBaseline="central"
          fill="white"
          fontSize="12"
          fontWeight="700"
        >
          {payload.score?.toFixed(1)}
        </text>
      </g>
    );
  };

  // Custom label component for axis
  const CustomAxisTick = (props) => {
    const { x, y, payload } = props;
    const dim = DIMENSION_ORDER.find(d => DIMENSIONS[d].name === payload.value);
    const color = dim ? DIMENSIONS[dim].color : 'var(--dark-neutral)';
    
    return (
      <text
        x={x}
        y={y}
        textAnchor="middle"
        fill={color}
        fontSize="14"
        fontWeight="500"
      >
        {payload.value}
      </text>
    );
  };

  return (
    <motion.div 
      className="radar-chart-page"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="radar-chart-page__header">
        <h1 className="radar-chart-page__title">Your Results</h1>
        <p className="radar-chart-page__subtitle">
          Tap any score to see more details
        </p>
      </header>

      <div className="radar-chart-page__chart">
        <ResponsiveContainer width="100%" height={350}>
          <RechartsRadarChart data={chartData} cx="50%" cy="50%" outerRadius="70%">
            <PolarGrid 
              stroke="rgba(39, 38, 36, 0.15)" 
              strokeDasharray="3 3"
            />
            <PolarAngleAxis 
              dataKey="dimension"
              tick={<CustomAxisTick />}
              tickLine={false}
            />
            <PolarRadiusAxis 
              angle={90}
              domain={[0, 10]}
              tickCount={6}
              tick={{ fontSize: 10, fill: 'rgba(39, 38, 36, 0.4)' }}
              axisLine={false}
            />
            
            {/* Previous scores (ghosted) */}
            {previousScores && (
              <Radar
                name="Previous"
                dataKey="previousScore"
                stroke="rgba(39, 38, 36, 0.3)"
                fill="rgba(39, 38, 36, 0.05)"
                strokeWidth={2}
                strokeDasharray="5 5"
              />
            )}
            
            {/* Current scores */}
            <Radar
              name="Current"
              dataKey="score"
              stroke="var(--purpose)"
              fill="rgba(64, 144, 131, 0.1)"
              strokeWidth={2}
              dot={<CustomDot />}
            />
          </RechartsRadarChart>
        </ResponsiveContainer>
      </div>

      {/* Dimension legend with clickable items */}
      <div className="radar-chart-page__legend">
        {chartData.map(item => (
          <button
            key={item.key}
            className="radar-chart-page__legend-item"
            onClick={() => onDimensionClick(item.key)}
          >
            <span 
              className="radar-chart-page__legend-dot"
              style={{ backgroundColor: item.color }}
            />
            <span className="radar-chart-page__legend-name">
              {item.dimension}
            </span>
            <span 
              className="radar-chart-page__legend-score"
              style={{ color: item.color }}
            >
              {item.score?.toFixed(1)}
            </span>
          </button>
        ))}
      </div>

      <footer className="radar-chart-page__footer">
        <Button
          variant="primary"
          onClick={onRetake}
          fullWidth
        >
          Retake Assessment
        </Button>
        <Button
          variant="outlined"
          onClick={onHome}
          fullWidth
        >
          Return to Home Screen
        </Button>
        {onViewHistory && (
          <button
            type="button"
            className="radar-chart-page__link"
            onClick={onViewHistory}
          >
            View History
          </button>
        )}
      </footer>
    </motion.div>
  );
}
