import { DIMENSIONS } from '../../utils/dimensionData';
import './GoalCard.css';

export default function GoalCard({ 
  goal, 
  dimension, 
  onTextChange, 
  onDelete = null,
  readOnly = false 
}) {
  const data = DIMENSIONS[dimension];
  
  if (!data) return null;

  const gradientStyle = {
    background: `linear-gradient(135deg, ${data.color} 0%, ${data.colorDark} 100%)`
  };

  return (
    <div className="goal-card" style={gradientStyle}>
      <div className="goal-card__header">
        <span className="goal-card__label">
          Goal: {goal.name}
        </span>
        {onDelete && !readOnly && (
          <button 
            className="goal-card__delete"
            onClick={onDelete}
            aria-label="Delete goal"
          >
            ×
          </button>
        )}
      </div>
      
      {readOnly ? (
        <div className="goal-card__text-display">
          {goal.text || <em className="goal-card__empty">No description added</em>}
        </div>
      ) : (
        <textarea
          className="goal-card__textarea"
          value={goal.text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder="Describe your goal for this discipline..."
          rows={3}
        />
      )}
    </div>
  );
}
