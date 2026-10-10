import React from 'react';
import { UnitSystem, RunningWorkout } from '../types/workout';
import { formatDate } from '../metrics/formatters';

interface HeaderProps {
  unit: UnitSystem;
  onUnitChange: (unit: UnitSystem) => void;
  onReset: () => void;
  workouts: RunningWorkout[];
}

export const Header: React.FC<HeaderProps> = ({
  unit,
  onUnitChange,
  onReset,
  workouts,
}) => {
  const earliestDate = workouts.length > 0 ? formatDate(workouts[0].startDate) : '';
  const latestDate = workouts.length > 0 ? formatDate(workouts[workouts.length - 1].startDate) : '';

  return (
    <header className="app-header">
      <div className="header-left">
        <div className="logo-group">
          <span className="logo-icon">🏃</span>
          <div>
            <h1 className="header-title">Apple Running Analytics</h1>
            {workouts.length > 0 && (
              <p className="header-subtitle">
                {workouts.length} runs loaded • {earliestDate} to {latestDate}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="header-right">
        <div className="unit-selector-wrapper">
          <span className="unit-selector-label">Unit:</span>
          <div className="segmented-control" role="group" aria-label="Distance Unit Selector">
            <button
              type="button"
              className={`segmented-btn ${unit === 'km' ? 'active' : ''}`}
              onClick={() => onUnitChange('km')}
            >
              Kilometers (km)
            </button>
            <button
              type="button"
              className={`segmented-btn ${unit === 'mi' ? 'active' : ''}`}
              onClick={() => onUnitChange('mi')}
            >
              Miles (mi)
            </button>
          </div>
        </div>

        <button
          type="button"
          className="btn btn-outline btn-sm"
          onClick={onReset}
          title="Open a different Apple Health export ZIP"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          Change File
        </button>
      </div>
    </header>
  );
};
