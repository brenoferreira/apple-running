import React, { useState } from 'react';
import {
  RacePrediction,
  BaselineWorkout,
  RunningWorkout,
  UnitSystem,
} from '../types/workout';
import { formatDistance, formatSpeed, formatTime } from '../metrics/formatters';

interface RacePredictorProps {
  predictions: RacePrediction[];
  baseline: BaselineWorkout | null;
  workouts: RunningWorkout[];
  unit: UnitSystem;
  onBaselineChange: (newBaseline: BaselineWorkout) => void;
}

export const RacePredictor: React.FC<RacePredictorProps> = ({
  predictions,
  baseline,
  workouts,
  unit,
  onBaselineChange,
}) => {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customDistance, setCustomDistance] = useState('5');
  const [customMinutes, setCustomMinutes] = useState('25');
  const [customSeconds, setCustomSeconds] = useState('00');

  // Candidate benchmark runs from history
  const candidateRuns = workouts
    .filter((w) => w.distanceKm >= 2.0 && w.durationSeconds > 0)
    .sort((a, b) => a.paceMinPerKm - b.paceMinPerKm)
    .slice(0, 10);

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const d = parseFloat(customDistance);
    const m = parseFloat(customMinutes) || 0;
    const s = parseFloat(customSeconds) || 0;
    const totalSec = m * 60 + s;

    if (d > 0 && totalSec > 0) {
      onBaselineChange({
        distanceKm: unit === 'mi' ? d * 1.609344 : d,
        durationSeconds: totalSec,
        sourceLabel: `Custom (${d} ${unit} in ${formatTime(totalSec)})`,
      });
      setShowCustomModal(false);
    }
  };

  if (!baseline) {
    return (
      <section className="section-card race-predictor-section">
        <h2 className="section-title">Pete Riegel’s Race Time Predictor</h2>
        <p className="section-subtitle">
          Log at least one run of 1 km or longer to calculate race predictions.
        </p>
      </section>
    );
  }

  return (
    <section className="section-card race-predictor-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Pete Riegel’s Race Time Predictor</h2>
          <p className="section-subtitle">
            Calculated using Pete Riegel’s formula: <code>T₂ = T₁ × (D₂ / D₁)^1.06</code>
          </p>
        </div>

        <div className="predictor-baseline-controls">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowCustomModal(!showCustomModal)}
          >
            {showCustomModal ? 'Close Custom' : 'Custom Baseline...'}
          </button>
        </div>
      </div>

      {/* Current Baseline Indicator */}
      <div className="current-baseline-card">
        <div className="baseline-info-row">
          <div className="baseline-tag">Current Baseline</div>
          <div className="baseline-description">
            <strong>{baseline.sourceLabel}</strong>
            <span className="baseline-detail">
              ({formatDistance(baseline.distanceKm, unit)} in {formatTime(baseline.durationSeconds)})
            </span>
          </div>
        </div>

        {candidateRuns.length > 1 && !showCustomModal && (
          <div className="baseline-switch-row">
            <span className="switch-label">Switch benchmark run:</span>
            <div className="benchmark-chips">
              {candidateRuns.slice(0, 4).map((w) => {
                const isSelected = baseline.workout?.id === w.id;
                return (
                  <button
                    key={w.id}
                    type="button"
                    className={`benchmark-chip ${isSelected ? 'active' : ''}`}
                    onClick={() =>
                      onBaselineChange({
                        distanceKm: w.distanceKm,
                        durationSeconds: w.durationSeconds,
                        sourceLabel: `${formatDistance(w.distanceKm, unit)} run (${formatTime(w.durationSeconds)})`,
                        workout: w,
                      })
                    }
                  >
                    {formatDistance(w.distanceKm, unit, 1)} in {formatTime(w.durationSeconds)}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Custom Baseline Drawer */}
      {showCustomModal && (
        <form className="custom-baseline-form" onSubmit={handleApplyCustom}>
          <div className="form-row">
            <div className="form-group">
              <label>Distance ({unit})</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="100"
                value={customDistance}
                onChange={(e) => setCustomDistance(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Minutes</label>
              <input
                type="number"
                min="0"
                max="300"
                value={customMinutes}
                onChange={(e) => setCustomMinutes(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Seconds</label>
              <input
                type="number"
                min="0"
                max="59"
                value={customSeconds}
                onChange={(e) => setCustomSeconds(e.target.value)}
                required
              />
            </div>
            <div className="form-group form-submit-group">
              <button type="submit" className="btn btn-primary btn-sm">
                Apply Custom
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Prediction Cards Grid */}
      <div className="prediction-cards-grid">
        {predictions.map((pred) => {
          const {
            target,
            predictedFormattedTime,
            predictedFormattedPace,
            predictedSpeedKmh,
            actualBestFormattedTime,
            timeDifferenceSeconds,
          } = pred;

          return (
            <div key={target.id} className="prediction-card">
              <div className="pred-card-header">
                <h3 className="pred-target-name">{target.name}</h3>
                <span className="pred-target-dist">
                  {formatDistance(target.distanceKm, unit, 1)}
                </span>
              </div>

              <div className="pred-main-time">
                <span className="pred-time-value">{predictedFormattedTime}</span>
                <span className="pred-time-label">Predicted Time</span>
              </div>

              <div className="pred-stats-grid">
                <div className="pred-stat-item">
                  <span className="pred-stat-label">Predicted Pace</span>
                  <span className="pred-stat-value">{predictedFormattedPace}</span>
                </div>
                <div className="pred-stat-item">
                  <span className="pred-stat-label">Speed</span>
                  <span className="pred-stat-value">{formatSpeed(predictedSpeedKmh, unit)}</span>
                </div>
              </div>

              <div className="pred-actual-box">
                {actualBestFormattedTime ? (
                  <div className="actual-comparison">
                    <span className="actual-label">Actual Best:</span>
                    <span className="actual-value">{actualBestFormattedTime}</span>
                    {timeDifferenceSeconds !== undefined && (
                      <span
                        className={`actual-diff ${
                          timeDifferenceSeconds <= 0 ? 'faster' : 'slower'
                        }`}
                      >
                        ({timeDifferenceSeconds <= 0 ? '' : '+'}
                        {formatTime(Math.abs(timeDifferenceSeconds))} vs predicted)
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="actual-comparison empty">
                    <span className="actual-label">No actual {target.name} run logged</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
