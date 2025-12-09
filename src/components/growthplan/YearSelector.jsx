import { useState } from 'react';
import { motion } from 'framer-motion';
import Button from '../shared/Button';
import './YearSelector.css';

const YEARS = Array.from({ length: 20 }, (_, i) => 2026 + i);

export default function YearSelector({ mode, onSelect, onBack, loading }) {
  const [selectedYear, setSelectedYear] = useState(null);

  const getModeText = () => {
    switch (mode) {
      case 'create': return 'Create a growth plan for:';
      case 'view': return 'View growth plan for:';
      case 'edit': return 'Edit growth plan for:';
      default: return 'Select a year:';
    }
  };

  const handleConfirm = () => {
    if (selectedYear) {
      onSelect(selectedYear);
    }
  };

  return (
    <motion.div 
      className="year-selector"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <h2 className="year-selector__title">{getModeText()}</h2>
      
      <div className="year-selector__dropdown">
        <select
          value={selectedYear || ''}
          onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
          className="year-selector__select"
          disabled={loading}
        >
          <option value="" disabled>Select a year</option>
          {YEARS.map(year => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
        <span className="year-selector__arrow">▼</span>
      </div>

      <div className="year-selector__buttons">
        <Button
          variant="primary"
          fullWidth
          onClick={handleConfirm}
          disabled={!selectedYear || loading}
        >
          {loading ? 'Loading...' : 'Continue'}
        </Button>
        
        <button 
          className="year-selector__back"
          onClick={onBack}
          disabled={loading}
        >
          ← Back
        </button>
      </div>
    </motion.div>
  );
}
