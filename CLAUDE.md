# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A React 19 data visualization dashboard that transforms podcast metrics from CSV into interactive D3-powered charts. The application provides actionable insights for podcast growth analysis through six distinct chart types tracking downloads, completion rates, listener composition, subscriber growth, social engagement, and duration impact.

## Development Commands

```bash
# Start development server (Vite with HMR)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Tech Stack

- **React 19** (release candidate): Component framework with modern hooks
- **D3 v7**: Data parsing (d3-fetch CSV), statistical computation, scales, shapes, and SVG rendering
- **Vite 5** with SWC: Build tool with `@vitejs/plugin-react-swc` for fast development and bundling
- **No routing library**: Single-page dashboard application

## Architecture

### Data Flow

1. **Data Source**: `public/podcast-metrics.csv` contains episode-level metrics:
   - Episode metadata (number, title, description, guest, duration)
   - Engagement metrics (downloads, completion_numbers, listeners)
   - Growth metrics (subscribers_gained, social_media_shares)

2. **Data Processing Hook**: `src/hooks/usePodcastData.js`
   - Fetches CSV using `d3-fetch`
   - Parses durations (HH:MM:SS) into decimal minutes
   - Computes derived metrics:
     - Completion rates (completion_numbers / downloads)
     - Cumulative subscriber/download totals
     - 7-episode rolling averages for downloads and completion
     - New vs returning listener ratios
     - Normalized metrics (per 1000 downloads)
   - Calculates statistical insights:
     - Early vs late episode performance comparisons
     - Pearson correlation for social shares → subscribers
     - Pearson correlation for duration → completion rate
   - Returns `{ episodes, summary, insights, loading, error }`

3. **Component Structure**: `src/App.jsx` orchestrates six specialized chart components:
   - **DownloadsTrendChart**: Area + line chart with 7-day rolling average
   - **CompletionRateChart**: Dual-line chart (actual vs rolling) with average reference line
   - **ListenerMixChart**: Stacked area showing new vs returning listener composition
   - **SubscriberGrowthChart**: Cumulative line chart tracking total subscribers over time
   - **SharesSubscribersScatter**: Scatter plot with correlation line for social shares vs subscriber gains
   - **DurationCompletionScatter**: Scatter plot analyzing episode length vs completion rate

### Chart Implementation Pattern

All chart components follow a consistent structure:

```jsx
import { scale* } from 'd3-scale';
import { * } from 'd3-array';  // extent, max, min, etc.
import { line, area, curveMonotoneX } from 'd3-shape';
import ChartCard from './ChartCard.jsx';
import { useZoomPan } from '../hooks/useZoomPan.js';

const MyChart = ({ data, insight }) => {
  // 1. Define chart dimensions (typically 640×360 with margins)
  const { width, height, margin } = chartDimensions;

  // 2. Set up zoom/pan behavior (optional)
  const { xDomain, yDomain, zoomRef, resetZoom } = useZoomPan({ ... });

  // 3. Create D3 scales (scaleLinear, scaleBand, etc.)
  const xScale = scaleLinear().domain(...).range(...);

  // 4. Generate path generators (line(), area())
  const pathData = line().x(...).y(...).curve(curveMonotoneX);

  // 5. Calculate tick positions for axes
  const xTicks = xScale.ticks(6);

  // 6. Render SVG with axes, paths, and annotations
  return (
    <ChartCard title="..." description="..." insight={insight}>
      <svg width={width} height={height}>
        <rect ref={zoomRef} ... /> {/* Zoom overlay */}
        {/* Grid lines */}
        {/* Data paths */}
        {/* Axes */}
        {/* Labels */}
      </svg>
      <button onClick={resetZoom}>Reset Zoom</button>
    </ChartCard>
  );
};
```

### Zoom/Pan Hook

`src/hooks/useZoomPan.js` provides interactive chart exploration:
- Takes `{ width, height, margin, xDomain, yDomain, maxZoom }`
- Returns `{ xDomain, yDomain, zoomRef, resetZoom, xRange, yRange }`
- Implements constrained zooming (prevents panning beyond data bounds)
- Clamps domains using `DOMAIN_EPSILON` for floating-point stability
- Disables double-click zoom by default
- Requires attaching `zoomRef` to an invisible overlay `<rect>` in SVG

### Styling Conventions

- Dark theme with radial gradient background (`#0b1120` base)
- Color palette:
  - Primary accent: `#f472b6` (pink)
  - Chart lines: `#38bdf8` (cyan), `#10b981` (emerald), `#f59e0b` (amber)
  - Text: `#e2e8f0` primary, `#cbd5f5` secondary
