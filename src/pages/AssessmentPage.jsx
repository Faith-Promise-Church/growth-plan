import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../utils/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { DIMENSIONS, DIMENSION_ORDER, calculateDimensionScore } from '../utils/dimensionData';
import DimensionSplash from '../components/assessment/DimensionSplash';
import QuestionScreen from '../components/assessment/QuestionScreen';
import RadarChart from '../components/assessment/RadarChart';
import DimensionScore from '../components/assessment/DimensionScore';
import AssessmentHistory from '../components/assessment/AssessmentHistory';
import Button from '../components/shared/Button';
import './AssessmentPage.css';

export default function AssessmentPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [view, setView] = useState('menu'); // 'menu' | 'splash' | 'questions' | 'results' | 'dimension-detail' | 'history'
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [responses, setResponses] = useState({});
  const [scores, setScores] = useState(null);
  const [previousScores, setPreviousScores] = useState(null);
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasExistingAssessment, setHasExistingAssessment] = useState(false);
  const [history, setHistory] = useState([]);
  const [viewingHistorical, setViewingHistorical] = useState(false);

  const currentDimension = DIMENSION_ORDER[currentDimensionIndex];
  const dimensionData = DIMENSIONS[currentDimension];

  // Check for existing assessment on mount
  useEffect(() => {
    const checkExistingAssessment = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('assessments')
          .select('*')
          .eq('user_id', user.id)
          .order('assessment_date', { ascending: false })
          .limit(1);

        if (data && data.length > 0) {
          setHasExistingAssessment(true);
          setPreviousScores({
            faith: data[0].faith_score,
            relationships: data[0].relationships_score,
            finances: data[0].finances_score,
            health: data[0].health_score,
            purpose: data[0].purpose_score,
            character: data[0].character_score,
            contentment: data[0].contentment_score,
          });
        }
      } catch (err) {
        console.error('Error checking existing assessment:', err);
      }
    };

    checkExistingAssessment();
  }, [user]);

  const startAssessment = () => {
    setResponses({});
    setCurrentDimensionIndex(0);
    setCurrentQuestionIndex(0);
    setView('splash');
  };

  const viewResults = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('assessment_date', { ascending: false })
        .limit(2);

      if (error) throw error;

      if (data && data.length > 0) {
        setScores({
          faith: data[0].faith_score,
          relationships: data[0].relationships_score,
          finances: data[0].finances_score,
          health: data[0].health_score,
          purpose: data[0].purpose_score,
          character: data[0].character_score,
          contentment: data[0].contentment_score,
        });

        // Set previous scores if there's a second assessment
        if (data.length > 1) {
          setPreviousScores({
            faith: data[1].faith_score,
            relationships: data[1].relationships_score,
            finances: data[1].finances_score,
            health: data[1].health_score,
            purpose: data[1].purpose_score,
            character: data[1].character_score,
            contentment: data[1].contentment_score,
          });
        }

        setView('results');
      } else {
        alert("You haven't taken the assessment yet. Take it now?");
        startAssessment();
      }
    } catch (err) {
      console.error('Error loading results:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSplashNext = () => {
    setView('questions');
    setCurrentQuestionIndex(0);
  };

  const handleQuestionNext = (value) => {
    const questionKey = `${currentDimension}_q${currentQuestionIndex + 1}`;
    const updatedResponses = { ...responses, [questionKey]: value };
    setResponses(updatedResponses);

    const totalQuestions = dimensionData.questionsCount;

    if (currentQuestionIndex < totalQuestions - 1) {
      // More questions in this dimension
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else if (currentDimensionIndex < DIMENSION_ORDER.length - 1) {
      // Move to next dimension
      setCurrentDimensionIndex(currentDimensionIndex + 1);
      setView('splash');
    } else {
      // Assessment complete - calculate and save scores
      completeAssessment(updatedResponses);
    }
  };

  const completeAssessment = async (finalResponses) => {
    setLoading(true);
    setView('loading'); // Explicitly set a loading view state

    // Calculate scores for each dimension (outside try so accessible in catch)
    const calculatedScores = {};
    const dbData = {
      user_id: user.id,
      assessment_date: new Date().toISOString(),
    };

    DIMENSION_ORDER.forEach(dim => {
      const dimData = DIMENSIONS[dim];
      const questionResponses = [];
      
      for (let i = 1; i <= dimData.questionsCount; i++) {
        const key = `${dim}_q${i}`;
        const value = finalResponses[key] || 5;
        questionResponses.push(value);
        dbData[key] = value;
      }

      const score = calculateDimensionScore(questionResponses);
      calculatedScores[dim] = parseFloat(score);
      dbData[`${dim}_score`] = parseFloat(score);
    });

    // Helper function to show results
    const showResults = (saved = true) => {
      setScores(calculatedScores);
      setHasExistingAssessment(saved);
      setLoading(false);
      setView('results');
    };

    try {
      console.log('Saving assessment to database...');
      
      // Save to database with a timeout
      const savePromise = supabase
        .from('assessments')
        .insert(dbData);
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Save timeout')), 10000)
      );
      
      const { error } = await Promise.race([savePromise, timeoutPromise]);

      if (error) {
        console.error('Database error:', error);
        throw error;
      }

      console.log('Assessment saved successfully');
      showResults(true);
    } catch (err) {
      console.error('Error saving assessment:', err);
      // Still show results even if save failed - scores are calculated
      showResults(false);
      alert('Note: Could not save to database, but your results are shown below.');
    }
  };

  const handleDimensionClick = (dimension) => {
    setSelectedDimension(dimension);
    setView('dimension-detail');
  };

  const handleBackToResults = () => {
    setView('results');
    setSelectedDimension(null);
  };

  // Helper to extract scores object from a database assessment row
  const extractScoresFromAssessment = (assessment) => ({
    faith: assessment.faith_score,
    relationships: assessment.relationships_score,
    finances: assessment.finances_score,
    health: assessment.health_score,
    purpose: assessment.purpose_score,
    character: assessment.character_score,
    contentment: assessment.contentment_score,
  });

  // Load assessment history
  const loadHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('user_id', user.id)
        .order('assessment_date', { ascending: false })
        .limit(20);

      if (error) {
        console.error('Error loading assessment history:', error);
        return;
      }

      setHistory(data || []);
      setView('history');
    } catch (err) {
      console.error('Error loading history:', err);
    }
  };

  // Handle selecting a historical assessment to view
  const handleSelectHistoricalAssessment = (assessment) => {
    setScores(extractScoresFromAssessment(assessment));
    setPreviousScores(null); // No comparison for historical view
    setViewingHistorical(true);
    setView('results');
  };

  // Handle back from history to current results
  const handleBackFromHistory = () => {
    if (viewingHistorical) {
      // Reload current results
      viewResults();
      setViewingHistorical(false);
    } else {
      setView('results');
    }
  };

  const renderContent = () => {
    // Show loading spinner during assessment completion
    if (view === 'loading' || (loading && view === 'questions')) {
      return (
        <motion.div 
          className="assessment-loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          key="loading"
        >
          <div className="assessment-loading__spinner"></div>
          <p>Calculating your scores...</p>
        </motion.div>
      );
    }

    switch (view) {
      case 'splash':
        return (
          <DimensionSplash
            key={currentDimension}
            dimension={currentDimension}
            onNext={handleSplashNext}
          />
        );
      
      case 'questions':
        return (
          <QuestionScreen
            key={`${currentDimension}-${currentQuestionIndex}`}
            dimension={currentDimension}
            questionIndex={currentQuestionIndex}
            totalQuestions={dimensionData.questionsCount}
            onNext={handleQuestionNext}
            onExit={() => setView('menu')}
            initialValue={responses[`${currentDimension}_q${currentQuestionIndex + 1}`] || 5}
          />
        );
      
      case 'results':
        return (
          <RadarChart
            scores={scores}
            previousScores={previousScores}
            onDimensionClick={handleDimensionClick}
            onRetake={startAssessment}
            onHome={() => navigate('/home')}
            onViewHistory={loadHistory}
          />
        );
      
      case 'dimension-detail':
        return (
          <DimensionScore
            dimension={selectedDimension}
            score={scores[selectedDimension]}
            onBack={handleBackToResults}
          />
        );
      
      case 'history':
        return (
          <AssessmentHistory
            assessments={history}
            onBack={handleBackFromHistory}
            onSelectAssessment={handleSelectHistoricalAssessment}
          />
        );
      
      default:
        return (
          <motion.div 
            className="assessment-menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="assessment-menu__container">
              <h1 className="assessment-menu__title">Flourishing Assessment</h1>
              <p className="assessment-menu__description">
                Measure your growth across 7 dimensions of whole-life flourishing.
              </p>
              
              <div className="assessment-menu__buttons">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={startAssessment}
                >
                  Take the Assessment
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={viewResults}
                  disabled={!hasExistingAssessment || loading}
                >
                  {loading ? 'Loading...' : 'View My Results'}
                </Button>
                
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => navigate('/home')}
                >
                  Back to Home
                </Button>
              </div>
            </div>
          </motion.div>
        );
    }
  };

  return (
    <div className="assessment-page">
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </div>
  );
}
