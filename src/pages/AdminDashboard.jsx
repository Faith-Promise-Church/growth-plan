import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../utils/supabaseClient';
import { DIMENSIONS, DIMENSION_ORDER } from '../utils/dimensionData';
import './AdminDashboard.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      
      // Fetch all assessments
      const { data: assessments, error: assessmentError } = await supabase
        .from('assessments')
        .select('faith_score, relationships_score, finances_score, health_score, purpose_score, character_score, contentment_score');

      if (assessmentError) throw assessmentError;

      // Calculate averages
      const averages = {};
      if (assessments && assessments.length > 0) {
        DIMENSION_ORDER.forEach(dim => {
          const scoreKey = `${dim}_score`;
          const scores = assessments
            .map(a => a[scoreKey])
            .filter(s => s !== null && s !== undefined);
          
          if (scores.length > 0) {
            const sum = scores.reduce((acc, val) => acc + parseFloat(val), 0);
            averages[dim] = (sum / scores.length).toFixed(1);
          } else {
            averages[dim] = 'N/A';
          }
        });
      }

      // Fetch counts
      const { count: userCount } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      const { count: assessmentCount } = await supabase
        .from('assessments')
        .select('*', { count: 'exact', head: true });

      const { count: planCount } = await supabase
        .from('growth_plans')
        .select('*', { count: 'exact', head: true });

      setStats({
        averages,
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

  if (loading) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__loading">Loading statistics...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-dashboard">
        <div className="admin-dashboard__error">
          <p>Error loading statistics: {error}</p>
          <button onClick={fetchStats}>Try Again</button>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-dashboard">
      <header className="admin-dashboard__header">
        <h1>Admin Dashboard</h1>
        <button 
          className="admin-dashboard__home"
          onClick={() => navigate('/home')}
        >
          Go to App
        </button>
      </header>

      <main className="admin-dashboard__content">
        <section className="admin-dashboard__section">
          <h2>Overview</h2>
          <div className="admin-dashboard__stats-grid">
            <div className="admin-dashboard__stat-card">
              <span className="admin-dashboard__stat-value">{stats?.totalUsers}</span>
              <span className="admin-dashboard__stat-label">Total Users</span>
            </div>
            <div className="admin-dashboard__stat-card">
              <span className="admin-dashboard__stat-value">{stats?.totalAssessments}</span>
              <span className="admin-dashboard__stat-label">Assessments Taken</span>
            </div>
            <div className="admin-dashboard__stat-card">
              <span className="admin-dashboard__stat-value">{stats?.totalPlans}</span>
              <span className="admin-dashboard__stat-label">Growth Plans Created</span>
            </div>
          </div>
        </section>

        <section className="admin-dashboard__section">
          <h2>Average Assessment Scores</h2>
          <div className="admin-dashboard__scores">
            {DIMENSION_ORDER.map(dim => {
              const data = DIMENSIONS[dim];
              const score = stats?.averages?.[dim];
              
              return (
                <div 
                  key={dim} 
                  className="admin-dashboard__score-row"
                >
                  <span 
                    className="admin-dashboard__score-dot"
                    style={{ backgroundColor: data.color }}
                  />
                  <span className="admin-dashboard__score-name">
                    {data.name}
                  </span>
                  <span 
                    className="admin-dashboard__score-value"
                    style={{ color: data.color }}
                  >
                    {score}
                  </span>
                  <div className="admin-dashboard__score-bar">
                    <div 
                      className="admin-dashboard__score-fill"
                      style={{ 
                        width: score !== 'N/A' ? `${(parseFloat(score) / 10) * 100}%` : '0%',
                        backgroundColor: data.color 
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <footer className="admin-dashboard__footer">
          <p>Data refreshes on page load. Last updated: {new Date().toLocaleString()}</p>
          <button onClick={fetchStats}>Refresh Data</button>
        </footer>
      </main>
    </div>
  );
}
