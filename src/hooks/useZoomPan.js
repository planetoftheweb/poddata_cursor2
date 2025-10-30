import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { zoom as d3Zoom, zoomIdentity } from 'd3-zoom';

const DOMAIN_EPSILON = 1e-6;

const domainsEqual = (a, b) => {
  if (a === b) {
    return true;
  }
  if (!a || !b) {
    return false;
  }
  return Math.abs(a[0] - b[0]) < DOMAIN_EPSILON && Math.abs(a[1] - b[1]) < DOMAIN_EPSILON;
};

const clampDomain = (candidate, base) => {
  if (!candidate || !base) {
    return candidate ?? base;
  }

  const baseMin = Math.min(base[0], base[1]);
  const baseMax = Math.max(base[0], base[1]);
  const [candStart, candEnd] = candidate;
  let candMin = Math.min(candStart, candEnd);
  let candMax = Math.max(candStart, candEnd);
  const baseSpan = baseMax - baseMin;
  const candSpan = candMax - candMin;

  if (candSpan >= baseSpan) {
    candMin = baseMin;
    candMax = baseMax;
  } else {
    if (candMin < baseMin) {
      const shift = baseMin - candMin;
      candMin += shift;
      candMax += shift;
    }
    if (candMax > baseMax) {
      const shift = candMax - baseMax;
      candMin -= shift;
      candMax -= shift;
    }
    candMin = Math.max(baseMin, candMin);
    candMax = Math.min(baseMax, candMax);
  }

  if (candMax - candMin < DOMAIN_EPSILON) {
    return [...base];
  }

  const ascending = base[1] >= base[0];
  return ascending ? [candMin, candMax] : [candMax, candMin];
};

export const useZoomPan = ({
  width,
  height,
  margin,
  xDomain: initialXDomain,
  yDomain: initialYDomain,
  maxZoom = 10,
}) => {
  const overlayRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const [domains, setDomains] = useState(() => ({
    xDomain: initialXDomain ?? null,
    yDomain: initialYDomain ?? null,
  }));

  const ranges = useMemo(
    () => ({
      xRange: initialXDomain ? [margin.left, width - margin.right] : null,
      yRange: initialYDomain ? [height - margin.bottom, margin.top] : null,
    }),
    [height, margin.bottom, margin.left, margin.right, margin.top, initialXDomain, initialYDomain, width],
  );

  useEffect(() => {
    setDomains({
      xDomain: initialXDomain ?? null,
      yDomain: initialYDomain ?? null,
    });

    if (overlayRef.current && zoomBehaviorRef.current) {
      select(overlayRef.current).call(zoomBehaviorRef.current.transform, zoomIdentity);
    }
  }, [
    initialXDomain ? initialXDomain[0] : null,
    initialXDomain ? initialXDomain[1] : null,
    initialYDomain ? initialYDomain[0] : null,
    initialYDomain ? initialYDomain[1] : null,
  ]);

  useEffect(() => {
    if (!overlayRef.current) {
      return;
    }

    const baseXScale = initialXDomain ? scaleLinear().domain(initialXDomain).range(ranges.xRange) : null;
    const baseYScale = initialYDomain ? scaleLinear().domain(initialYDomain).range(ranges.yRange) : null;

    const zoomBehavior = d3Zoom()
      .scaleExtent([1, maxZoom])
      .translateExtent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ])
      .extent([
        [margin.left, margin.top],
        [width - margin.right, height - margin.bottom],
      ])
      .on('zoom', (event) => {
        setDomains((prev) => {
          let nextDomain = prev;
          if (baseXScale) {
            const candidate = clampDomain(event.transform.rescaleX(baseXScale).domain(), initialXDomain);
            if (!domainsEqual(prev.xDomain, candidate)) {
              nextDomain = { ...nextDomain, xDomain: candidate };
            }
          }
          if (baseYScale) {
            const candidate = clampDomain(event.transform.rescaleY(baseYScale).domain(), initialYDomain);
            if (!domainsEqual(prev.yDomain, candidate)) {
              nextDomain = { ...nextDomain, yDomain: candidate };
            }
          }
          return nextDomain;
        });
      });

    zoomBehaviorRef.current = zoomBehavior;

    const selection = select(overlayRef.current);
    selection.call(zoomBehavior);
    selection.on('dblclick.zoom', null);

    return () => {
      selection.on('.zoom', null);
    };
  }, [
    height,
    initialXDomain ? initialXDomain[0] : null,
    initialXDomain ? initialXDomain[1] : null,
    initialYDomain ? initialYDomain[0] : null,
    initialYDomain ? initialYDomain[1] : null,
    margin.bottom,
    margin.left,
    margin.right,
    margin.top,
    maxZoom,
    ranges.xRange ? ranges.xRange[0] : null,
    ranges.xRange ? ranges.xRange[1] : null,
    ranges.yRange ? ranges.yRange[0] : null,
    ranges.yRange ? ranges.yRange[1] : null,
    width,
  ]);

  const resetZoom = useCallback(() => {
    setDomains({
      xDomain: initialXDomain ?? null,
      yDomain: initialYDomain ?? null,
    });

    if (overlayRef.current && zoomBehaviorRef.current) {
      select(overlayRef.current)
        .transition()
        .duration(200)
        .call(zoomBehaviorRef.current.transform, zoomIdentity);
    }
  }, [initialXDomain, initialYDomain]);

  return {
    xDomain: domains.xDomain ?? initialXDomain,
    yDomain: domains.yDomain ?? initialYDomain,
    zoomRef: overlayRef,
    resetZoom,
    xRange: ranges.xRange,
    yRange: ranges.yRange,
  };
};
