import fs from 'fs';

// Pete Riegel formula
function calculateRiegelTime(t1Seconds, d1Km, d2Km, exponent = 1.06) {
  if (t1Seconds <= 0 || d1Km <= 0 || d2Km <= 0) return 0;
  return t1Seconds * Math.pow(d2Km / d1Km, exponent);
}

// Distance conversion
const KM_TO_MILES = 0.621371192;
function kmToMiles(km) { return km * KM_TO_MILES; }

// Time formatting
function formatTime(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  const pad = (n) => n.toString().padStart(2, '0');
  if (hours > 0) return `${hours}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

function formatPace(paceMin, unit = 'km') {
  const totalSeconds = Math.round(paceMin * 60);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => n.toString().padStart(2, '0');
  return `${minutes}:${pad(seconds)} /${unit}`;
}

console.log('--- TEST 1: RIEGEL FORMULA TESTS ---');
// Benchmark: 5km in 25:00 (1500 seconds)
const t5k = 1500;
const t10k_pred = calculateRiegelTime(t5k, 5, 10);
const tHalf_pred = calculateRiegelTime(t5k, 5, 21.0975);
const tFull_pred = calculateRiegelTime(t5k, 5, 42.195);

console.log('Baseline 5K: 25:00');
console.log('Predicted 10K:', formatTime(t10k_pred), `(${formatPace(t10k_pred / 60 / 10)})`);
console.log('Predicted Half Marathon:', formatTime(tHalf_pred), `(${formatPace(tHalf_pred / 60 / 21.0975)})`);
console.log('Predicted Marathon:', formatTime(tFull_pred), `(${formatPace(tFull_pred / 60 / 42.195)})`);

// Verify Pete Riegel ratio: (10 / 5)^1.06 = 2^1.06 = 2.0849
const ratio10k = t10k_pred / t5k;
console.log('10k / 5k time ratio:', ratio10k.toFixed(4), '(Expected: 2.0850)');
if (Math.abs(ratio10k - 2.085) > 0.005) throw new Error('Riegel 10k ratio mismatch');

console.log('--- TEST 2: TEST REAL WORKOUTS FROM exportar.zip ---');
async function testZipParsing() {
  const buf = fs.readFileSync('exportar.zip');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  }
  const totalEntries = view.getUint16(eocd + 10, true);
  let cdOffset = view.getUint32(eocd + 16, true);
  
  for (let i = 0; i < totalEntries; i++) {
    const magic = view.getUint32(cdOffset, true);
    if (magic !== 0x02014b50) break;
    const compMethod = view.getUint16(cdOffset + 10, true);
    const compSize = view.getUint32(cdOffset + 20, true);
    const fnameLen = view.getUint16(cdOffset + 28, true);
    const extraLen = view.getUint16(cdOffset + 30, true);
    const commentLen = view.getUint16(cdOffset + 32, true);
    const localHeaderOffset = view.getUint32(cdOffset + 42, true);
    const fname = Buffer.from(buf.buffer, buf.byteOffset + cdOffset + 46, fnameLen).toString('utf8');
    cdOffset += 46 + fnameLen + extraLen + commentLen;
    
    if (fname.endsWith('.xml') && !fname.includes('cda')) {
      const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
      const dataOffset = localHeaderOffset + 30 + fnameLen + localExtraLen;
      const compressedSlice = buf.subarray(dataOffset, dataOffset + compSize);
      
      const ds = new DecompressionStream('deflate-raw');
      const writer = ds.writable.getWriter();
      writer.write(compressedSlice);
      writer.close();
      
      const reader = ds.readable.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = '';
      let inWorkout = false;
      const workouts = [];
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        let startIdx = 0;
        while (true) {
          if (!inWorkout) {
            const wIdx = buffer.indexOf('<Workout ', startIdx);
            if (wIdx === -1) {
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
              endPos = closeIdx; tagLen = '</Workout>'.length;
            } else if (selfCloseIdx !== -1) {
              const nextTag = buffer.indexOf('<', 1);
              if (nextTag === -1 || selfCloseIdx < nextTag) {
                endPos = selfCloseIdx; tagLen = '/>'.length;
              } else if (closeIdx !== -1) {
                endPos = closeIdx; tagLen = '</Workout>'.length;
              }
            }
            if (endPos !== -1) {
              const xml = buffer.slice(0, endPos + tagLen);
              if (xml.includes('HKWorkoutActivityTypeRunning')) {
                workouts.push(xml);
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
      console.log('Successfully decompressed and parsed running workouts count:', workouts.length);
      if (workouts.length !== 101) throw new Error('Expected 101 running workouts, got ' + workouts.length);
      console.log('All tests passed successfully!');
      break;
    }
  }
}

testZipParsing();
