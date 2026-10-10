import React, { useState } from 'react';
import { RunningWorkout, UnitSystem } from '../types/workout';
import { formatDistance, formatPace, formatTime, formatDate } from '../metrics/formatters';

interface WorkoutTableProps {
  workouts: RunningWorkout[];
  unit: UnitSystem;
}

type SortField = 'date' | 'distance' | 'duration' | 'pace';

export const WorkoutTable: React.FC<WorkoutTableProps> = ({ workouts, unit }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortAsc, setSortAsc] = useState(false);
  const [page, setPage] = useState(0);
  const pageSize = 15;

  const filtered = workouts.filter((w) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      w.sourceName.toLowerCase().includes(term) ||
      formatDate(w.startDate).toLowerCase().includes(term) ||
      w.startDateStr.toLowerCase().includes(term)
    );
  });

  const sorted = [...filtered].sort((a, b) => {
    let diff = 0;
    if (sortField === 'date') {
      diff = a.startDate.getTime() - b.startDate.getTime();
    } else if (sortField === 'distance') {
      diff = a.distanceKm - b.distanceKm;
    } else if (sortField === 'duration') {
      diff = a.durationSeconds - b.durationSeconds;
    } else if (sortField === 'pace') {
      diff = a.paceMinPerKm - b.paceMinPerKm;
    }
    return sortAsc ? diff : -diff;
  });

  const totalPages = Math.ceil(sorted.length / pageSize);
  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
    setPage(0);
  };

  return (
    <section className="section-card workout-table-section">
      <div className="section-header">
        <div>
          <h2 className="section-title">All Running Workouts ({workouts.length})</h2>
          <p className="section-subtitle">
            Comprehensive log of all running workouts parsed from your export.
          </p>
        </div>

        <div className="table-search-box">
          <input
            type="text"
            placeholder="Search by date or device..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(0);
            }}
            className="search-input"
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table className="workout-table">
          <thead>
            <tr>
              <th onClick={() => handleSort('date')} className="sortable">
                Date {sortField === 'date' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('distance')} className="sortable">
                Distance ({unit}) {sortField === 'distance' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('duration')} className="sortable">
                Duration {sortField === 'duration' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th onClick={() => handleSort('pace')} className="sortable">
                Avg Pace {sortField === 'pace' ? (sortAsc ? '▲' : '▼') : ''}
              </th>
              <th>Avg HR</th>
              <th>Calories</th>
              <th>Device / App</th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((w) => {
              const paceVal = unit === 'mi' ? w.paceMinPerMi : w.paceMinPerKm;
              return (
                <tr key={w.id}>
                  <td>
                    <div className="table-date-cell">
                      <span className="table-date-primary">{formatDate(w.startDate)}</span>
                      <span className="table-date-time">
                        {w.startDate.toLocaleTimeString(undefined, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="font-semibold">{formatDistance(w.distanceKm, unit)}</td>
                  <td>{formatTime(w.durationSeconds)}</td>
                  <td>
                    <span className="table-pace-badge">{formatPace(paceVal, unit)}</span>
                  </td>
                  <td>
                    {w.heartRateAvg ? (
                      <span className="hr-badge">❤️ {Math.round(w.heartRateAvg)} bpm</span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{w.calories ? `${Math.round(w.calories)} kcal` : '—'}</td>
                  <td>
                    <div className="table-source-cell">
                      <span className="source-name">{w.sourceName}</span>
                      {w.isIndoor && <span className="indoor-badge">Treadmill</span>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="table-pagination">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
          >
            ← Previous
          </button>
          <span className="pagination-info">
            Page {page + 1} of {totalPages} ({sorted.length} runs)
          </span>
          <button
            type="button"
            className="btn btn-outline btn-sm"
            disabled={page >= totalPages - 1}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
};
