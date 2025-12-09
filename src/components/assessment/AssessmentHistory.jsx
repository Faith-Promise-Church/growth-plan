import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Button from '../shared/Button';
import './AssessmentHistory.css';

function computeAverageScore(assessment) {
  const fields = [
    'faith_score',
    'relationships_score',
    'finances_score',
    'health_score',
    'purpose_score',
    'character_score',
    'contentment_score',
  ];
  
  const values = fields
    .map((f) => Number(assessment[f]))
    .filter((v) => Number.isFinite(v));
  
  if (!values.length) return null;
  
  const sum = values.reduce((acc, v) => acc + v, 0);
  return (sum / values.length).toFixed(1);
}

export default function AssessmentHistory({
  assessments,
  onBack,
  onSelectAssessment,
}) {
  return (
    <motion.div 
      className="assessment-history"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <header className="assessment-history__header">
        <h1 className="assessment-history__title">Assessment History</h1>
        <p className="assessment-history__subtitle">
          View your previous assessments and how your scores have changed over time.
        </p>
      </header>

      {assessments.length === 0 ? (
        <div className="assessment-history__empty">
          <p>You haven&apos;t taken any assessments yet.</p>
        </div>
      ) : (
        <ul className="assessment-history__list">
          {assessments.map((assessment) => {
            const avg = computeAverageScore(assessment);
            const dateLabel = assessment.assessment_date
              ? format(new Date(assessment.assessment_date), 'MMM d, yyyy')
              : 'Unknown date';

            return (
              <li key={assessment.id}>
                <button
                  type="button"
                  className="assessment-history__item"
                  onClick={() => onSelectAssessment(assessment)}
                >
                  <div className="assessment-history__item-main">
                    <span className="assessment-history__date">{dateLabel}</span>
                    {avg && (
                      <span className="assessment-history__avg">
                        Avg: {avg}
                      </span>
                    )}
                  </div>
                  <span className="assessment-history__arrow">→</span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <footer className="assessment-history__footer">
        <Button
          variant="outlined"
          onClick={onBack}
          fullWidth
        >
          Back to Results
        </Button>
      </footer>
    </motion.div>
  );
}
