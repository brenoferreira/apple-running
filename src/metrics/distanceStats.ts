import {
  RunningWorkout,
  DistanceTarget,
  DistanceStatResult,
  BestPaceRecord,
  UnitSystem,
} from '../types/workout';
import { formatPace, formatTime, formatDistance, formatDate, kmToMiles } from './formatters';

export const STANDARD_DISTANCE_TARGETS: DistanceTarget[] = [
  {
    id: '1k',
    name: '1 km',
    distanceKm: 1.0,
    distanceMi: kmToMiles(1.0),
    description: '1 Kilometer sprint/interval',
  },
  {
    id: '3k',
    name: '3 km',
    distanceKm: 3.0,
    distanceMi: kmToMiles(3.0),
    description: '3 Kilometers speed run',
  },
  {
    id: '5k',
    name: '5 km',
    distanceKm: 5.0,
    distanceMi: kmToMiles(5.0),
    description: '5 Kilometers classic road race',
  },
  {
    id: '10k',
    name: '10 km',
    distanceKm: 10.0,
    distanceMi: kmToMiles(10.0),
    description: '10 Kilometers endurance race',
  },
  {
    id: '15k',
    name: '15 km',
    distanceKm: 15.0,
    distanceMi: kmToMiles(15.0),
    description: '15 Kilometers long distance',
  },
  {
    id: 'half_marathon',
    name: 'Half Marathon',
    distanceKm: 21.0975,
    distanceMi: 13.1094,
    description: '21.1 km / 13.1 miles',
  },
  {
    id: 'marathon',
    name: 'Marathon',
    distanceKm: 42.195,
    distanceMi: 26.2188,
    description: '42.2 km / 26.2 miles',
  },
];

/**
 * Filter mode:
 * - 'achieved': Any workout whose total distance >= target distance (with a small 2% GPS tolerance).
 * - 'bracket': Workouts whose distance is close to the target distance (e.g. ±25%).
 */
export type DistanceFilterMode = 'achieved' | 'bracket';

/**
 * Check if a workout qualifies for a distance target
 */
export function qualifiesForDistance(
  workout: RunningWorkout,
  target: DistanceTarget,
  mode: DistanceFilterMode = 'achieved'
): boolean {
  if (workout.distanceKm <= 0 || workout.durationMinutes <= 0) return false;

  const minThreshold = target.distanceKm * 0.98; // 2% tolerance for GPS measurement error

  if (mode === 'achieved') {
    return workout.distanceKm >= minThreshold;
  }

  // Bracket mode: run is within [target * 0.95, target * 1.35]
  const lowerBound = target.distanceKm * 0.95;
  const upperBound = target.distanceKm * 1.35;
  return workout.distanceKm >= lowerBound && workout.distanceKm <= upperBound;
}

/**
 * Pure function: calculates average pace and top 3 best paces per distance target
 */
export function computeDistanceStats(
  workouts: RunningWorkout[],
  unit: UnitSystem,
  targets: DistanceTarget[] = STANDARD_DISTANCE_TARGETS,
  mode: DistanceFilterMode = 'achieved'
): DistanceStatResult[] {
  return targets.map((target) => {
    // 1. Filter qualifying runs using native Array.filter
    const qualifying = workouts.filter((w) => qualifiesForDistance(w, target, mode));

    if (qualifying.length === 0) {
      return {
        target,
        isAchieved: false,
        totalRuns: 0,
        averagePaceMinPerKm: 0,
        averagePaceMinPerMi: 0,
        formattedAveragePace: '--:--',
        top3Paces: [],
      };
    }

    // 2. Sort by fastest pace (lowest min/km)
    // Creating a copy so input array is never mutated
    const sorted = [...qualifying].sort((a, b) => a.paceMinPerKm - b.paceMinPerKm);

    // 3. Compute average pace across all qualifying workouts
    // Using total duration / total distance for weighted true average pace
    const totalDurationMinutes = qualifying.reduce((sum, w) => sum + w.durationMinutes, 0);
    const totalDistanceKm = qualifying.reduce((sum, w) => sum + w.distanceKm, 0);

    const averagePaceMinPerKm = totalDistanceKm > 0 ? totalDurationMinutes / totalDistanceKm : 0;
    const averagePaceMinPerMi = averagePaceMinPerKm / kmToMiles(1.0);

    // 4. Extract top 3 best paces
    const top3Paces: BestPaceRecord[] = sorted.slice(0, 3).map((w, index) => {
      const paceVal = unit === 'mi' ? w.paceMinPerMi : w.paceMinPerKm;
      return {
        rank: index + 1,
        workout: w,
        paceMinPerKm: w.paceMinPerKm,
        paceMinPerMi: w.paceMinPerMi,
        formattedPace: formatPace(paceVal, unit),
        formattedTime: formatTime(w.durationSeconds),
        formattedDistance: formatDistance(w.distanceKm, unit),
        date: formatDate(w.startDate),
      };
    });

    const activeAvgPace = unit === 'mi' ? averagePaceMinPerMi : averagePaceMinPerKm;

    return {
      target,
      isAchieved: true,
      totalRuns: qualifying.length,
      averagePaceMinPerKm,
      averagePaceMinPerMi,
      formattedAveragePace: formatPace(activeAvgPace, unit),
      top3Paces,
    };
  });
}
