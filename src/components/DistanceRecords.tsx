import React from 'react';
import { DistanceStatResult, UnitSystem } from '../types/workout';
import { DistanceFilterMode } from '../metrics/distanceStats';
import { formatDistance } from '../metrics/formatters';

interface DistanceRecordsProps {
  stats: DistanceStatResult[];
  unit: UnitSystem;
  mode: DistanceFilterMode;
  onModeChange: (mode: DistanceFilterMode) => void;
}

export const DistanceRecords: React.FC<DistanceRecordsProps> = ({
  stats,
  unit,
  mode,
  onModeChange,
}) => {
  return (
    <section className="section-card distance-records-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Pace Records by Distance Achieved</h2>
          <p className="section-subtitle">
            Average pace and top 3 best paces achieved for standard race and interval distances.
          </p>
        </div>

        <div className="filter-mode-toggle">
          <span className="toggle-label">Distance matching:</span>
          <div className="segmented-control segmented-control-sm">
            <button
              type="button"
              className={`segmented-btn ${mode === 'achieved' ? 'active' : ''}`}
              onClick={() => onModeChange('achieved')}
              title="Includes all runs that covered at least the target distance"
            >
              Runs ≥ Distance
            </button>
            <button
              type="button"
              className={`segmented-btn ${mode === 'bracket' ? 'active' : ''}`}
              onClick={() => onModeChange('bracket')}
              title="Includes runs specifically targeted around this distance (within ±25%)"
            >
              Target Brackets
            </button>
          </div>
        </div>
      </div>

      <div className="distance-cards-grid">
        {stats.map((item) => {
          const { target, isAchieved, totalRuns, formattedAveragePace, top3Paces } = item;
          const displayTargetDistance = formatDistance(target.distanceKm, unit, 1);

          return (
            <div
              key={target.id}
              className={`distance-card ${isAchieved ? 'achieved' : 'unachieved'}`}
            >
              <div className="distance-card-top">
                <div className="distance-title-group">
                  <h3 className="distance-name">{target.name}</h3>
                  <span className="distance-converted">{displayTargetDistance}</span>
                </div>
                <div className={`status-pill ${isAchieved ? 'status-achieved' : 'status-empty'}`}>
                  {isAchieved ? `${totalRuns} run${totalRuns > 1 ? 's' : ''}` : 'No runs yet'}
                </div>
              </div>

              {isAchieved ? (
                <>
                  <div className="avg-pace-box">
                    <span className="avg-pace-label">Average Pace</span>
                    <span className="avg-pace-value">{formattedAveragePace}</span>
                  </div>

                  <div className="top-paces-container">
                    <h4 className="top-paces-title">Top 3 Best Paces</h4>
                    <div className="top-paces-list">
                      {top3Paces.map((p) => {
                        const medal = p.rank === 1 ? '🥇' : p.rank === 2 ? '🥈' : '🥉';
                        return (
                          <div key={p.rank} className="top-pace-item">
                            <div className="pace-rank-badge">
                              <span className="medal-icon">{medal}</span>
                              <span className="rank-num">#{p.rank}</span>
                            </div>
                            <div className="pace-main-info">
                              <span className="top-pace-value">{p.formattedPace}</span>
                              <span className="top-pace-meta">
                                {p.formattedTime} • {p.formattedDistance}
                              </span>
                            </div>
                            <div className="pace-date-source">
                              <span className="pace-date">{p.date}</span>
                              <span className="pace-source">{p.workout.sourceName}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              ) : (
                <div className="unachieved-placeholder">
                  <p className="unachieved-text">
                    You haven’t logged a workout meeting the {target.name} distance ({displayTargetDistance}) yet.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};
