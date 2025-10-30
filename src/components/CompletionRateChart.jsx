import { useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { extent, max, min } from 'd3-array';
import { line, curveMonotoneX } from 'd3-shape';
import ChartCard from './ChartCard.jsx';
import { useZoomPan } from '../hooks/useZoomPan.js';

const chartDimensions = {
  width: 640,
  height: 360,
  margin: { top: 24, right: 24, bottom: 42, left: 60 },
};

const CompletionRateChart = ({ data, averageCompletionRate, insight }) => {
  const { width, height, margin } = chartDimensions;
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const wrapperRef = useRef(null);
  const baseXDomain = extent(data, (d) => d.episode);

  const { xDomain, zoomRef, resetZoom, xRange } = useZoomPan({
    width,
    height,
    margin,
    xDomain: baseXDomain,
    maxZoom: 12,
  });

  const xScale = scaleLinear()
    .domain(xDomain)
    .range(xRange ?? [margin.left, width - margin.right]);

  const minRate = min(data, (d) => d.completionRate);
  const maxRate = max(data, (d) => d.completionRate);
  const yScale = scaleLinear()
    .domain([Math.min(0.45, minRate - 0.02), Math.max(0.95, maxRate + 0.02)])
    .range([height - margin.bottom, margin.top]);

  const completionLine = line()
    .x((d) => xScale(d.episode))
    .y((d) => yScale(d.completionRate))
    .curve(curveMonotoneX);

  const rollingLine = line()
    .x((d) => xScale(d.episode))
    .y((d) => yScale(d.completionRolling))
    .curve(curveMonotoneX);

  const xTicks = xScale.ticks(6);
  const yTicks = yScale.ticks(5);

  const projectPointToWrapper = (point) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return null;
    }

    const { width: wrapperWidth, height: wrapperHeight } = wrapper.getBoundingClientRect();
    if (wrapperWidth === 0 || wrapperHeight === 0) {
      return null;
    }

    const svgX = xScale(point.episode);
    const svgY = yScale(point.completionRate);

    const left = (svgX / width) * wrapperWidth;
    const top = (svgY / height) * wrapperHeight;

    const horizontalPadding = 12;
    const verticalPadding = 20;

    return {
      left: Math.min(Math.max(left, horizontalPadding), wrapperWidth - horizontalPadding),
      top: Math.min(Math.max(top, verticalPadding), wrapperHeight - verticalPadding),
    };
  };

  const handlePointerMove = (event) => {
    if (!wrapperRef.current) {
      return;
    }

    if (event.buttons > 0) {
      setHoveredPoint(null);
      return;
    }

    const wrapperRect = wrapperRef.current.getBoundingClientRect();
    const pointerX = event.clientX - wrapperRect.left;
    const pointerY = event.clientY - wrapperRect.top;

    let closestPoint = null;
    let closestDistance = Infinity;
    let closestPosition = null;

    data.forEach((point) => {
      const projected = projectPointToWrapper(point);
      if (!projected) {
        return;
      }

      const distance = Math.hypot(projected.left - pointerX, projected.top - pointerY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestPoint = point;
        closestPosition = projected;
      }
    });

    const activationRadius = Math.max(24, Math.min(wrapperRect.width, wrapperRect.height) * 0.05);

    if (closestPoint && closestDistance <= activationRadius) {
      setHoveredPoint({ point: closestPoint, position: closestPosition });
    } else {
      setHoveredPoint(null);
    }
  };

  const handlePointerLeave = () => {
    setHoveredPoint(null);
  };

  return (
    <ChartCard
      title="Completion Discipline"
      description="Track how well episodes keep listeners to the end and spot the dips that signal pacing or segment order issues."
      insight={insight}
      legend={
        <div className="legend">
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#38bdf8' }} /> Completion rate
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(129, 140, 248, 0.85)' }} /> Rolling average
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#facc15' }} /> Portfolio average
          </span>
        </div>
      }
    >
      <div className="chart-svg-wrapper" ref={wrapperRef}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Episode completion rate trend">
        {yTicks.map((tick) => (
          <line
            key={`y-${tick}`}
            className="grid-line"
            x1={margin.left}
            x2={width - margin.right}
            y1={yScale(tick)}
            y2={yScale(tick)}
          />
        ))}
        <line
          x1={margin.left}
          x2={width - margin.right}
          y1={yScale(averageCompletionRate)}
          y2={yScale(averageCompletionRate)}
          stroke="#facc15"
          strokeDasharray="6 6"
          strokeWidth={1.8}
        />
        <path d={completionLine(data)} className="line-primary" />
        <path d={rollingLine(data)} className="line-secondary" />
        {data.map((point) => (
          <circle
            key={point.episode}
            className="dot"
            cx={xScale(point.episode)}
            cy={yScale(point.completionRate)}
            r={3}
          />
        ))}
        {xTicks.map((tick) => (
          <text
            key={`x-${tick.toFixed(3)}`}
            x={xScale(tick)}
            y={height - margin.bottom + 28}
            textAnchor="middle"
            className="axis-label"
          >
            Ep {Math.round(tick)}
          </text>
        ))}
        <text
          x={margin.left - 12}
          y={margin.top}
          textAnchor="end"
          className="axis-label"
        >
          Completion %
        </text>
        {yTicks.map((tick) => (
          <text
            key={`ylab-${tick}`}
            x={margin.left - 14}
            y={yScale(tick) + 4}
            textAnchor="end"
            className="axis-label"
          >
            {(tick * 100).toFixed(0)}%
          </text>
        ))}
        <rect
          ref={zoomRef}
          x={margin.left}
          y={margin.top}
          width={width - margin.left - margin.right}
          height={height - margin.top - margin.bottom}
          fill="transparent"
          className="interaction-layer"
          onDoubleClick={resetZoom}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          aria-hidden="true"
        >
          <title>Drag to pan, scroll to zoom, double-click to reset</title>
        </rect>
      </svg>
      {hoveredPoint ? (
        <div
          className="chart-tooltip"
          role="status"
          style={{ left: `${hoveredPoint.position.left}px`, top: `${hoveredPoint.position.top}px` }}
        >
          <div className="chart-tooltip-heading">Episode {hoveredPoint.point.episode}</div>
          <div className="chart-tooltip-metric">
            <span>Completion</span>
            <strong>{(hoveredPoint.point.completionRate * 100).toFixed(1)}%</strong>
          </div>
          <div className="chart-tooltip-metric">
            <span>Rolling avg</span>
            <strong>{(hoveredPoint.point.completionRolling * 100).toFixed(1)}%</strong>
          </div>
        </div>
      ) : null}
      </div>
    </ChartCard>
  );
};

export default CompletionRateChart;
