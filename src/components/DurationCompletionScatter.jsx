import { useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { extent, min, max } from 'd3-array';
import ChartCard from './ChartCard.jsx';
import { useZoomPan } from '../hooks/useZoomPan.js';

const chartDimensions = {
  width: 640,
  height: 360,
  margin: { top: 24, right: 32, bottom: 52, left: 68 },
};

const regressionLine = (points) => {
  const n = points.length;
  const sumX = points.reduce((acc, p) => acc + p.x, 0);
  const sumY = points.reduce((acc, p) => acc + p.y, 0);
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0);
  const denominator = n * sumXX - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: 0 };
  }
  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
};

const DurationCompletionScatter = ({ data, insight }) => {
  const { width, height, margin } = chartDimensions;

  const [hoveredPoint, setHoveredPoint] = useState(null);
  const wrapperRef = useRef(null);

  const points = data.map((d) => ({
    x: d.durationMinutes,
    y: d.completionRate,
    episode: d.episode,
  }));

  const xDomain = extent(points, (d) => d.x);
  const yMin = Math.min(0.45, min(points, (d) => d.y) - 0.02);
  const yMax = Math.max(0.95, max(points, (d) => d.y) + 0.02);
  const yDomain = [yMin, yMax];

  const { xDomain: zoomedXDomain, yDomain: zoomedYDomain, zoomRef, resetZoom, xRange, yRange } = useZoomPan({
    width,
    height,
    margin,
    xDomain,
    yDomain,
    maxZoom: 12,
  });

  const xScale = scaleLinear()
    .domain(zoomedXDomain)
    .range(xRange ?? [margin.left, width - margin.right]);
  const yScale = scaleLinear()
    .domain(zoomedYDomain)
    .range(yRange ?? [height - margin.bottom, margin.top]);

  const regression = regressionLine(points);
  const regressionSegment = [
    { x: zoomedXDomain[0], y: regression.slope * zoomedXDomain[0] + regression.intercept },
    { x: zoomedXDomain[1], y: regression.slope * zoomedXDomain[1] + regression.intercept },
  ];

  const yTicks = yScale.ticks(5);
  const xTicks = xScale.ticks(6);

  const bestCompletion = points.reduce((best, point) =>
    point.y > best.y ? point : best
  );

  const projectPointToWrapper = (point) => {
    const wrapper = wrapperRef.current;
    if (!wrapper) {
      return null;
    }

    const { width: wrapperWidth, height: wrapperHeight } = wrapper.getBoundingClientRect();
    if (wrapperWidth === 0 || wrapperHeight === 0) {
      return null;
    }

    const svgX = xScale(point.x);
    const svgY = yScale(point.y);

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

    points.forEach((point) => {
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
      title="Episode Duration vs Completion"
      description="Check whether tighter edits or longer conversations keep listeners engaged, and cluster runtimes that need rethinking."
      insight={insight}
      legend={
        <div className="legend">
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#38bdf8' }} /> Episode
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: '#facc15' }} /> Highest completion
          </span>
        </div>
      }
    >
      <div className="chart-svg-wrapper" ref={wrapperRef}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Scatter plot showing duration versus completion rate">
          {yTicks.map((tick) => (
            <g key={`y-${tick.toFixed(3)}`}>
              <line
                className="grid-line"
                x1={margin.left}
              x2={width - margin.right}
              y1={yScale(tick)}
              y2={yScale(tick)}
            />
            <text
              x={margin.left - 16}
              y={yScale(tick) + 4}
              textAnchor="end"
              className="axis-label"
            >
              {(tick * 100).toFixed(0)}%
            </text>
          </g>
        ))}
        <line
          x1={xScale(regressionSegment[0].x)}
          x2={xScale(regressionSegment[1].x)}
          y1={yScale(regressionSegment[0].y)}
          y2={yScale(regressionSegment[1].y)}
          className="line-secondary"
        />
          {points.map((point) => {
            const isBest = point.episode === bestCompletion.episode;
            return (
              <circle
                key={point.episode}
                cx={xScale(point.x)}
                cy={yScale(point.y)}
                r={isBest ? 6 : 4}
                className={isBest ? 'dot-highlight' : 'dot'}
                aria-label={`Episode ${point.episode} duration ${point.x.toFixed(1)} minutes completion ${(point.y * 100).toFixed(1)} percent`}
              />
            );
          })}
          {xTicks.map((tick) => (
            <text
              key={`x-${tick.toFixed(3)}`}
              x={xScale(tick)}
              y={height - margin.bottom + 30}
            textAnchor="middle"
            className="axis-label"
          >
            {tick.toFixed(0)} min
          </text>
        ))}
        <text
          x={width / 2}
          y={height - 10}
          textAnchor="middle"
          className="axis-label"
        >
          Episode duration (minutes)
        </text>
        <text
          transform={`translate(${margin.left - 42}, ${height / 2}) rotate(-90)`}
          textAnchor="middle"
          className="axis-label"
        >
          Completion rate
        </text>
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
              <span>Duration</span>
              <strong>{hoveredPoint.point.x.toFixed(1)} min</strong>
            </div>
            <div className="chart-tooltip-metric">
              <span>Completion</span>
              <strong>{(hoveredPoint.point.y * 100).toFixed(1)}%</strong>
            </div>
          </div>
        ) : null}
      </div>
    </ChartCard>
  );
};

export default DurationCompletionScatter;
