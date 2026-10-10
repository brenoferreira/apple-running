import {
  RunningWorkout,
  DistanceTarget,
  RacePrediction,
  BaselineWorkout,
  UnitSystem,
} from '../types/workout';
import { formatPace, formatTime, kmToMiles } from './formatters';

export const PREDICTOR_DISTANCE_TARGETS: DistanceTarget[] = [
  {
    id: '5k',
    name: '5K',
    distanceKm: 5.0,
    distanceMi: kmToMiles(5.0),
    description: '5 Kilometers (3.11 miles)',
  },
  {
    id: '10k',
    name: '10K',
    distanceKm: 10.0,
    distanceMi: kmToMiles(10.0),
    description: '10 Kilometers (6.21 miles)',
  },
  {
    id: '15k',
    name: '15K',
    distanceKm: 15.0,
    distanceMi: kmToMiles(15.0),
    description: '15 Kilometers (9.32 miles)',
  },
  {
    id: 'half_marathon',
    name: 'Half Marathon',
    distanceKm: 21.0975,
    distanceMi: 13.1094,
    description: '21.1 km (13.11 miles)',
  },
  {
    id: 'marathon',
    name: 'Marathon',
    distanceKm: 42.195,
    distanceMi: 26.2188,
    description: '42.2 km (26.22 miles)',
  },
];

/**
 * Standard Pete Riegel exponent: 1.06
 * T2 = T1 * (D2 / D1)^1.06
 */
export const RIEGEL_EXPONENT = 1.06;

/**
 * Pure function: Calculates predicted race time using Pete Riegel's formula
 */
export function calculateRiegelTime(
  t1Seconds: number,
  d1Km: number,
  d2Km: number,
  exponent: number = RIEGEL_EXPONENT
): number {
  if (t1Seconds <= 0 || d1Km <= 0 || d2Km <= 0) return 0;
  return t1Seconds * Math.pow(d2Km / d1Km, exponent);
}

/**
 * Automatically determines the best benchmark baseline workout from user's running history.
 * Prefers established race distances (e.g., fastest 5k or 10k run, or fastest run >= 3km).
 */
export function findBestBaselineWorkout(workouts: RunningWorkout[]): BaselineWorkout | null {
  if (workouts.length === 0) return null;

  // Filter valid runs with distance >= 3 km
  const candidateRuns = workouts.filter((w) => w.distanceKm >= 3.0 && w.durationSeconds > 0);

  if (candidateRuns.length === 0) {
    // If no run >= 3km, take the longest run >= 1km
    const shortRuns = workouts.filter((w) => w.distanceKm >= 1.0 && w.durationSeconds > 0);
    if (shortRuns.length === 0) return null;
    const longest = [...shortRuns].sort((a, b) => b.distanceKm - a.distanceKm)[0];
    return {
      distanceKm: longest.distanceKm,
      durationSeconds: longest.durationSeconds,
      sourceLabel: `Best run (${longest.distanceKm.toFixed(2)} km)`,
      workout: longest,
    };
  }

  // Look for 5km candidate (between 4.8 and 6.0 km)
  const fiveKs = candidateRuns.filter((w) => w.distanceKm >= 4.8 && w.distanceKm <= 6.0);
  if (fiveKs.length > 0) {
    const fastest5k = [...fiveKs].sort((a, b) => a.paceMinPerKm - b.paceMinPerKm)[0];
    return {
      distanceKm: 5.0,
      durationSeconds: fastest5k.paceMinPerKm * 60 * 5.0,
      sourceLabel: `Fastest 5K (${fastest5k.distanceKm.toFixed(2)} km in ${formatTime(fastest5k.durationSeconds)})`,
      workout: fastest5k,
    };
  }

  // Look for 10km candidate
  const tenKs = candidateRuns.filter((w) => w.distanceKm >= 9.5 && w.distanceKm <= 11.0);
  if (tenKs.length > 0) {
    const fastest10k = [...tenKs].sort((a, b) => a.paceMinPerKm - b.paceMinPerKm)[0];
    return {
      distanceKm: 10.0,
      durationSeconds: fastest10k.paceMinPerKm * 60 * 10.0,
      sourceLabel: `Fastest 10K (${fastest10k.distanceKm.toFixed(2)} km in ${formatTime(fastest10k.durationSeconds)})`,
      workout: fastest10k,
    };
  }

  // Otherwise, take the fastest pace run >= 3km
  const fastestGeneral = [...candidateRuns].sort((a, b) => a.paceMinPerKm - b.paceMinPerKm)[0];
  return {
    distanceKm: fastestGeneral.distanceKm,
    durationSeconds: fastestGeneral.durationSeconds,
    sourceLabel: `${fastestGeneral.distanceKm.toFixed(2)} km run in ${formatTime(fastestGeneral.durationSeconds)}`,
    workout: fastestGeneral,
  };
}

/**
 * Pure function: Generates predictions for 5k, 10k, 15k, Half Marathon, Marathon
 */
export function generateRacePredictions(
  baseline: BaselineWorkout,
  workouts: RunningWorkout[],
  unit: UnitSystem,
  targets: DistanceTarget[] = PREDICTOR_DISTANCE_TARGETS
): RacePrediction[] {
  return targets.map((target) => {
    const predictedSeconds = calculateRiegelTime(
      baseline.durationSeconds,
      baseline.distanceKm,
      target.distanceKm
    );

    const predictedMinutes = predictedSeconds / 60;
    const predictedPaceMinPerKm = predictedMinutes / target.distanceKm;
    const predictedPaceMinPerMi = predictedPaceMinPerKm / kmToMiles(1.0);

    const predictedSpeedKmh = (target.distanceKm / predictedMinutes) * 60;
    const predictedSpeedMph = predictedSpeedKmh * kmToMiles(1.0);

    // Look for actual best workout for this distance if available (>= 0.98 * target)
    const qualifyingRuns = workouts.filter((w) => w.distanceKm >= target.distanceKm * 0.98);
    let actualBestWorkout: RunningWorkout | undefined;
    let actualBestFormattedTime: string | undefined;
    let timeDifferenceSeconds: number | undefined;

    if (qualifyingRuns.length > 0) {
      // Sort by pace ascending
      const sorted = [...qualifyingRuns].sort((a, b) => a.paceMinPerKm - b.paceMinPerKm);
      actualBestWorkout = sorted[0];
      // Normalize actual time to the exact target distance for fair comparison
      const actualTargetTimeSeconds = actualBestWorkout.paceMinPerKm * 60 * target.distanceKm;
      actualBestFormattedTime = formatTime(actualTargetTimeSeconds);
      timeDifferenceSeconds = actualTargetTimeSeconds - predictedSeconds;
    }

    const activePace = unit === 'mi' ? predictedPaceMinPerMi : predictedPaceMinPerKm;

    return {
      target,
      predictedSeconds,
      predictedFormattedTime: formatTime(predictedSeconds),
      predictedPaceMinPerKm,
      predictedPaceMinPerMi,
      predictedFormattedPace: formatPace(activePace, unit),
      predictedSpeedKmh,
      predictedSpeedMph,
      actualBestWorkout,
      actualBestFormattedTime,
      timeDifferenceSeconds,
    };
  });
}
