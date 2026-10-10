import React, { useState } from 'react';
import { TimeRangeFilter, WeeklyTimeseriesResult, UnitSystem, WeeklyBucket } from '../types/workout';
import { formatDistance, formatPace } from '../metrics/formatters';

interface WeeklyChartProps {
  timeseriesData: WeeklyTimeseriesResult;
  selectedRange: TimeRangeFilter;
  onRangeChange: (range: TimeRangeFilter) => void;
  unit: UnitSystem;
}

export const WeeklyChart: React.FC<WeeklyChartProps> = ({
  timeseriesData,
  selectedRange,
  onRangeChange,
  unit,
}) => {
  const [hoveredBucket, setHoveredBucket] = useState<WeeklyBucket | null>(null);

  const {
    buckets,
    averageDistanceKmPerWeek,
    averageDistanceMiPerWeek,
    totalDistanceKm,
    totalDistanceMi,
    totalRuns,
    maxWeekDistanceKm,
    maxWeekDistanceMi,
  } = timeseriesData;

  const avgDistance = unit === 'mi' ? averageDistanceMiPerWeek : averageDistanceKmPerWeek;
  const totalDistance = unit === 'mi' ? totalDistanceMi : totalDistanceKm;
  const maxDistance = unit === 'mi' ? maxWeekDistanceMi : maxWeekDistanceKm;

  // Chart Dimensions
  const svgWidth = 860;
  const svgHeight = 280;
  const padding = { top: 30, right: 75, bottom: 45, left: 55 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Determine Y ceiling: at least 10 or 1.25x max distance
  const yCeiling = Math.max(10, Math.ceil((Math.max(maxDistance, avgDistance * 1.2) * 1.15) / 5) * 5);

  const scaleY = (val: number) => {
    return plotHeight - (val / yCeiling) * plotHeight;
  };

  const avgY = padding.top + scaleY(avgDistance);

  // Bar spacing
  const barCount = Math.max(1, buckets.length);
  const slotWidth = plotWidth / barCount;
  const barWidth = Math.max(6, Math.min(32, slotWidth * 0.7));

  // Determine label step to avoid overlapping text
  const labelStep = Math.max(1, Math.ceil(barCount / 10));

  // Grid steps (4 steps)
  const gridSteps = [0, 0.25, 0.5, 0.75, 1].map((pct) => pct * yCeiling);

  return (
    <section className="section-card weekly-chart-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">Weekly Mileage Timeseries</h2>
          <p className="section-subtitle">
            Average distance run per week across your chosen timeframe.
          </p>
        </div>

        {/* Time range selector pills */}
        <div className="segmented-control">
          {(
            [
              { key: '1M', label: '1 Month' },
              { key: '3M', label: '3 Months' },
              { key: '6M', label: '6 Months' },
              { key: 'YTD', label: 'YTD' },
              { key: '1Y', label: '1 Year' },
              { key: 'ALL', label: 'All Time' },
            ] as const
          ).map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={`segmented-btn ${selectedRange === key ? 'active' : ''}`}
              onClick={() => onRangeChange(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="chart-kpis-grid">
        <div className="kpi-card highlight">
          <span className="kpi-label">Average Distance / Week</span>
          <span className="kpi-value">
            {avgDistance.toFixed(1)} <small>{unit}/wk</small>
          </span>
          <span className="kpi-subtext">Across {buckets.length} weeks in period</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Total Distance</span>
          <span className="kpi-value">
            {totalDistance.toFixed(1)} <small>{unit}</small>
          </span>
          <span className="kpi-subtext">Across {totalRuns} total runs</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Highest Week</span>
          <span className="kpi-value">
            {maxDistance.toFixed(1)} <small>{unit}</small>
          </span>
          <span className="kpi-subtext">Peak weekly volume</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">Total Runs</span>
          <span className="kpi-value">{totalRuns}</span>
          <span className="kpi-subtext">Logged workouts</span>
        </div>
      </div>

      {/* SVG Chart Container */}
      <div className="svg-chart-container">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="timeseries-svg"
          preserveAspectRatio="xMidYMid meet"
          onMouseLeave={() => {
            setHoveredBucket(null);
          }}
        >
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff453a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#ff7043" stopOpacity="0.65" />
            </linearGradient>
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ff453a" stopOpacity="1" />
              <stop offset="100%" stopColor="#ff9f0a" stopOpacity="0.85" />
            </linearGradient>
          </defs>

          {/* Grid lines and Y axis numbers */}
          {gridSteps.map((val) => {
            const y = padding.top + scaleY(val);
            return (
              <g key={val} className="chart-grid-line">
                <line
                  x1={padding.left}
                  y1={y}
                  x2={svgWidth - padding.right}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray={val === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={padding.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="chart-axis-label"
                  fontSize="11"
                  fill="#718096"
                >
                  {val.toFixed(0)}
                </text>
              </g>
            );
          })}

          {/* Average Line */}
          {avgDistance > 0 && (
            <g className="chart-avg-line-group">
              <line
                x1={padding.left}
                y1={avgY}
                x2={svgWidth - padding.right}
                y2={avgY}
                stroke="#ff453a"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              {/* Avg label badge on the right */}
              <rect
                x={svgWidth - padding.right + 6}
                y={avgY - 11}
                width={62}
                height={20}
                rx={4}
                fill="#ff453a"
              />
              <text
                x={svgWidth - padding.right + 37}
                y={avgY + 3}
                textAnchor="middle"
                fontSize="10"
                fontWeight="600"
                fill="#ffffff"
              >
                Avg {avgDistance.toFixed(1)}
              </text>
            </g>
          )}

          {/* Bars */}
          {buckets.map((b, idx) => {
            const dist = unit === 'mi' ? b.totalDistanceMi : b.totalDistanceKm;
            const barH = dist > 0 ? (dist / yCeiling) * plotHeight : 0;
            const x = padding.left + idx * slotWidth + (slotWidth - barWidth) / 2;
            const y = padding.top + plotHeight - barH;
            const isHovered = hoveredBucket === b;

            return (
              <g
                key={b.weekKey}
                className="chart-bar-group"
                onMouseEnter={() => {
                  setHoveredBucket(b);
                }}
              >
                {/* Invisible hover hotspot */}
                <rect
                  x={padding.left + idx * slotWidth}
                  y={padding.top}
                  width={slotWidth}
                  height={plotHeight}
                  fill="transparent"
                  cursor="pointer"
                />

                {/* Actual Bar */}
                {barH > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx={Math.min(4, barWidth / 2)}
                    fill={isHovered ? 'url(#barGradientHover)' : 'url(#barGradient)'}
                    className="chart-bar-rect"
                  />
                ) : (
                  /* Zero indicator dot */
                  <circle
                    cx={x + barWidth / 2}
                    cy={padding.top + plotHeight}
                    r={1.5}
                    fill="#cbd5e0"
                  />
                )}

                {/* X Axis Date Labels */}
                {idx % labelStep === 0 && (
                  <text
                    x={x + barWidth / 2}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    className="chart-axis-label"
                    fontSize="10"
                    fill="#718096"
                  >
                    {b.weekStart.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredBucket && (
          <div
            className="chart-tooltip"
            style={{
              position: 'absolute',
              top: 15,
              right: 25,
            }}
          >
            <div className="tooltip-week-label">{hoveredBucket.weekLabel}</div>
            <div className="tooltip-metric-row">
              <span className="tooltip-metric-label">Distance:</span>
              <span className="tooltip-metric-value">
                {formatDistance(hoveredBucket.totalDistanceKm, unit)}
              </span>
            </div>
            <div className="tooltip-metric-row">
              <span className="tooltip-metric-label">Workouts:</span>
              <span className="tooltip-metric-value">
                {hoveredBucket.runCount} run{hoveredBucket.runCount === 1 ? '' : 's'}
              </span>
            </div>
            {hoveredBucket.runCount > 0 && (
              <div className="tooltip-metric-row">
                <span className="tooltip-metric-label">Avg Pace:</span>
                <span className="tooltip-metric-value">
                  {formatPace(
                    unit === 'mi'
                      ? hoveredBucket.averagePaceMinPerMi
                      : hoveredBucket.averagePaceMinPerKm,
                    unit
                  )}
                </span>
              </div>
            )}
            {avgDistance > 0 && hoveredBucket.totalDistanceKm > 0 && (
              <div className="tooltip-diff">
                {(() => {
                  const currentDist =
                    unit === 'mi' ? hoveredBucket.totalDistanceMi : hoveredBucket.totalDistanceKm;
                  const diff = ((currentDist - avgDistance) / avgDistance) * 100;
                  const isAbove = diff >= 0;
                  return (
                    <span className={isAbove ? 'diff-positive' : 'diff-negative'}>
                      {isAbove ? '▲' : '▼'} {Math.abs(diff).toFixed(0)}% vs weekly average
                    </span>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
};
