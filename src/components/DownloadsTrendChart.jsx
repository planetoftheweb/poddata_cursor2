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

const DownloadsTrendChart = ({ data, insight }) => {
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

  const yMax = max(data, (d) => d.downloads) * 1.05;
  const yScale = scaleLinear().domain([0, yMax]).range([height - margin.bottom, margin.top]);

  const downloadsLine = line()
    .x((d) => xScale(d.episode))
    .y((d) => yScale(d.downloads))
    .curve(curveMonotoneX);

  const rollingLine = line()
    .x((d) => xScale(d.episode))
    .y((d) => yScale(d.downloadsRolling))
    .curve(curveMonotoneX);

  const downloadsArea = area()
    .x((d) => xScale(d.episode))
    .y0(yScale(0))
    .y1((d) => yScale(d.downloads))
    .curve(curveMonotoneX);

  const xTicks = xScale.ticks(6);
  const yTicks = yScale.ticks(5);
  const latest = data[data.length - 1];

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
    const svgY = yScale(point.downloads);

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
      title="Downloads Momentum"
      description="Episode downloads continue to climb; the rolling average smooths the growth trend and highlights seasonal dips you can prep for."
      insight={insight}
      legend={
        <div className="legend">
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(56, 189, 248, 0.45)' }} /> Episode downloads
          </span>
          <span className="legend-item">
            <span className="legend-swatch" style={{ background: 'rgba(129, 140, 248, 0.75)' }} /> 7-episode moving average
          </span>
        </div>
      }
    >
      <div className="chart-svg-wrapper" ref={wrapperRef}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Downloads per episode with moving average">
        <defs>
          <linearGradient id="downloadsFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(56, 189, 248, 0.45)" />
            <stop offset="100%" stopColor="rgba(56, 189, 248, 0.05)" />
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
        <path d={downloadsArea(data)} fill="url(#downloadsFill)" opacity={0.9} />
        <path d={downloadsLine(data)} className="line-primary" />
        <path d={rollingLine(data)} className="line-secondary" />
        <circle
          className="dot-highlight"
          cx={xScale(latest.episode)}
          cy={yScale(latest.downloads)}
          r={5}
        />
        <text
          x={xScale(latest.episode)}
          y={yScale(latest.downloads) - 14}
          textAnchor="end"
          className="axis-label"
        >
          {latest.downloads.toLocaleString()} downloads
        </text>
        {xTicks.map((tick) => (
          <g key={`x-${tick.toFixed(3)}`}>
            <line
              className="grid-line"
              x1={xScale(tick)}
              x2={xScale(tick)}
              y1={height - margin.bottom}
              y2={margin.top}
              strokeDasharray="2 6"
            />
            <text
              x={xScale(tick)}
              y={height - margin.bottom + 28}
              textAnchor="middle"
              className="axis-label"
            >
              Ep {Math.round(tick)}
            </text>
          </g>
        ))}
        <text
          x={margin.left}
          y={margin.top - 10}
          className="axis-label"
          textAnchor="start"
        >
          Downloads per episode
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
            <span>Downloads</span>
            <strong>{hoveredPoint.point.downloads.toLocaleString()}</strong>
          </div>
          <div className="chart-tooltip-metric">
            <span>7-ep avg</span>
            <strong>{Math.round(hoveredPoint.point.downloadsRolling).toLocaleString()}</strong>
          </div>
        </div>
      ) : null}
      </div>
    </ChartCard>
  );
};

export default DownloadsTrendChart;
