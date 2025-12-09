import { motion } from 'framer-motion';
import { DIMENSIONS, getEncouragementMessage } from '../../utils/dimensionData';
import Logo from '../shared/Logo';
import Button from '../shared/Button';
import './DimensionScore.css';

export default function DimensionScore({ dimension, score, onBack }) {
  const data = DIMENSIONS[dimension];
  
  if (!data) return null;

  const encouragement = getEncouragementMessage(score);

  return (
    <motion.div 
      className="dimension-score"
      style={{ 
        background: `linear-gradient(180deg, var(--light-neutral) 0%, ${data.color} 100%)`
      }}
      initial={{ opacity: 0, y: 100 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 100 }}
      transition={{ duration: 0.5 }}
    >
      <div className="dimension-score__content">
        <Logo
          type="dimension"
          dimension={dimension}
          variant="color-trans"
          size="large"
          className="dimension-score__logo"
        />
        
        <p 
          className="dimension-score__definition"
          style={{ color: data.color }}
        >
          The dimension of <strong>{data.name}</strong> is a measure of {data.definition}
        </p>

        <div className="dimension-score__score-section">
          <span className="dimension-score__label">
            My {data.name} Score:
          </span>
          <span className="dimension-score__value">
            {parseFloat(score).toFixed(1)}
          </span>
          {encouragement && (
            <span className="dimension-score__encouragement">
              {encouragement}
            </span>
          )}
        </div>
      </div>

      <footer className="dimension-score__footer">
        <Button
          variant="primary-on-color"
          onClick={onBack}
          fullWidth
        >
          Back
        </Button>
      </footer>
    </motion.div>
  );
}
