import { motion } from 'framer-motion';
import { DIMENSIONS, DIMENSION_ORDER } from '../../utils/dimensionData';
import Logo from '../shared/Logo';
import Button from '../shared/Button';
import './ViewPlan.css';

export default function ViewPlan({ year, goals, onBack, onEdit, onExportPDF }) {
  return (
    <motion.div 
      className="view-plan"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Header with centered logo */}
      <header className="view-plan__header">
        <Logo
          type="app"
          appLogo="growth-plan"
          className="view-plan__header-logo"
        />
      </header>

      {/* Body with dimension sections */}
      <main className="view-plan__content">
        {DIMENSION_ORDER.map(dim => {
          const data = DIMENSIONS[dim];
          const dimensionGoals = goals[dim] || [];
          
          // Skip dimensions with no goals
          if (dimensionGoals.length === 0) return null;
          
          return (
            <section key={dim} className="view-plan__dimension-section">
              {/* Dimension Header: Icon + "Faith Goals:" */}
              <div className="view-plan__dimension-header">
                <Logo
                  type="dimension"
                  dimension={dim}
                  variant="standard"
                  className="view-plan__dimension-icon"
                />
                <h2 className="view-plan__dimension-title">
                  {data.name} Goals:
                </h2>
              </div>
              
              {/* Goals List */}
              <div className="view-plan__goals-list">
                {dimensionGoals.map((goal, index) => (
                  <div key={goal.id || goal.goal_name || index} className="view-plan__goal-entry">
                    <h3 className="view-plan__goal-name">
                      Goal: {goal.goal_name || goal.name}
                    </h3>
                    {(goal.goal_text || goal.text) && (
                      <p className="view-plan__goal-text">
                        {goal.goal_text || goal.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
        
        {/* Empty state */}
        {Object.keys(goals).length === 0 && (
          <p className="view-plan__empty">
            No goals have been added yet.
          </p>
        )}

        {/* PDF Export Link */}
        {Object.keys(goals).length > 0 && (
          <div className="view-plan__export-container">
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                if (onExportPDF) onExportPDF();
              }}
              className="view-plan__export-link"
            >
              Click here to export this plan as a PDF.
            </a>
          </div>
        )}
      </main>

      {/* Footer with buttons */}
      <footer className="view-plan__footer">
        <Button
          variant="outlined"
          fullWidth
          onClick={onBack}
        >
          Back
        </Button>
      </footer>
    </motion.div>
  );
}
