export type UnitSystem = 'km' | 'mi';

export interface RunningWorkout {
  id: string;
  startDate: Date;
  endDate: Date;
  startDateStr: string;
  endDateStr: string;
  durationMinutes: number; // in minutes
  durationSeconds: number; // in seconds
  distanceKm: number;      // canonical distance in km
  distanceMi: number;      // canonical distance in miles
  paceMinPerKm: number;    // minutes per km
  paceMinPerMi: number;    // minutes per mile
  speedKmh: number;        // km/h
  speedMph: number;        // mph
  calories?: number;       // active kcal burned
  heartRateAvg?: number;   // bpm
  heartRateMin?: number;
  heartRateMax?: number;
  elevationMeters?: number;
  temperature?: string;
  isIndoor?: boolean;
  sourceName: string;
  sourceVersion?: string;
}

export interface DistanceTarget {
  id: string;
  name: string;
  distanceKm: number;
  distanceMi: number;
  description: string;
}

export interface BestPaceRecord {
  rank: number;
  workout: RunningWorkout;
  paceMinPerKm: number;
  paceMinPerMi: number;
  formattedPace: string;
  formattedTime: string;
  formattedDistance: string;
  date: string;
}

export interface DistanceStatResult {
  target: DistanceTarget;
  isAchieved: boolean;
  totalRuns: number;
  averagePaceMinPerKm: number;
  averagePaceMinPerMi: number;
  formattedAveragePace: string;
  top3Paces: BestPaceRecord[];
}

export type TimeRangeFilter = '1M' | '3M' | '6M' | 'YTD' | '1Y' | 'ALL';

export interface WeeklyBucket {
  weekKey: string;          // e.g. "2026-W38"
  weekLabel: string;        // e.g. "Sep 15 - Sep 21"
  weekStart: Date;
  weekEnd: Date;
  totalDistanceKm: number;
  totalDistanceMi: number;
  totalDurationMinutes: number;
  runCount: number;
  averagePaceMinPerKm: number;
  averagePaceMinPerMi: number;
  runs: RunningWorkout[];
}

export interface WeeklyTimeseriesResult {
  buckets: WeeklyBucket[];
  averageDistanceKmPerWeek: number;
  averageDistanceMiPerWeek: number;
  totalDistanceKm: number;
  totalDistanceMi: number;
  totalRuns: number;
  activeWeeksCount: number;
  totalWeeksCount: number;
  maxWeekDistanceKm: number;
  maxWeekDistanceMi: number;
}

export interface RacePrediction {
  target: DistanceTarget;
  predictedSeconds: number;
  predictedFormattedTime: string;
  predictedPaceMinPerKm: number;
  predictedPaceMinPerMi: number;
  predictedFormattedPace: string;
  predictedSpeedKmh: number;
  predictedSpeedMph: number;
  actualBestWorkout?: RunningWorkout;
  actualBestFormattedTime?: string;
  timeDifferenceSeconds?: number;
}

export interface BaselineWorkout {
  distanceKm: number;
  durationSeconds: number;
  sourceLabel: string;
  workout?: RunningWorkout;
}
