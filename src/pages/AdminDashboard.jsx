/**
 * Admin Dashboard
 * 
 * Displays aggregate statistics from the Growth Plan Builder app:
 * - Total Users
 * - Total Growth Plans
 * - Total Assessments
 * - Average Dimension Scores (7 dimensions)
 * - Average Question Scores (20 questions)
 * 
 * Protected: Only accessible by users with is_admin = true in user_profiles
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { useAuth } from '../utils/AuthContext';
import { DIMENSIONS, DIMENSION_ORDER } from '../utils/dimensionData';
import Logo from '../components/shared/Logo';
import './AdminDashboard.css';

// Question column mapping for database queries
const QUESTION_COLUMNS = {
  faith: ['faith_q1', 'faith_q2', 'faith_q3'],
  relationships: ['relationships_q1', 'relationships_q2', 'relationships_q3'],
  finances: ['finances_q1', 'finances_q2', 'finances_q3'],
  health: ['health_q1', 'health_q2'], // Only 2 questions
  purpose: ['purpose_q1', 'purpose_q2', 'purpose_q3'],
  character: ['character_q1', 'character_q2', 'character_q3'],
  contentment: ['contentment_q1', 'contentment_q2', 'contentment_q3']
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);

  // Check if user is admin
  useEffect(() => {
    const checkAdminStatus = async () => {
      if (authLoading) return;
      
      if (!user) {
        // Not logged in - redirect to login
        navigate('/login', { state: { from: '/admin' } });
        return;
      }

      // Check is_admin flag from profile or fetch fresh
      if (profile?.is_admin) {
        setIsAdmin(true);
        setCheckingAdmin(false);
      } else {
        // Fetch fresh admin status in case profile doesn't have it yet
        try {
          const { data, error } = await supabase
            .from('user_profiles')
            .select('is_admin')
            .eq('id', user.id)
            .single();

          if (error) throw error;
          
          if (data?.is_admin) {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (err) {
          console.error('Error checking admin status:', err);
          setIsAdmin(false);
        }
        setCheckingAdmin(false);
      }
    };

    checkAdminStatus();
  }, [user, profile, authLoading, navigate]);

  // Fetch stats only if admin
  useEffect(() => {
    if (isAdmin && !checkingAdmin) {
      fetchStats();
    }
  }, [isAdmin, checkingAdmin]);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Build the select string for all question columns
      const allQuestionColumns = Object.values(QUESTION_COLUMNS).flat();
      const dimensionScoreColumns = DIMENSION_ORDER.map(dim => `${dim}_score`);
      const selectColumns = [...dimensionScoreColumns, ...allQuestionColumns].join(', ');

      // Fetch all data in parallel
      const [
        { data: assessments, error: assessmentError },
        { count: userCount, error: userError },
        { count: assessmentCount, error: countError },
        { count: planCount, error: planError }
      ] = await Promise.all([
        supabase.from('assessments').select(selectColumns),
        supabase.from('user_profiles').select('*', { count: 'exact', head: true }),
        supabase.from('assessments').select('*', { count: 'exact', head: true }),
        supabase.from('growth_plans').select('*', { count: 'exact', head: true })
      ]);

      if (assessmentError) throw assessmentError;
      if (userError) throw userError;
      if (countError) throw countError;
      if (planError) throw planError;

      // Calculate dimension averages
      const dimensionAverages = {};
      DIMENSION_ORDER.forEach(dim => {
        const scoreKey = `${dim}_score`;
        const scores = assessments
          ?.map(a => a[scoreKey])
          .filter(s => s !== null && s !== undefined) || [];
        
        if (scores.length > 0) {
          const sum = scores.reduce((acc, val) => acc + parseFloat(val), 0);
          dimensionAverages[dim] = (sum / scores.length).toFixed(1);
        } else {
          dimensionAverages[dim] = null;
        }
      });

      // Calculate question averages
      const questionAverages = {};
      DIMENSION_ORDER.forEach(dim => {
        questionAverages[dim] = [];
        const columns = QUESTION_COLUMNS[dim];
        
        columns.forEach((col, index) => {
          const scores = assessments
            ?.map(a => a[col])
            .filter(s => s !== null && s !== undefined) || [];
          
          let average = null;
          if (scores.length > 0) {
            const sum = scores.reduce((acc, val) => acc + parseFloat(val), 0);
            average = (sum / scores.length).toFixed(1);
          }
          
          questionAverages[dim].push({
            questionNumber: index + 1,
            columnName: col,
            questionText: DIMENSIONS[dim].questions[index],
            average: average,
            responseCount: scores.length
          });
        });
      });

      setStats({
        dimensionAverages,
        questionAverages,
        totalUsers: userCount || 0,
        totalAssessments: assessmentCount || 0,
        totalPlans: planCount || 0,
      });
    } catch (err) {
      console.error('Error fetching stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || checkingAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__loading">
          <div className="admin-dashboard__spinner" />
          <p>Checking access...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__access-denied">
          <h1>Access Denied</h1>
          <p>You don't have permission to view this page.</p>
          <p className="admin-dashboard__access-email">
            Logged in as: {user?.email}
          </p>
          <button onClick={() => navigate('/home')}>
            Return to App
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__loading">
          <div className="admin-dashboard__spinner" />
          <p>Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__error">
          <p>Error loading statistics:</p>
          <p className="admin-dashboard__error-message">{error}</p>
          <button onClick={fetchStats}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="admin-dashboard__header">
        <h1>Admin Dashboard</h1>
        <button 
          className="admin-dashboard__home-btn"
          onClick={() => navigate('/home')}
        >
          Go to App
        </button>
      </header>

      <main className="admin-dashboard__content">
        {/* Overview Cards */}
        <section className="admin-dashboard__section">
          <h2>Overview</h2>
          <div className="admin-dashboard__cards">
            <div className="admin-dashboard__card">
              <span className="admin-dashboard__card-value">{stats?.totalUsers}</span>
              <span className="admin-dashboard__card-label">Total Users</span>
            </div>
            <div className="admin-dashboard__card">
              <span className="admin-dashboard__card-value">{stats?.totalPlans}</span>
              <span className="admin-dashboard__card-label">Growth Plans</span>
            </div>
            <div className="admin-dashboard__card">
              <span className="admin-dashboard__card-value">{stats?.totalAssessments}</span>
              <span className="admin-dashboard__card-label">Assessments</span>
            </div>
          </div>
        </section>

        {/* Dimension Averages */}
        <section className="admin-dashboard__section">
          <h2>Average Dimension Scores</h2>
          <div className="admin-dashboard__dimension-table">
            {DIMENSION_ORDER.map(dim => {
              const data = DIMENSIONS[dim];
              const score = stats?.dimensionAverages?.[dim];
              const scoreNum = score ? parseFloat(score) : 0;
              
              return (
                <div key={dim} className="admin-dashboard__dimension-row">
                  <div className="admin-dashboard__dimension-info">
                    <Logo
                      type="dimension"
                      dimension={dim}
                      variant="standard"
                      size={32}
                    />
                    <span className="admin-dashboard__dimension-name">
                      {data.name}
                    </span>
                  </div>
                  <div className="admin-dashboard__dimension-score">
                    <div className="admin-dashboard__score-bar-container">
                      <div 
                        className="admin-dashboard__score-bar-fill"
                        style={{ 
                          width: `${(scoreNum / 10) * 100}%`,
                          backgroundColor: data.color 
                        }}
                      />
                    </div>
                    <span 
                      className="admin-dashboard__score-text"
                      style={{ color: data.color }}
                    >
                      {score !== null ? `${score} / 10.0` : 'N/A'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Question Averages */}
        <section className="admin-dashboard__section">
          <h2>Average Question Scores</h2>
          <div className="admin-dashboard__questions">
            {DIMENSION_ORDER.map(dim => {
              const data = DIMENSIONS[dim];
              const questions = stats?.questionAverages?.[dim] || [];
              
              return (
                <div key={dim} className="admin-dashboard__question-group">
                  <div 
                    className="admin-dashboard__question-header"
                    style={{ backgroundColor: data.color }}
                  >
                    <Logo
                      type="dimension"
                      dimension={dim}
                      variant="inverse"
                      size={24}
                    />
                    <span>{data.name}</span>
                  </div>
                  <div className="admin-dashboard__question-list">
                    {questions.map((q, index) => (
                      <div key={index} className="admin-dashboard__question-row">
                        <div className="admin-dashboard__question-text">
                          <span className="admin-dashboard__question-number">
                            Q{q.questionNumber}:
                          </span>
                          {q.questionText}
                        </div>
                        <div className="admin-dashboard__question-score">
                          <span 
                            className="admin-dashboard__question-value"
                            style={{ color: data.color }}
                          >
                            {q.average !== null ? q.average : 'N/A'}
                          </span>
                          <span className="admin-dashboard__question-responses">
                            ({q.responseCount} responses)
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Footer */}
        <footer className="admin-dashboard__footer">
          <p>Data refreshes on page load. Last updated: {new Date().toLocaleString()}</p>
          <button onClick={fetchStats}>Refresh Data</button>
        </footer>
      </main>
    </div>
  );
}
