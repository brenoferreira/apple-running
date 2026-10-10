import { RunningWorkout } from '../types/workout';
import { kmToMiles } from '../metrics/formatters';
import { parseZipArchive } from './zipReader';

/**
 * Parses Apple Health date strings like "2026-03-15 08:02:10 -0400"
 */
export function parseAppleHealthDate(str: string): Date {
  if (!str) return new Date();
  const trimmed = str.trim();
  const match = trimmed.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s+([+-]\d{4})$/);
  if (match) {
    const tz = match[3].slice(0, 3) + ':' + match[3].slice(3);
    return new Date(`${match[1]}T${match[2]}${tz}`);
  }
  return new Date(trimmed);
}

/**
 * Extracts attribute value from an XML snippet
 */
function getXmlAttr(xml: string, attr: string): string | null {
  const regex = new RegExp(`${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : null;
}

/**
 * Parses a single <Workout> XML string into a RunningWorkout object
 */
export function parseSingleWorkoutXml(workoutXml: string, index: number): RunningWorkout | null {
  const activityType = getXmlAttr(workoutXml, 'workoutActivityType');
  if (activityType !== 'HKWorkoutActivityTypeRunning') {
    return null;
  }

  const startDateStr = getXmlAttr(workoutXml, 'startDate') || '';
  const endDateStr = getXmlAttr(workoutXml, 'endDate') || '';
  const startDate = parseAppleHealthDate(startDateStr);
  const endDate = parseAppleHealthDate(endDateStr);

  // Duration
  const durationRaw = parseFloat(getXmlAttr(workoutXml, 'duration') || '0');
  const durationUnit = (getXmlAttr(workoutXml, 'durationUnit') || 'min').toLowerCase();
  let durationMinutes = durationRaw;
  if (durationUnit === 's' || durationUnit === 'sec') {
    durationMinutes = durationRaw / 60;
  } else if (durationUnit === 'hr' || durationUnit === 'h') {
    durationMinutes = durationRaw * 60;
  }
  const durationSeconds = durationMinutes * 60;

  // Distance: Check WorkoutStatistics first, then fallback to totalDistance attribute
  let distanceKm = 0;
  const distStatMatch = workoutXml.match(
    /<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierDistanceWalkingRunning"[^>]*sum="([^"]+)"[^>]*unit="([^"]+)"/i
  ) || workoutXml.match(
    /<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierDistanceWalkingRunning"[^>]*unit="([^"]+)"[^>]*sum="([^"]+)"/i
  );

  if (distStatMatch) {
    const sumVal = parseFloat(distStatMatch[1]);
    const unitVal = distStatMatch[2].toLowerCase();
    if (unitVal === 'km') {
      distanceKm = sumVal;
    } else if (unitVal === 'mi' || unitVal === 'mile') {
      distanceKm = sumVal * 1.609344;
    } else if (unitVal === 'm') {
      distanceKm = sumVal / 1000;
    } else if (unitVal === 'yd') {
      distanceKm = sumVal * 0.0009144;
    } else {
      distanceKm = sumVal;
    }
  } else {
    // Fallback to Workout attribute
    const totalDistRaw = parseFloat(getXmlAttr(workoutXml, 'totalDistance') || '0');
    const totalDistUnit = (getXmlAttr(workoutXml, 'totalDistanceUnit') || 'km').toLowerCase();
    if (totalDistUnit === 'km') {
      distanceKm = totalDistRaw;
    } else if (totalDistUnit === 'mi' || totalDistUnit === 'mile') {
      distanceKm = totalDistRaw * 1.609344;
    } else if (totalDistUnit === 'm') {
      distanceKm = totalDistRaw / 1000;
    } else {
      distanceKm = totalDistRaw;
    }
  }

  // If distance is invalid or 0, we can still record it or skip non-moving records
  if (distanceKm <= 0 || durationMinutes <= 0) {
    return null;
  }

  const distanceMi = kmToMiles(distanceKm);
  const paceMinPerKm = durationMinutes / distanceKm;
  const paceMinPerMi = durationMinutes / distanceMi;
  const speedKmh = (distanceKm / durationMinutes) * 60;
  const speedMph = speedKmh * 0.621371192;

  // Calories
  let calories: number | undefined;
  const calStatMatch = workoutXml.match(
    /<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierActiveEnergyBurned"[^>]*sum="([^"]+)"/i
  );
  if (calStatMatch) {
    calories = parseFloat(calStatMatch[1]);
  } else {
    const totalCal = getXmlAttr(workoutXml, 'totalEnergyBurned');
    if (totalCal) calories = parseFloat(totalCal);
  }

  // Heart Rate
  let heartRateAvg: number | undefined;
  let heartRateMin: number | undefined;
  let heartRateMax: number | undefined;
  const hrMatch = workoutXml.match(/<WorkoutStatistics[^>]*type="HKQuantityTypeIdentifierHeartRate"([^>]*)/i);
  if (hrMatch) {
    const hrBody = hrMatch[1];
    const avgM = hrBody.match(/average="([^"]+)"/i);
    const minM = hrBody.match(/min="([^"]+)"/i);
    const maxM = hrBody.match(/max="([^"]+)"/i);
    if (avgM) heartRateAvg = parseFloat(avgM[1]);
    if (minM) heartRateMin = parseFloat(minM[1]);
    if (maxM) heartRateMax = parseFloat(maxM[1]);
  }

  // Elevation
  let elevationMeters: number | undefined;
  const elevMatch = workoutXml.match(/<MetadataEntry[^>]*key="HKElevationAscended"[^>]*value="([^"]+)"/i);
  if (elevMatch) {
    const valStr = elevMatch[1].toLowerCase();
    const num = parseFloat(valStr);
    if (valStr.includes('cm')) {
      elevationMeters = num / 100;
    } else if (valStr.includes('m')) {
      elevationMeters = num;
    } else if (valStr.includes('ft')) {
      elevationMeters = num * 0.3048;
    }
  }

  // Indoor Workout
  let isIndoor = false;
  const indoorMatch = workoutXml.match(/<MetadataEntry[^>]*key="HKIndoorWorkout"[^>]*value="([^"]+)"/i);
  if (indoorMatch && indoorMatch[1] === '1') {
    isIndoor = true;
  }

  // Temperature
  let temperature: string | undefined;
  const tempMatch = workoutXml.match(/<MetadataEntry[^>]*key="HKWeatherTemperature"[^>]*value="([^"]+)"/i);
  if (tempMatch) {
    temperature = tempMatch[1];
  }

  const sourceName = getXmlAttr(workoutXml, 'sourceName') || 'Unknown Device';
  const sourceVersion = getXmlAttr(workoutXml, 'sourceVersion') || undefined;

  return {
    id: `workout_${startDate.getTime()}_${index}`,
    startDate,
    endDate,
    startDateStr,
    endDateStr,
    durationMinutes,
    durationSeconds,
    distanceKm,
    distanceMi,
    paceMinPerKm,
    paceMinPerMi,
    speedKmh,
    speedMph,
    calories,
    heartRateAvg,
    heartRateMin,
    heartRateMax,
    elevationMeters,
    temperature,
    isIndoor,
    sourceName,
    sourceVersion,
  };
}

/**
 * Streams through XML text chunks, finds <Workout> elements and parses them.
 * Never loads the entire 300MB XML string at once into memory!
 */
export async function parseWorkoutStream(
  stream: ReadableStream<string>,
  onProgress?: (workoutCount: number, status: string) => void
): Promise<RunningWorkout[]> {
  const reader = stream.getReader();
  let buffer = '';
  let inWorkout = false;
  const workouts: RunningWorkout[] = [];
  let workoutCounter = 0;

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += value;
      let startIdx = 0;

      while (true) {
        if (!inWorkout) {
          const wIdx = buffer.indexOf('<Workout ', startIdx);
          if (wIdx === -1) {
            // Keep the tail of buffer in case "<Workout " is split across chunks
            buffer = buffer.slice(Math.max(0, buffer.length - 30));
            break;
          }
          inWorkout = true;
          buffer = buffer.slice(wIdx);
          startIdx = 0;
        }

        if (inWorkout) {
          const closeIdx = buffer.indexOf('</Workout>', startIdx);
          const selfCloseIdx = buffer.indexOf('/>', startIdx);

          let endPos = -1;
          let tagLen = 0;

          if (closeIdx !== -1 && (selfCloseIdx === -1 || closeIdx < selfCloseIdx)) {
            endPos = closeIdx;
            tagLen = '</Workout>'.length;
          } else if (selfCloseIdx !== -1) {
            const nextTag = buffer.indexOf('<', 1);
            if (nextTag === -1 || selfCloseIdx < nextTag) {
              endPos = selfCloseIdx;
              tagLen = '/>'.length;
            } else if (closeIdx !== -1) {
              endPos = closeIdx;
              tagLen = '</Workout>'.length;
            }
          }

          if (endPos !== -1) {
            const workoutXml = buffer.slice(0, endPos + tagLen);
            if (workoutXml.includes('HKWorkoutActivityTypeRunning')) {
              const parsed = parseSingleWorkoutXml(workoutXml, workoutCounter++);
              if (parsed) {
                workouts.push(parsed);
                if (onProgress && workouts.length % 10 === 0) {
                  onProgress(workouts.length, `Found ${workouts.length} running workouts...`);
                }
              }
            }
            buffer = buffer.slice(endPos + tagLen);
            inWorkout = false;
            startIdx = 0;
          } else {
            break;
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  // Sort workouts chronologically by default
  workouts.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());
  return workouts;
}

/**
 * Side-effect function: Main entry point for processing an uploaded File or Blob.
 * Handles both export.zip and standalone export.xml files.
 */
export async function parseAppleHealthFile(
  file: File | Blob,
  fileName: string = 'export.zip',
  onProgress?: (progressPercent: number, statusText: string) => void
): Promise<RunningWorkout[]> {
  const isZip =
    fileName.toLowerCase().endsWith('.zip') ||
    file.type === 'application/zip' ||
    file.type === 'application/x-zip-compressed';

  if (isZip) {
    if (onProgress) onProgress(10, 'Reading ZIP archive...');
    const arrayBuffer = await file.arrayBuffer();

    if (onProgress) onProgress(30, 'Parsing ZIP headers...');
    const zipArchive = parseZipArchive(arrayBuffer);

    // Locate primary export XML entry (e.g. apple_health_export/export.xml or exportar.xml)
    const xmlEntry = zipArchive.entries.find(
      (e) =>
        e.filename.toLowerCase().endsWith('.xml') &&
        !e.filename.toLowerCase().includes('cda') &&
        (e.filename.includes('export') || e.filename.includes('exportar'))
    ) || zipArchive.entries.find(
      (e) => e.filename.toLowerCase().endsWith('.xml') && !e.filename.toLowerCase().includes('cda')
    );

    if (!xmlEntry) {
      throw new Error(
        'Could not find export.xml or exportar.xml inside the ZIP file. Please check the archive.'
      );
    }

    if (onProgress) onProgress(45, `Extracting ${xmlEntry.filename.split('/').pop()}...`);
    const stream = await zipArchive.getDecompressedStream(xmlEntry, (bytesDecompressed) => {
      if (onProgress && xmlEntry.uncompressedSize > 0) {
        const pct = Math.min(90, Math.round(45 + (bytesDecompressed / xmlEntry.uncompressedSize) * 45));
        onProgress(pct, `Decompressing & analyzing (${Math.round(bytesDecompressed / 1024 / 1024)} MB)...`);
      }
    });

    if (onProgress) onProgress(90, 'Reading running workouts...');
    const workouts = await parseWorkoutStream(stream, (count) => {
      if (onProgress) onProgress(95, `Found ${count} running workouts...`);
    });

    if (onProgress) onProgress(100, `Complete! Loaded ${workouts.length} running workouts.`);
    return workouts;
  } else {
    // Direct XML file
    if (onProgress) onProgress(20, 'Reading XML file...');
    const stream = file.stream().pipeThrough(new TextDecoderStream());
    const workouts = await parseWorkoutStream(stream, (count) => {
      if (onProgress) onProgress(80, `Found ${count} running workouts...`);
    });
    if (onProgress) onProgress(100, `Complete! Loaded ${workouts.length} running workouts.`);
    return workouts;
  }
}
