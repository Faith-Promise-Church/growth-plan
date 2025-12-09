import { motion } from 'framer-motion';
import { DIMENSIONS } from '../../utils/dimensionData';
import Logo from '../shared/Logo';
import Button from '../shared/Button';
import './DimensionSplash.css';

export default function DimensionSplash({ dimension, onNext }) {
  const data = DIMENSIONS[dimension];
  
  if (!data) return null;

  return (
    <motion.div 
      className="dimension-splash"
      style={{ backgroundColor: data.color }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="dimension-splash__content">
        <div className="dimension-splash__text-logo-group">
          <p className="dimension-splash__intro">
            {data.introStatement}
          </p>
          
          <Logo
            type="dimension"
            dimension={dimension}
            variant="inverse"
            className="dimension-splash__logo"
          />
        </div>
        
        <h1 className="dimension-splash__name">
          {data.name}.
        </h1>
      </div>
      
      <div className="dimension-splash__footer">
        <Button
          variant="primary-on-color"
          onClick={onNext}
          fullWidth
        >
          Next
        </Button>
      </div>
    </motion.div>
  );
}
