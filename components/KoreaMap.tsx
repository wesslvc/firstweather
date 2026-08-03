'use client';

import { forwardRef, useEffect, useRef } from 'react';
import { KOREA_MAP_SVG } from '@/lib/mapSvg';
import { PROVINCES } from '@/lib/regionMap';

interface KoreaMapProps {
  // province SVG id -> 1개 이상의 색상. 2개 이상이면 그라데이션으로 표시
  provinceFills: Record<string, string[]>;
  defaultFill?: string;
  selectedId?: string | null;
  onProvinceClick?: (id: string) => void;
}

const KoreaMap = forwardRef<HTMLDivElement, KoreaMapProps>(function KoreaMap(
  { provinceFills, defaultFill = 'var(--color-map-empty)', selectedId, onProvinceClick },
  forwardedRef
) {
  const localRef = useRef<HTMLDivElement>(null);
  const elMapRef = useRef<Map<string, SVGGElement>>(new Map());
  const defsRef = useRef<SVGDefsElement | null>(null);

  const setRefs = (node: HTMLDivElement | null) => {
    localRef.current = node;
    if (typeof forwardedRef === 'function') forwardedRef(node);
    else if (forwardedRef) forwardedRef.current = node;
  };

  // DOM 파싱 및 요소 캐싱은 최초 1회만 수행 (매 갱신마다 querySelector 재조회하지 않도록)
  useEffect(() => {
    const root = localRef.current;
    if (!root) return;
    const svg = root.querySelector('svg');
    if (!svg) return;

    const map = new Map<string, SVGGElement>();
    for (const province of PROVINCES) {
      const el = svg.querySelector<SVGGElement>(`#${CSS.escape(province.id)}`);
      if (el) map.set(province.id, el);
    }
    elMapRef.current = map;

    let defs = svg.querySelector<SVGDefsElement>('defs.dynamic-defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      defs.setAttribute('class', 'dynamic-defs');
      svg.insertBefore(defs, svg.firstChild);
    }
    defsRef.current = defs;
  }, []);

  useEffect(() => {
    const defs = defsRef.current;
    if (defs) defs.innerHTML = '';

    for (const province of PROVINCES) {
      const el = elMapRef.current.get(province.id);
      if (!el) continue;

      const colors = provinceFills[province.id];
      el.style.cursor = onProvinceClick ? 'pointer' : 'default';

      if (!colors || colors.length === 0) {
        el.setAttribute('style', `fill:${defaultFill};cursor:${onProvinceClick ? 'pointer' : 'default'}`);
      } else if (colors.length === 1) {
        el.setAttribute('style', `fill:${colors[0]};cursor:${onProvinceClick ? 'pointer' : 'default'}`);
      } else if (defs) {
        const gradId = `grad-${province.id}`;
        const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
        grad.setAttribute('id', gradId);
        grad.setAttribute('x1', '0%');
        grad.setAttribute('y1', '0%');
        grad.setAttribute('x2', '100%');
        grad.setAttribute('y2', '100%');
        colors.forEach((c, i) => {
          const stop = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
          stop.setAttribute('offset', `${(i / (colors.length - 1)) * 100}%`);
          stop.setAttribute('stop-color', c);
          grad.appendChild(stop);
        });
        defs.appendChild(grad);
        el.setAttribute('style', `fill:url(#${gradId});cursor:${onProvinceClick ? 'pointer' : 'default'}`);
      }

      el.classList.toggle('kr-map-selected', selectedId === province.id);
    }
  }, [provinceFills, defaultFill, selectedId, onProvinceClick]);

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onProvinceClick) return;
    const target = e.target as Element;
    for (const [id, el] of elMapRef.current) {
      if (el.contains(target)) {
        onProvinceClick(id);
        return;
      }
    }
  };

  return (
    <div
      ref={setRefs}
      className="korea-map"
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: KOREA_MAP_SVG }}
    />
  );
});

export default KoreaMap;
