import { motion } from 'framer-motion';
import { DIMENSIONS, DIMENSION_ORDER } from '../../utils/dimensionData';
import Logo from '../shared/Logo';
import Button from '../shared/Button';
import './DimensionList.css';

export default function DimensionList({ 
  year, 
  completedDimensions = [], 
  onSelect, 
  onBack, 
  onDone,
  mode 
}) {
  return (
    <motion.div 
      className="dimension-list"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="dimension-list__header">
        <Logo
          type="app"
          appLogo="growth-plan-builder"
          className="dimension-list__header-logo--xlarge"
        />
      </header>

      <main className="dimension-list__content">
        <p className="dimension-list__subtitle">
          {mode === 'edit' ? 'Select a dimension to edit:' : 'Select dimensions to work on:'}
        </p>

        <ul className="dimension-list__items">
          {DIMENSION_ORDER.map(dim => {
            const data = DIMENSIONS[dim];
            const isCompleted = completedDimensions.includes(dim);
            
            return (
              <li key={dim}>
                <button
                  className={`dimension-list__item ${isCompleted ? 'completed' : ''}`}
                  onClick={() => onSelect(dim)}
                >
                  <Logo
                    type="dimension"
                    dimension={dim}
                    variant="standard"
                    size={32}
                    className="dimension-list__logo"
                  />
                  <span className="dimension-list__name">
                    {data.name} Goals
                  </span>
                  {isCompleted && (
                    <span className="dimension-list__check">✓</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </main>

      <footer className="dimension-list__footer">
        {completedDimensions.length > 0 && (
          <Button
            variant="primary"
            fullWidth
            onClick={onDone}
          >
            {mode === 'edit' ? 'Done Editing' : 'Finish Plan'}
          </Button>
        )}
        <button className="dimension-list__back" onClick={onBack}>
          ← Back
        </button>
      </footer>
    </motion.div>
  );
}
