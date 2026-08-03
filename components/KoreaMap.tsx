'use client';

import { useEffect, useRef } from 'react';
import { KOREA_MAP_SVG } from '@/lib/mapSvg';
import { PROVINCES } from '@/lib/regionMap';

interface KoreaMapProps {
  colors: Record<string, string>; // province SVG id -> fill color
  defaultFill?: string;
}

export default function KoreaMap({ colors, defaultFill = 'var(--color-map-empty)' }: KoreaMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    for (const province of PROVINCES) {
      const el = root.querySelector<SVGGElement>(`#${CSS.escape(province.id)}`);
      if (!el) continue;
      const fill = colors[province.id] ?? defaultFill;
      el.setAttribute('style', `fill:${fill}`);
    }
  }, [colors, defaultFill]);

  return (
    <div
      ref={containerRef}
      className="korea-map"
      dangerouslySetInnerHTML={{ __html: KOREA_MAP_SVG }}
    />
  );
}
