import { RunningWorkout, TimeRangeFilter, WeeklyBucket, WeeklyTimeseriesResult } from '../types/workout';
import { kmToMiles } from './formatters';

/**
 * Gets the Monday of the week for a given date (00:00:00.000)
 */
export function getMondayOfWeek(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0 is Sunday, 1 is Monday, ...
  const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

/**
 * Format a week range label, e.g., "Sep 15 - Sep 21"
 */
function formatWeekLabel(startDate: Date, endDate: Date): string {
  const startStr = startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const endStr = endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return `${startStr} – ${endStr}`;
}

/**
 * Formats a unique week key, e.g. "2026-W38"
 */
function getWeekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo.toString().padStart(2, '0')}`;
}

/**
 * Computes the date range boundary for a given TimeRangeFilter
 */
export function getTimeRangeBoundary(
  range: TimeRangeFilter,
  referenceDate: Date
): { startDate: Date; endDate: Date } {
  const endDate = new Date(referenceDate);
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date(referenceDate);
  startDate.setHours(0, 0, 0, 0);

  switch (range) {
    case '1M':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '3M':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '6M':
      startDate.setDate(startDate.getDate() - 180);
      break;
    case 'YTD':
      startDate.setMonth(0, 1);
      break;
    case '1Y':
      startDate.setDate(startDate.getDate() - 365);
      break;
    case 'ALL':
      // far in the past
      startDate.setFullYear(2000, 0, 1);
      break;
  }

  return { startDate, endDate };
}

/**
 * Pure function: Groups running workouts by week and calculates timeseries metrics
 */
export function computeWeeklyTimeseries(
  workouts: RunningWorkout[],
  range: TimeRangeFilter = '3M',
  customRefDate?: Date
): WeeklyTimeseriesResult {
  if (workouts.length === 0) {
    return {
      buckets: [],
      averageDistanceKmPerWeek: 0,
      averageDistanceMiPerWeek: 0,
      totalDistanceKm: 0,
      totalDistanceMi: 0,
      totalRuns: 0,
      activeWeeksCount: 0,
      totalWeeksCount: 0,
      maxWeekDistanceKm: 0,
      maxWeekDistanceMi: 0,
    };
  }

  // Find latest workout date to anchor relative filters
  const latestWorkoutDate = workouts.reduce((latest, w) => {
    return w.startDate > latest ? w.startDate : latest;
  }, workouts[0].startDate);

  // Use customRefDate, or latest workout date, or now
  const refDate = customRefDate ?? (latestWorkoutDate > new Date() ? latestWorkoutDate : latestWorkoutDate);

  const { startDate, endDate } = getTimeRangeBoundary(range, refDate);

  // If 'ALL', set startDate to the earliest workout date
  const effectiveStartDate =
    range === 'ALL'
      ? workouts.reduce((earliest, w) => (w.startDate < earliest ? w.startDate : earliest), workouts[0].startDate)
      : startDate;

  // Filter workouts that fall inside [effectiveStartDate, endDate]
  const filteredWorkouts = workouts.filter(
    (w) => w.startDate >= effectiveStartDate && w.startDate <= endDate
  );

  // Generate continuous weekly buckets from start to end
  const startMonday = getMondayOfWeek(effectiveStartDate);
  const endMonday = getMondayOfWeek(endDate);

  const bucketsMap = new Map<string, WeeklyBucket>();
  const cur = new Date(startMonday);

  while (cur <= endMonday) {
    const weekStart = new Date(cur);
    const weekEnd = new Date(cur);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    const weekKey = getWeekKey(weekStart);
    const bucket: WeeklyBucket = {
      weekKey,
      weekLabel: formatWeekLabel(weekStart, weekEnd),
      weekStart,
      weekEnd,
      totalDistanceKm: 0,
      totalDistanceMi: 0,
      totalDurationMinutes: 0,
      runCount: 0,
      averagePaceMinPerKm: 0,
      averagePaceMinPerMi: 0,
      runs: [],
    };
    bucketsMap.set(weekKey, bucket);

    cur.setDate(cur.getDate() + 7);
  }

  // Populate workouts into appropriate bucket
  for (const w of filteredWorkouts) {
    const workoutMonday = getMondayOfWeek(w.startDate);
    const weekKey = getWeekKey(workoutMonday);

    let bucket = bucketsMap.get(weekKey);
    if (!bucket) {
      // In case workout fell outside initial Monday bounds
      const weekEnd = new Date(workoutMonday);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      bucket = {
        weekKey,
        weekLabel: formatWeekLabel(workoutMonday, weekEnd),
        weekStart: workoutMonday,
        weekEnd,
        totalDistanceKm: 0,
        totalDistanceMi: 0,
        totalDurationMinutes: 0,
        runCount: 0,
        averagePaceMinPerKm: 0,
        averagePaceMinPerMi: 0,
        runs: [],
      };
      bucketsMap.set(weekKey, bucket);
    }

    bucket.runs.push(w);
    bucket.totalDistanceKm += w.distanceKm;
    bucket.totalDurationMinutes += w.durationMinutes;
    bucket.runCount += 1;
  }

  // Finalize each bucket's averages
  const buckets = Array.from(bucketsMap.values()).sort(
    (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
  );

  let totalDistanceKm = 0;
  let totalRuns = 0;
  let activeWeeksCount = 0;
  let maxWeekDistanceKm = 0;

  for (const b of buckets) {
    b.totalDistanceMi = kmToMiles(b.totalDistanceKm);
    if (b.totalDistanceKm > 0 && b.totalDurationMinutes > 0) {
      b.averagePaceMinPerKm = b.totalDurationMinutes / b.totalDistanceKm;
      b.averagePaceMinPerMi = b.averagePaceMinPerKm / kmToMiles(1.0);
    }
    totalDistanceKm += b.totalDistanceKm;
    totalRuns += b.runCount;
    if (b.runCount > 0) activeWeeksCount++;
    if (b.totalDistanceKm > maxWeekDistanceKm) {
      maxWeekDistanceKm = b.totalDistanceKm;
    }
  }

  const totalWeeksCount = Math.max(1, buckets.length);
  const averageDistanceKmPerWeek = totalDistanceKm / totalWeeksCount;
  const averageDistanceMiPerWeek = kmToMiles(averageDistanceKmPerWeek);

  return {
    buckets,
    averageDistanceKmPerWeek,
    averageDistanceMiPerWeek,
    totalDistanceKm,
    totalDistanceMi: kmToMiles(totalDistanceKm),
    totalRuns,
    activeWeeksCount,
    totalWeeksCount,
    maxWeekDistanceKm,
    maxWeekDistanceMi: kmToMiles(maxWeekDistanceKm),
  };
}
