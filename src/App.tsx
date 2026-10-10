import React, { useState, useMemo } from 'react';
import {
  RunningWorkout,
  UnitSystem,
  TimeRangeFilter,
  BaselineWorkout,
} from './types/workout';
import { computeDistanceStats, DistanceFilterMode, STANDARD_DISTANCE_TARGETS } from './metrics/distanceStats';
import { computeWeeklyTimeseries } from './metrics/timeseriesStats';
import { findBestBaselineWorkout, generateRacePredictions } from './metrics/racePredictor';
import { parseAppleHealthFile } from './parser/xmlParser';
import { FileUploader } from './components/FileUploader';
import { Header } from './components/Header';
import { DistanceRecords } from './components/DistanceRecords';
import { WeeklyChart } from './components/WeeklyChart';
import { RacePredictor } from './components/RacePredictor';
import { WorkoutTable } from './components/WorkoutTable';
import './styles/app.css';

export const App: React.FC = () => {
  const [workouts, setWorkouts] = useState<RunningWorkout[]>([]);
  const [unit, setUnit] = useState<UnitSystem>('km');
  const [isLoading, setIsLoading] = useState(false);
  const [progressPercent, setProgressPercent] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filter & interaction state
  const [selectedRange, setSelectedRange] = useState<TimeRangeFilter>('3M');
  const [distanceMode, setDistanceMode] = useState<DistanceFilterMode>('achieved');
  const [customBaseline, setCustomBaseline] = useState<BaselineWorkout | null>(null);

  // File processing side-effect handler
  const handleFileSelect = async (file: File | Blob, fileName: string) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setProgressPercent(5);
      setStatusText('Opening file...');

      const parsedWorkouts = await parseAppleHealthFile(file, fileName, (pct, status) => {
        setProgressPercent(pct);
        setStatusText(status);
      });

      if (parsedWorkouts.length === 0) {
        throw new Error(
          'No running workouts (HKWorkoutActivityTypeRunning) were found in this export file.'
        );
      }

      setWorkouts(parsedWorkouts);
      setCustomBaseline(null); // Reset custom baseline to auto-select from new data
    } catch (err: unknown) {
      console.error('File parsing error:', err);
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(msg || 'Failed to process Apple Health export file.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setWorkouts([]);
    setErrorMessage(null);
    setProgressPercent(0);
    setStatusText('');
    setCustomBaseline(null);
  };

  // Pure function derived calculations
  const distanceStats = useMemo(() => {
    if (workouts.length === 0) return [];
    return computeDistanceStats(workouts, unit, STANDARD_DISTANCE_TARGETS, distanceMode);
  }, [workouts, unit, distanceMode]);

  const timeseriesStats = useMemo(() => {
    return computeWeeklyTimeseries(workouts, selectedRange);
  }, [workouts, selectedRange]);

  const effectiveBaseline = useMemo(() => {
    if (customBaseline) return customBaseline;
    return findBestBaselineWorkout(workouts);
  }, [workouts, customBaseline]);

  const racePredictions = useMemo(() => {
    if (!effectiveBaseline) return [];
    return generateRacePredictions(effectiveBaseline, workouts, unit);
  }, [effectiveBaseline, workouts, unit]);

  // When no workouts are loaded, display the landing screen with the single open zip button
  if (workouts.length === 0) {
    return (
      <FileUploader
        onFileSelect={handleFileSelect}
        isLoading={isLoading}
        progressPercent={progressPercent}
        statusText={statusText}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <div className="app-container">
      <Header
        unit={unit}
        onUnitChange={setUnit}
        onReset={handleReset}
        workouts={workouts}
      />

      <main className="main-content">
        {/* 1. Pace records per distance achieved */}
        <DistanceRecords
          stats={distanceStats}
          unit={unit}
          mode={distanceMode}
          onModeChange={setDistanceMode}
        />

        {/* 2. Timeseries chart with average distance run per week */}
        <WeeklyChart
          timeseriesData={timeseriesStats}
          selectedRange={selectedRange}
          onRangeChange={setSelectedRange}
          unit={unit}
        />

        {/* 3. Pete Riegel race time predictor */}
        <RacePredictor
          predictions={racePredictions}
          baseline={effectiveBaseline}
          workouts={workouts}
          unit={unit}
          onBaselineChange={setCustomBaseline}
        />

        {/* 4. Complete running workouts log */}
        <WorkoutTable workouts={workouts} unit={unit} />
      </main>

      <footer className="app-footer">
        <p>Apple Health Running Analytics • Pure React & TypeScript • Processed locally in browser</p>
      </footer>
    </div>
  );
};
