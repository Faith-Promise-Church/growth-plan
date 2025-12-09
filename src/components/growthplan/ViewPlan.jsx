import { motion } from 'framer-motion';
import { DIMENSIONS, DIMENSION_ORDER } from '../../utils/dimensionData';
import Logo from '../shared/Logo';
import Button from '../shared/Button';
import GoalCard from './GoalCard';
import './ViewPlan.css';

export default function ViewPlan({ year, goals, onBack, onEdit }) {
  return (
    <motion.div 
      className="view-plan"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <header className="view-plan__header">
        <Logo
          type="app"
          appLogo="growth-plan"
          className="view-plan__header-logo"
        />
      </header>

      <main className="view-plan__content">
        {DIMENSION_ORDER.map(dim => {
          const data = DIMENSIONS[dim];
          const dimensionGoals = goals[dim] || [];
          
          if (dimensionGoals.length === 0) return null;
          
          return (
            <section key={dim} className="view-plan__section">
              <div className="view-plan__section-header">
                <Logo
                  type="dimension"
                  dimension={dim}
                  variant="standard"
                  size={32}
                />
                <h2 className="view-plan__section-title">
                  My {data.name} Goals:
                </h2>
              </div>
              
              <div className="view-plan__goals">
                {dimensionGoals.map(goal => (
                  <GoalCard
                    key={goal.id || goal.goal_name}
                    goal={{
                      name: goal.goal_name || goal.name,
                      text: goal.goal_text || goal.text || '',
                      discipline: goal.discipline,
                      isMandatory: goal.is_mandatory || goal.isMandatory,
                    }}
                    dimension={dim}
                    readOnly={true}
                  />
                ))}
              </div>
            </section>
          );
        })}
        
        {Object.keys(goals).length === 0 && (
          <p className="view-plan__empty">
            No goals have been added yet.
          </p>
        )}
      </main>

      <footer className="view-plan__footer">
        <Button
          variant="primary"
          fullWidth
          onClick={onEdit}
        >
          Edit Plan
        </Button>
        <Button
          variant="outlined"
          fullWidth
          onClick={onBack}
        >
          Return to Menu
        </Button>
      </footer>
    </motion.div>
  );
}
