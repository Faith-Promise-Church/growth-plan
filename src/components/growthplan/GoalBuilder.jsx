import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DIMENSIONS } from '../../utils/dimensionData';
import { supabase } from '../../utils/supabaseClient';
import { useAuth } from '../../utils/AuthContext';
import Logo from '../shared/Logo';
import Button from '../shared/Button';
import GoalCard from './GoalCard';
import './GoalBuilder.css';

export default function GoalBuilder({ 
  dimension, 
  existingGoals = null, 
  onComplete, 
  onBack,
  isEdit = false 
}) {
  const { user } = useAuth();
  const data = DIMENSIONS[dimension];
  const [goals, setGoals] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalText, setNewGoalText] = useState('');
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);
  const [dimensionScore, setDimensionScore] = useState(null);

  // Fetch most recent assessment score for this dimension
  useEffect(() => {
    const fetchDimensionScore = async () => {
      if (!user) return;
      
      try {
        // Column name is dimension_score (e.g., faith_score, relationships_score)
        const scoreColumn = `${dimension}_score`;
        
        const { data: assessments, error } = await supabase
          .from('assessments')
          .select(scoreColumn)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (error) {
          console.error('Error fetching assessment:', error);
          return;
        }
        
        if (assessments && assessments.length > 0) {
          const score = assessments[0][scoreColumn];
          if (score !== undefined && score !== null) {
            setDimensionScore(score);
          }
        }
      } catch (err) {
        console.error('Error fetching dimension score:', err);
      }
    };
    
    fetchDimensionScore();
  }, [user, dimension]);

  // Hide scroll indicator after scrolling OR after 5 seconds
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setShowScrollIndicator(false);
      }
    };
    
    // Hide after 5 seconds regardless
    const timer = setTimeout(() => {
      setShowScrollIndicator(false);
    }, 5000);
    
    window.addEventListener('scroll', handleScroll);
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timer);
    };
  }, []);

  // Initialize goals
  useEffect(() => {
    if (existingGoals && existingGoals.length > 0) {
      // Load existing goals
      setGoals(existingGoals.map(g => ({
        id: g.id || Math.random().toString(36).substr(2, 9),
        name: g.goal_name || g.name,
        text: g.goal_text || g.text || '',
        discipline: g.discipline,
        isMandatory: g.is_mandatory || g.isMandatory,
      })));
    } else {
      // Initialize with mandatory goals
      const mandatoryGoals = data.mandatoryGoals.map((discipline, index) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: discipline,
        text: '',
        discipline: discipline,
        isMandatory: true,
      }));
      setGoals(mandatoryGoals);
    }
  }, [dimension, existingGoals, data.mandatoryGoals]);

  const handleGoalTextChange = (id, text) => {
    setGoals(goals.map(g => 
      g.id === id ? { ...g, text } : g
    ));
  };

  const handleDeleteGoal = (id) => {
    if (window.confirm('Are you sure you want to delete this goal?')) {
      setGoals(goals.filter(g => g.id !== id));
    }
  };

  const handleAddGoal = () => {
    if (!newGoalName.trim()) return;

    const newGoal = {
      id: Math.random().toString(36).substr(2, 9),
      name: newGoalName.trim(),
      text: newGoalText.trim(),
      discipline: null,
      isMandatory: false,
    };

    setGoals([...goals, newGoal]);
    setNewGoalName('');
    setNewGoalText('');
    setShowAddModal(false);
  };

  const handleNext = () => {
    // Check if any mandatory goals are empty
    const emptyMandatory = goals.some(g => g.isMandatory && !g.text.trim());
    
    if (emptyMandatory) {
      setShowLeaveModal(true);
    } else {
      onComplete(goals);
    }
  };

  const handleLeaveConfirm = (leave) => {
    setShowLeaveModal(false);
    if (leave) {
      onComplete(goals);
    }
  };

  if (!data) return null;

  return (
    <div className="goal-builder">
      <header className="goal-builder__header">
        <Logo
          type="dimension"
          dimension={dimension}
          variant="standard"
          size={80}
        />
        {dimensionScore !== null && (
          <div className="goal-builder__score">
            <span 
              className="goal-builder__score-label"
              style={{ color: data.color }}
            >
              My score:
            </span>
            <span className="goal-builder__score-value">
              {dimensionScore}
            </span>
          </div>
        )}
        <h1 className="goal-builder__title">
          My Plan to Grow in {data.name}:
        </h1>
      </header>

      <main className="goal-builder__content">
        <div className="goal-builder__goals">
          {goals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              dimension={dimension}
              onTextChange={(text) => handleGoalTextChange(goal.id, text)}
              onDelete={goal.isMandatory ? null : () => handleDeleteGoal(goal.id)}
            />
          ))}
        </div>

        <button 
          className="goal-builder__add"
          onClick={() => setShowAddModal(true)}
        >
          <span 
            className="goal-builder__add-icon"
            style={{ backgroundColor: data.color }}
          >
            +
          </span>
          <span className="goal-builder__add-text">Add New Goal</span>
        </button>

        {data.suggestedGoals && data.suggestedGoals.length > 0 && (
          <p className="goal-builder__suggested">
            <em>Suggested Goals: {data.suggestedGoals.join(', ')}</em>
          </p>
        )}
      </main>

      {/* Scroll Indicator */}
      {showScrollIndicator && goals.length > 2 && (
        <div className="scroll-indicator">
          <p>Scroll for more</p>
          <svg className="scroll-indicator__chevron" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </div>
      )}

      <footer className="goal-builder__footer">
        <button 
          className="goal-builder__back-btn"
          onClick={onBack}
        >
          <span className="goal-builder__back-icon">←</span>
        </button>
        
        <Button
          variant="primary"
          dimensionColor={data.color}
          onClick={handleNext}
        >
          Next
        </Button>
      </footer>

      {/* Add Goal Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div 
            className="goal-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="goal-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <h2 className="goal-modal__title">Add New Goal</h2>
              
              <div className="goal-modal__field">
                <label>Goal Name</label>
                <input
                  type="text"
                  value={newGoalName}
                  onChange={(e) => setNewGoalName(e.target.value)}
                  placeholder="Enter goal name..."
                  autoFocus
                />
              </div>
              
              <div className="goal-modal__field">
                <label>Goal Description</label>
                <textarea
                  value={newGoalText}
                  onChange={(e) => setNewGoalText(e.target.value)}
                  placeholder="Describe your goal..."
                  rows={3}
                />
              </div>

              <div className="goal-modal__buttons">
                <Button 
                  variant="outlined" 
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="primary"
                  dimensionColor={data.color}
                  onClick={handleAddGoal}
                  disabled={!newGoalName.trim()}
                >
                  Add Goal
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Leave Confirmation Modal */}
      <AnimatePresence>
        {showLeaveModal && (
          <motion.div 
            className="goal-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div 
              className="goal-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              <p className="goal-modal__text">
                Are you sure you want to leave some of these goals empty?
              </p>
              <div className="goal-modal__buttons">
                <Button 
                  variant="outlined" 
                  onClick={() => handleLeaveConfirm(false)}
                >
                  No
                </Button>
                <Button 
                  variant="primary"
                  onClick={() => handleLeaveConfirm(true)}
                >
                  Yes
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
