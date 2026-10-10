# Apple Health Running Analytics

A lightweight, high-performance web app to analyze running workouts exported from iOS Apple Health (`export.zip`).

## Features

- **One-Button Import & Streaming Extraction**:
  - Prominent button on the landing page to open Apple Health `export.zip` (or uncompressed `export.xml`).
  - Zero third-party ZIP libraries: uses native Web `DecompressionStream('deflate-raw')` and stream chunking to decompress and parse multi-hundred megabyte XML files in under 0.5s without freezing the browser or consuming excessive memory.
  - Bundled sample test button to test with local sample data in 1 click.
- **Pace Records by Distance Achieved**:
  - Displays average pace and top 3 best paces for standard distances:
    - 1 km
    - 3 km
    - 5 km
    - 10 km
    - 15 km
    - Half Marathon (21.0975 km)
    - Marathon (42.195 km)
  - Toggle between **Cumulative** (all runs that reached the distance) and **Target Brackets** (runs tailored to that distance).
- **Weekly Timeseries Mileage Chart**:
  - Custom pure SVG timeseries chart (no charting libraries).
  - Selectors for **Last 1 Month (1M)**, **Last 3 Months (3M)**, **Last 6 Months (6M)**, **Year to Date (YTD)**, **1 Year (1Y)**, and **All Time**.
  - Displays weekly mileage columns, period average reference line, and interactive tooltips.
- **Pete Riegel Race Time Predictor**:
  - Formula: $$T_2 = T_1 \times (D_2 / D_1)^{1.06}$$
  - Predicts race times, paces, and speeds for **5K**, **10K**, **15K**, **Half Marathon**, and **Marathon**.
  - Automatically identifies your fastest benchmark run as baseline, with one-click benchmark selection or custom inputs.
  - Compares predictions against your actual personal bests if already logged.
- **Unit Selector**:
  - Instant toggle between **Kilometers (km)** and **Miles (mi)**, defaulting to `km`.
- **Full Workouts Table**:
  - Searchable and sortable log of all running workouts parsed from the export.

## Architecture

- **Basic React + TypeScript + Vite + Vanilla CSS**.
- **No external JS libraries** other than React and ReactDOM.
- **Pure TS Calculation Functions** (`src/metrics/`):
  - `distanceStats.ts`: Pure calculations for distance categories and top 3 paces.
  - `timeseriesStats.ts`: Pure calculations for weekly buckets and period averages.
  - `racePredictor.ts`: Pure calculation of Pete Riegel race times and baseline selection.
  - `formatters.ts`: Pure formatting of paces, distances, and times.
- **Side-Effect Functions** (`src/parser/`):
  - `zipReader.ts`: Native ZIP parser and streaming decompressor.
  - `xmlParser.ts`: Streaming parser for Apple Health `<Workout>` XML nodes.
- **React Components** (`src/components/`):
  - Pure data presentation components without side effects.

## Running Locally

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.
