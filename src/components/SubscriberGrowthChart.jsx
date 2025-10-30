import { useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { extent, max } from 'd3-array';
import { area, line, curveMonotoneX } from 'd3-shape';
import ChartCard from './ChartCard.jsx';
import { useZoomPan } from '../hooks/useZoomPan.js';

const chartDimensions = {
  width: 640,
  height: 360,
  margin: { top: 24, right: 24, bottom: 42, left: 60 },
};

const SubscriberGrowthChart = ({ data, insight }) => {
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

  const yScale = scaleLinear()
    .domain([0, max(data, (d) => d.cumulativeSubscribers) * 1.05])
    .range([height - margin.bottom, margin.top]);

  const areaPath = area()
    .x((d) => xScale(d.episode))
    .y0(yScale(0))
    .y1((d) => yScale(d.cumulativeSubscribers))
    .curve(curveMonotoneX);

  const linePath = line()
    .x((d) => xScale(d.episode))
    .y((d) => yScale(d.cumulativeSubscribers))
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
    const svgY = yScale(point.cumulativeSubscribers);

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
      title="Subscriber Trajectory"
      description="Cumulative subscriber growth shows which seasons or campaigns produced inflection points and where momentum slowed."
      insight={insight}
      legend={
        <div className="legend">
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(56, 189, 248, 0.3)' }} /> Total subscribers
          </span>
        </div>
      }
    >
      <div className="chart-svg-wrapper" ref={wrapperRef}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Cumulative subscribers over time">
        <defs>
          <linearGradient id="subsFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(129, 140, 248, 0.5)" />
            <stop offset="100%" stopColor="rgba(129, 140, 248, 0)" />
          </linearGradient>
        </defs>
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
        <path d={areaPath(data)} fill="url(#subsFill)" />
        <path d={linePath(data)} className="line-secondary" />
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
          x={margin.left}
          y={margin.top - 10}
          textAnchor="start"
          className="axis-label"
        >
          Total subscribers
        </text>
        {yTicks.map((tick) => (
          <text
            key={`ylab-${tick}`}
            x={margin.left - 12}
            y={yScale(tick) + 4}
            textAnchor="end"
            className="axis-label"
          >
            {Math.round(tick).toLocaleString()}
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
            <span>Total subs</span>
            <strong>{hoveredPoint.point.cumulativeSubscribers.toLocaleString()}</strong>
          </div>
          <div className="chart-tooltip-metric">
            <span>Gained</span>
            <strong>{hoveredPoint.point.subscribersGained.toLocaleString()}</strong>
          </div>
        </div>
      ) : null}
      </div>
    </ChartCard>
  );
};

export default SubscriberGrowthChart;
