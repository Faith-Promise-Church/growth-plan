import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../utils/AuthContext';
import { supabase } from '../utils/supabaseClient';
import { DIMENSIONS, DIMENSION_ORDER } from '../utils/dimensionData';
import { generateGrowthPlanPDF } from '../utils/pdfExport';
import YearSelector from '../components/growthplan/YearSelector';
import DimensionSplashSequence from '../components/growthplan/DimensionSplashSequence';
import GoalBuilder from '../components/growthplan/GoalBuilder';
import DimensionList from '../components/growthplan/DimensionList';
import ViewPlan from '../components/growthplan/ViewPlan';
import Button from '../components/shared/Button';
import Logo from '../components/shared/Logo';
import './GrowthPlanPage.css';

export default function GrowthPlanPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  // View states: 'menu' | 'year-select' | 'workflow-select' | 'walk-through' | 
  //              'choose-dimensions' | 'splash-sequence' | 'builder' | 'view' | 'completion'
  const [view, setView] = useState('menu');
  const [mode, setMode] = useState(null); // 'create' | 'view' | 'edit' | 'export'
  const [selectedYear, setSelectedYear] = useState(null);
  const [workflowType, setWorkflowType] = useState(null); // 'walk-through' | 'choose'
  const [currentDimensionIndex, setCurrentDimensionIndex] = useState(0);
  const [selectedDimension, setSelectedDimension] = useState(null);
  const [completedDimensions, setCompletedDimensions] = useState([]);
  const [existingPlan, setExistingPlan] = useState(null);
  const [existingGoals, setExistingGoals] = useState({});
  const [loading, setLoading] = useState(false);
  const [hasPlans, setHasPlans] = useState(false);

  const currentDimension = DIMENSION_ORDER[currentDimensionIndex];

  // Check if user has any growth plans on mount
  useEffect(() => {
    const checkForAnyPlans = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('growth_plans')
          .select('id')
          .eq('user_id', user.id)
          .limit(1);
        
        if (!error && data && data.length > 0) {
          setHasPlans(true);
        }
      } catch (err) {
        console.error('Error checking for plans:', err);
      }
    };
    
    checkForAnyPlans();
  }, [user]);

  // Check for existing plan when year is selected
  const checkExistingPlan = async (year) => {
    if (!user) return null;

    try {
      const { data: plan, error: planError } = await supabase
        .from('growth_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('year', year)
        .single();

      if (planError && planError.code !== 'PGRST116') {
        throw planError;
      }

      if (plan) {
        // Load goals for this plan
        const { data: goals, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('growth_plan_id', plan.id)
          .order('sort_order');

        if (goalsError) throw goalsError;

        // Group goals by dimension
        const groupedGoals = {};
        goals?.forEach(goal => {
          if (!groupedGoals[goal.dimension]) {
            groupedGoals[goal.dimension] = [];
          }
          groupedGoals[goal.dimension].push(goal);
        });

        setExistingPlan(plan);
        setExistingGoals(groupedGoals);
        
        // Set completed dimensions based on existing goals
        const completed = Object.keys(groupedGoals);
        setCompletedDimensions(completed);

        return plan;
      }

      setExistingPlan(null);
      setExistingGoals({});
      setCompletedDimensions([]);
      return null;
    } catch (err) {
      console.error('Error checking existing plan:', err);
      return null;
    }
  };

  const handleModeSelect = (selectedMode) => {
    setMode(selectedMode);
    setView('year-select');
  };

  const handleYearSelect = async (year) => {
    setSelectedYear(year);
    setLoading(true);

    const plan = await checkExistingPlan(year);

    if (mode === 'create') {
      if (plan) {
        // Plan exists for this year
        const confirm = window.confirm(`You already have a plan for ${year}. Edit instead?`);
        if (confirm) {
          setMode('edit');
          setView('choose-dimensions');
        } else {
          setSelectedYear(null);
        }
      } else {
        setView('workflow-select');
      }
    } else if (mode === 'view') {
      if (plan) {
        setView('view');
      } else {
        const confirm = window.confirm(`You don't have a plan for ${year} yet. Create one?`);
        if (confirm) {
          setMode('create');
          setView('workflow-select');
        } else {
          setSelectedYear(null);
          setView('year-select');
        }
      }
    } else if (mode === 'edit') {
      if (plan) {
        setView('choose-dimensions');
      } else {
        alert(`No plan found for ${year}. Create one first.`);
        setMode('create');
        setView('workflow-select');
      }
    } else if (mode === 'export') {
      if (plan) {
        // Need to fetch goals fresh since existingGoals state may not be updated yet
        try {
          const { data: goals, error: goalsError } = await supabase
            .from('goals')
            .select('*')
            .eq('growth_plan_id', plan.id)
            .order('sort_order');

          if (goalsError) throw goalsError;

          // Group goals by dimension
          const groupedGoals = {};
          goals?.forEach(goal => {
            if (!groupedGoals[goal.dimension]) {
              groupedGoals[goal.dimension] = [];
            }
            groupedGoals[goal.dimension].push(goal);
          });

          // Trigger PDF export with freshly fetched goals
          handleExportPDF(year, groupedGoals);
        } catch (err) {
          console.error('Error fetching goals for export:', err);
          alert('Error loading goals for export. Please try again.');
        }
        setView('menu');
        setSelectedYear(null);
      } else {
        alert(`No plan found for ${year}. Create one first.`);
        setView('menu');
        setSelectedYear(null);
      }
    }

    setLoading(false);
  };

  const handleWorkflowSelect = (type) => {
    setWorkflowType(type);
    setCurrentDimensionIndex(0);
    
    if (type === 'walk-through') {
      setView('splash-sequence');
    } else {
      setView('choose-dimensions');
    }
  };

  const handleSplashComplete = () => {
    setView('builder');
  };

  // PDF Export handler - generates and downloads PDF
  const handleExportPDF = async (year, goals) => {
    try {
      console.log('Generating PDF for year:', year);
      
      // Get user's first name from auth context or profile
      const firstName = profile?.first_name || user?.user_metadata?.first_name || 'User';
      
      // Prepare data for PDF
      const planData = {
        year: year,
        goals: goals
      };
      
      const userData = {
        firstName: firstName
      };
      
      // Generate and download PDF
      const filename = await generateGrowthPlanPDF(planData, userData);
      console.log('PDF generated successfully:', filename);
      
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  const handleBuilderComplete = async (goals) => {
    // Save goals for this dimension
    try {
      // Create or get the growth plan
      let planId = existingPlan?.id;
      
      if (!planId) {
        const { data: newPlan, error: planError } = await supabase
          .from('growth_plans')
          .upsert({ 
            user_id: user.id, 
            year: selectedYear 
          }, {
            onConflict: 'user_id,year'
          })
          .select()
          .single();

        if (planError) throw planError;
        planId = newPlan.id;
        setExistingPlan(newPlan);
        setHasPlans(true);
      }

      // Delete existing goals for this dimension
      await supabase
        .from('goals')
        .delete()
        .eq('growth_plan_id', planId)
        .eq('dimension', selectedDimension || currentDimension);

      // Insert new goals
      const goalsToInsert = goals.map((goal, index) => ({
        growth_plan_id: planId,
        dimension: selectedDimension || currentDimension,
        discipline: goal.discipline || null,
        goal_name: goal.name,
        goal_text: goal.text,
        is_mandatory: goal.isMandatory,
        sort_order: index,
      }));

      if (goalsToInsert.length > 0) {
        const { error: goalsError } = await supabase
          .from('goals')
          .insert(goalsToInsert);

        if (goalsError) throw goalsError;
      }

      // Update local state
      const dim = selectedDimension || currentDimension;
      setExistingGoals(prev => ({
        ...prev,
        [dim]: goalsToInsert,
      }));

      if (!completedDimensions.includes(dim)) {
        setCompletedDimensions(prev => [...prev, dim]);
      }

      // Navigate to next step
      if (workflowType === 'walk-through') {
        if (currentDimensionIndex < DIMENSION_ORDER.length - 1) {
          setCurrentDimensionIndex(currentDimensionIndex + 1);
          setView('splash-sequence');
        } else {
          setView('completion');
        }
      } else {
        // Choose workflow - return to dimension list
        setView('choose-dimensions');
        setSelectedDimension(null);
      }
    } catch (err) {
      console.error('Error saving goals:', err);
      alert('Error saving goals. Please try again.');
    }
  };

  const handleDimensionSelect = (dimension) => {
    setSelectedDimension(dimension);
    
    if (mode === 'edit') {
      setView('builder');
    } else {
      setView('splash-sequence');
    }
  };

  const handleBackFromBuilder = () => {
    if (workflowType === 'walk-through') {
      if (currentDimensionIndex > 0) {
        setCurrentDimensionIndex(currentDimensionIndex - 1);
        setView('splash-sequence');
      } else {
        setView('workflow-select');
      }
    } else {
      setView('choose-dimensions');
      setSelectedDimension(null);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'year-select':
        return (
          <YearSelector
            mode={mode}
            onSelect={handleYearSelect}
            onBack={() => setView('menu')}
            loading={loading}
          />
        );

      case 'workflow-select':
        return (
          <motion.div 
            className="growth-plan-workflow"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h2 className="growth-plan-workflow__title">
              Create your {selectedYear} Growth Plan
            </h2>
            <p className="growth-plan-workflow__subtitle">
              How would you like to build your plan?
            </p>
            
            <div className="growth-plan-workflow__buttons">
              <Button
                variant="primary"
                fullWidth
                onClick={() => handleWorkflowSelect('walk-through')}
              >
                Walk Me Through
              </Button>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => handleWorkflowSelect('choose')}
              >
                I'll Choose What I Work On
              </Button>
            </div>
            
            <button 
              className="growth-plan-workflow__back"
              onClick={() => setView('year-select')}
            >
              ← Back
            </button>
          </motion.div>
        );

      case 'splash-sequence':
        return (
          <DimensionSplashSequence
            dimension={selectedDimension || currentDimension}
            onComplete={handleSplashComplete}
          />
        );

      case 'builder':
        return (
          <GoalBuilder
            dimension={selectedDimension || currentDimension}
            existingGoals={existingGoals[selectedDimension || currentDimension]}
            onComplete={handleBuilderComplete}
            onBack={handleBackFromBuilder}
            isEdit={mode === 'edit'}
          />
        );

      case 'choose-dimensions':
        return (
          <DimensionList
            year={selectedYear}
            completedDimensions={completedDimensions}
            onSelect={handleDimensionSelect}
            onBack={() => {
              if (mode === 'edit') {
                setView('menu');
              } else {
                setView('workflow-select');
              }
            }}
            onDone={() => setView('completion')}
            mode={mode}
          />
        );

      case 'view':
        return (
          <ViewPlan
            year={selectedYear}
            goals={existingGoals}
            onBack={() => setView('menu')}
            onEdit={() => {
              setMode('edit');
              setView('choose-dimensions');
            }}
            onExportPDF={() => handleExportPDF(selectedYear, existingGoals)}
          />
        );

      case 'completion':
        return (
          <motion.div 
            className="growth-plan-completion"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="growth-plan-completion__content">
              <h1 className="growth-plan-completion__title">
                Congratulations!
              </h1>
              <p className="growth-plan-completion__text">
                You're on your way to a stronger {selectedYear}!
              </p>
            </div>
            
            <div className="growth-plan-completion__buttons">
              <Button
                variant="primary-on-color"
                fullWidth
                onClick={() => {
                  setView('view');
                }}
              >
                View My Growth Plan
              </Button>
              <Button
                variant="outlined-on-color"
                fullWidth
                onClick={() => navigate('/home')}
              >
                Return Home
              </Button>
            </div>
          </motion.div>
        );

      default:
        return (
          <motion.div 
            className="growth-plan-menu"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="growth-plan-menu__container">
              {/* Logo replaces text title */}
              <Logo
                type="app"
                appLogo="growth-plan-dark"
                className="growth-plan-menu__logo"
              />
              <p className="growth-plan-menu__description">
                Create a plan to grow in every area of your life.
              </p>
              
              <div className="growth-plan-menu__buttons">
                <Button
                  variant="primary"
                  fullWidth
                  onClick={() => handleModeSelect('create')}
                >
                  Create a Growth Plan
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleModeSelect('view')}
                  disabled={!hasPlans}
                  className={!hasPlans ? 'disabled' : ''}
                  title={!hasPlans ? 'Create a plan first' : ''}
                >
                  View My Growth Plan
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleModeSelect('edit')}
                  disabled={!hasPlans}
                  className={!hasPlans ? 'disabled' : ''}
                  title={!hasPlans ? 'Create a plan first' : ''}
                >
                  Edit My Growth Plan
                </Button>
                <Button
                  variant="outlined"
                  fullWidth
                  onClick={() => handleModeSelect('export')}
                  disabled={!hasPlans}
                  className={!hasPlans ? 'disabled' : ''}
                  title={!hasPlans ? 'Create a plan first' : ''}
                >
                  Export Plan as PDF
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
    <div className={`growth-plan-page ${view === 'completion' ? 'growth-plan-page--completion' : ''}`}>
      <AnimatePresence mode="wait">
        {renderContent()}
      </AnimatePresence>
    </div>
  );
}
