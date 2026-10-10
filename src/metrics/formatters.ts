import { UnitSystem } from '../types/workout';

export const KM_TO_MILES = 0.621371192;
export const MILES_TO_KM = 1.609344;

/**
 * Convert km to miles
 */
export function kmToMiles(km: number): number {
  return km * KM_TO_MILES;
}

/**
 * Convert miles to km
 */
export function milesToKm(miles: number): number {
  return miles * MILES_TO_KM;
}

/**
 * Formats a duration in seconds to standard HH:MM:SS or MM:SS
 */
export function formatTime(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds <= 0) return '00:00';
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hours > 0) {
    return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  }
  return `${pad(minutes)}:${pad(seconds)}`;
}

/**
 * Formats pace in minutes (e.g. 5.5 min = 5:30) with unit suffix
 */
export function formatPace(paceMin: number, unit: UnitSystem): string {
  if (isNaN(paceMin) || paceMin <= 0 || !isFinite(paceMin)) return `--:-- /${unit}`;
  const totalSeconds = Math.round(paceMin * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${minutes}:${pad(seconds)} /${unit}`;
}

/**
 * Formats distance with unit suffix
 */
export function formatDistance(distKm: number, unit: UnitSystem, decimals: number = 2): string {
  const value = unit === 'mi' ? kmToMiles(distKm) : distKm;
  return `${value.toFixed(decimals)} ${unit}`;
}

/**
 * Formats speed with unit suffix
 */
export function formatSpeed(speedKmh: number, unit: UnitSystem): string {
  if (isNaN(speedKmh) || speedKmh <= 0) return `0.0 ${unit === 'mi' ? 'mph' : 'km/h'}`;
  const val = unit === 'mi' ? speedKmh * KM_TO_MILES : speedKmh;
  return `${val.toFixed(1)} ${unit === 'mi' ? 'mph' : 'km/h'}`;
}

/**
 * Formats a date nicely
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Formats date and time
 */
export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${date.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  })}`;
}
