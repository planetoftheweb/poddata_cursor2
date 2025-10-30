import { useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import { area, curveMonotoneX, stack } from 'd3-shape';
import ChartCard from './ChartCard.jsx';
import { useZoomPan } from '../hooks/useZoomPan.js';

const chartDimensions = {
  width: 640,
  height: 360,
  margin: { top: 24, right: 24, bottom: 42, left: 60 },
};

const ListenerMixChart = ({ data, insight }) => {
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

  const yScale = scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);

  const shareData = data.map((d) => ({
    newShare: d.listenersTotal === 0 ? 0 : d.newListeners / d.listenersTotal,
    returningShare: d.listenersTotal === 0 ? 0 : d.returningListeners / d.listenersTotal,
  }));

  const stacked = stack().keys(['returningShare', 'newShare'])(shareData);

  const areaGenerator = area()
    .x((_, idx) => xScale(data[idx].episode))
    .y0((d) => yScale(d[0]))
    .y1((d) => yScale(d[1]))
    .curve(curveMonotoneX);

  const yTicks = [0, 0.25, 0.5, 0.75, 1];
  const xTicks = xScale.ticks(6);

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
    const newShare = point.listenersTotal === 0 ? 0 : point.newListeners / point.listenersTotal;
    const svgY = yScale(newShare / 2);

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
      title="Listener Mix"
      description="See how the audience blend between new and returning listeners shifts, so you can balance acquisition campaigns and retention hooks."
      insight={insight}
      legend={
        <div className="legend">
          <span className="legend-item">
            <span className="legend-swatch stack-returning" /> Returning listeners
          </span>
          <span className="legend-item">
            <span className="legend-swatch stack-new" /> New listeners
          </span>
        </div>
      }
    >
      <div className="chart-svg-wrapper" ref={wrapperRef}>
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Stacked area showing listener composition">
        {yTicks.map((tick) => (
          <g key={`y-${tick}`}>
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
        <path d={areaGenerator(stacked[0])} className="stack-returning" />
        <path d={areaGenerator(stacked[1])} className="stack-new" />
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
          x={margin.left - 10}
          y={margin.top}
          textAnchor="end"
          className="axis-label"
        >
          Audience share
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
            <span>New listeners</span>
            <strong>{hoveredPoint.point.newListeners.toLocaleString()}</strong>
          </div>
          <div className="chart-tooltip-metric">
            <span>Returning</span>
            <strong>{hoveredPoint.point.returningListeners.toLocaleString()}</strong>
          </div>
          <div className="chart-tooltip-metric">
            <span>Total</span>
            <strong>{hoveredPoint.point.listenersTotal.toLocaleString()}</strong>
          </div>
        </div>
      ) : null}
      </div>
    </ChartCard>
  );
};

export default ListenerMixChart;
