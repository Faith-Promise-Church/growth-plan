import { useState } from 'react';
import { motion } from 'framer-motion';
import { DIMENSIONS } from '../../utils/dimensionData';
import Logo from '../shared/Logo';
import Button from '../shared/Button';
import './QuestionScreen.css';

export default function QuestionScreen({ 
  dimension, 
  questionIndex, 
  totalQuestions,
  onNext,
  onExit,
  initialValue = 5 
}) {
  const [value, setValue] = useState(initialValue);
  const data = DIMENSIONS[dimension];
  
  if (!data) return null;

  const question = data.questions[questionIndex];
  const questionNumber = questionIndex + 1;

  const handleSliderChange = (e) => {
    setValue(parseInt(e.target.value, 10));
  };

  const handleNext = () => {
    onNext(value);
  };

  return (
    <motion.div 
      className="question-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      {onExit && (
        <button 
          className="question-screen__exit"
          onClick={onExit}
          aria-label="Exit assessment"
        >
          ×
        </button>
      )}
      
      <header className="question-screen__header">
        <Logo
          type="dimension"
          dimension={dimension}
          variant="standard"
          size={100}
          className="question-screen__logo"
        />
        <div className="question-screen__progress">
          Question {questionNumber} of {totalQuestions}
        </div>
      </header>

      <main className="question-screen__content">
        <p 
          className="question-screen__question"
          style={{ color: data.color }}
        >
          {questionNumber}. {question}
        </p>

        <div className="question-screen__slider-container">
          <div className="question-screen__slider-labels">
            <span>Strongly Disagree</span>
            <span>Strongly Agree</span>
          </div>
          
          <input
            type="range"
            min="1"
            max="10"
            value={value}
            onChange={handleSliderChange}
            className="question-screen__slider"
            style={{
              '--thumb-color': data.color,
              '--track-fill': data.color,
            }}
          />
          
          <div className="question-screen__slider-numbers">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
              <span 
                key={num} 
                className={num === value ? 'active' : ''}
                style={{ color: num === value ? data.color : undefined }}
              >
                {num}
              </span>
            ))}
          </div>
        </div>

        <div className="question-screen__score">
          <span 
            className="question-screen__score-label"
            style={{ color: data.color }}
          >
            My score:
          </span>
          <span className="question-screen__score-value">
            {value}
          </span>
        </div>
      </main>

      <footer className="question-screen__footer">
        <Button
          variant="primary"
          dimensionColor={data.color}
          onClick={handleNext}
          fullWidth
        >
          Next
        </Button>
      </footer>
    </motion.div>
  );
}