- Chart cards use backdrop blur with subtle borders
- Responsive sizing with `clamp()` for typography
- SVG text anchors: `start` (left), `end` (right), `middle` (center)

## Key Implementation Details

### Duration Parsing

Durations in CSV are `HH:MM:SS` format. Convert to decimal minutes:
```javascript
const [hours, minutes, seconds] = row.duration.split(':').map(Number);
const durationMinutes = hours * 60 + minutes + seconds / 60;
```

### Rolling Averages

Computed in `usePodcastData.js` with 7-episode windows (includes current episode):
```javascript
const averageInWindow = (series, index, accessor, window = 7) => {
  const start = Math.max(0, index - (window - 1));
  const slice = series.slice(start, index + 1);
  return slice.reduce((sum, item) => sum + accessor(item), 0) / slice.length;
};
```

### Correlation Calculations

Pearson correlation coefficient for scatter plots:
```javascript
const correlation = (series, xAccessor, yAccessor) => {
  // Extract paired values, compute means
  // Calculate covariance / (stdX * stdY)
  // Returns -1 to +1
};
```

### Chart Dimensions

Standard dimensions across all charts:
- Width: `640px`, Height: `360px`
- Margins: `{ top: 24, right: 24, bottom: 42, left: 60 }`
- Adjust `margin.left` for larger Y-axis labels if needed

### SVG Text Positioning

- X-axis labels: `y={height - margin.bottom + 24}`, `text-anchor="middle"`
- Y-axis labels: `x={margin.left - 12}`, `text-anchor="end"`
- Axis titles: positioned outside margin areas

## Common Development Tasks

### Adding a New Chart

1. Create `src/components/NewChart.jsx` following the chart pattern above
2. Import in `src/App.jsx`
3. Add corresponding insight key to `insights` object in `usePodcastData.js`
4. Pass `data` and `insight` props from App component

### Modifying Data Processing

All data transformations happen in `src/hooks/usePodcastData.js`:
- Update `parseRow()` for new CSV columns
- Add derived metrics in the `episodes.map()` block
- Update `summary` object for new aggregate statistics
- Extend `insights` object with new narrative text

### Adjusting Chart Styling

- Global styles: `src/index.css`
- Chart-specific styles: Use inline `style` or `className` props
- Color constants: Consider extracting to a shared theme object if colors proliferate

### Testing with Different Data

Replace `public/podcast-metrics.csv` with a CSV matching the expected schema:
```
episode,title,description,guest,duration,downloads,completion_numbers,new_listeners,returning_listeners,subscribers_gained,social_media_shares
```

## File Structure

```
src/
├── App.jsx                          # Root component, chart orchestration
├── main.jsx                         # React 19 entry point
├── index.css                        # Global styles, dark theme
├── hooks/
│   ├── usePodcastData.js            # CSV fetch, parsing, statistics
│   └── useZoomPan.js                # D3 zoom/pan behavior with clamping
└── components/
    ├── ChartCard.jsx                # Wrapper for title, description, insight
    ├── DownloadsTrendChart.jsx      # Area chart with rolling average
    ├── CompletionRateChart.jsx      # Dual-line completion tracking
    ├── ListenerMixChart.jsx         # Stacked area (new vs returning)
    ├── SubscriberGrowthChart.jsx    # Cumulative line chart
    ├── SharesSubscribersScatter.jsx # Correlation scatter with regression line
    └── DurationCompletionScatter.jsx # Duration impact analysis
```

## Known Patterns

- **Error Handling**: `usePodcastData` returns `{ loading, error }` states; App shows fallback UI
- **Empty States**: If CSV fails to load or is empty, summary will be `null`
- **No External State**: All state is local React state or computed via `useMemo`
- **D3 for Math, React for DOM**: D3 handles scales/shapes/statistics; React renders SVG elements
- **Curve Smoothing**: `curveMonotoneX` ensures smooth lines without overshooting data
