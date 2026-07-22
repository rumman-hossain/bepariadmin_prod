import React, { useLayoutEffect, useRef, useState } from 'react';
import { ResponsiveContainer } from 'recharts';

export const CHART_HEIGHT_PX = 250;

/**
 * Measures a fixed-height box before mounting Recharts so ResponsiveContainer
 * never receives width/height -1 (common in CSS grid/flex first paint).
 */
export function ChartContainer({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const measure = () => {
      const { width, height } = el.getBoundingClientRect();
      const w = Math.floor(width);
      const h = Math.floor(height);
      if (w > 0 && h > 0) {
        setDimensions({ width: w, height: h });
      }
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="w-full min-w-0"
      style={{ height: CHART_HEIGHT_PX }}
    >
      {dimensions ? (
        <ResponsiveContainer width={dimensions.width} height={dimensions.height} minWidth={0}>
          {children}
        </ResponsiveContainer>
      ) : null}
    </div>
  );
}
