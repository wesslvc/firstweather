'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface ZoomableMapProps {
  children: React.ReactNode;
  /** 이 id를 가진 SVG 요소로 확대해 중앙에 맞춘다 */
  focusId?: string | null;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export default function ZoomableMap({ children, focusId }: ZoomableMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
  const [smooth, setSmooth] = useState(false);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const lastPinchDist = useRef<number | null>(null);
  const lastPan = useRef<{ x: number; y: number } | null>(null);

  const clamp = useCallback((t: { scale: number; x: number; y: number }) => {
    const scale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale));
    // 축소해서 1배가 되면 항상 중앙으로 복귀
    if (scale === MIN_SCALE) return { scale, x: 0, y: 0 };
    return { ...t, scale };
  }, []);

  const zoomAt = useCallback((clientX: number, clientY: number, factor: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const originX = clientX - rect.left - rect.width / 2;
    const originY = clientY - rect.top - rect.height / 2;

    setTransform((prev) => {
      const nextScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor));
      const ratio = nextScale / prev.scale;
      const x = originX - (originX - prev.x) * ratio;
      const y = originY - (originY - prev.y) * ratio;
      return clamp({ scale: nextScale, x, y });
    });
  }, [clamp]);

  // 선택된 지역이 화면 가운데 오도록 확대한다.
  // 현재 transform이 s/x/y일 때 화면상의 점은  center + p*s + (x,y) 이므로
  // 역산해 콘텐츠 기준 좌표 p를 구한 뒤, 새 배율에서 p가 중앙에 오도록 (x,y)를 다시 잡는다.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    // 선택이 해제되면 원래 배율로 되돌린다
    if (!focusId) {
      setSmooth(true);
      setTransform({ scale: 1, x: 0, y: 0 });
      const reset = setTimeout(() => setSmooth(false), 420);
      return () => clearTimeout(reset);
    }

    const target = viewport.querySelector<SVGGraphicsElement>(`#${CSS.escape(focusId)}`);
    if (!target) return;

    const viewRect = viewport.getBoundingClientRect();
    const rect = target.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    setTransform((prev) => {
      const cx = viewRect.left + viewRect.width / 2;
      const cy = viewRect.top + viewRect.height / 2;
      const px = (rect.left + rect.width / 2 - cx - prev.x) / prev.scale;
      const py = (rect.top + rect.height / 2 - cy - prev.y) / prev.scale;

      // 작은 지역일수록 더 크게. 뷰포트의 약 45%를 차지하도록 맞춘다.
      const naturalW = rect.width / prev.scale;
      const naturalH = rect.height / prev.scale;
      const fit = Math.min(
        (viewRect.width * 0.45) / Math.max(naturalW, 1),
        (viewRect.height * 0.45) / Math.max(naturalH, 1)
      );
      const scale = Math.min(MAX_SCALE, Math.max(2, fit));

      return { scale, x: -px * scale, y: -py * scale };
    });

    setSmooth(true);
    const timer = setTimeout(() => setSmooth(false), 420);
    return () => clearTimeout(timer);
  }, [focusId]);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    zoomAt(e.clientX, e.clientY, factor);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) {
      lastPan.current = { x: e.clientX, y: e.clientY };
    } else if (pointers.current.size === 2) {
      lastPinchDist.current = pinchDistance();
    }
  };

  const pinchDistance = () => {
    const pts = [...pointers.current.values()];
    if (pts.length < 2) return null;
    const dx = pts[0].x - pts[1].x;
    const dy = pts[0].y - pts[1].y;
    return Math.hypot(dx, dy);
  };

  const pinchMidpoint = () => {
    const pts = [...pointers.current.values()];
    return { x: (pts[0].x + pts[1].x) / 2, y: (pts[0].y + pts[1].y) / 2 };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const dist = pinchDistance();
      if (dist && lastPinchDist.current) {
        const factor = dist / lastPinchDist.current;
        const mid = pinchMidpoint();
        zoomAt(mid.x, mid.y, factor);
      }
      lastPinchDist.current = dist;
    } else if (pointers.current.size === 1 && lastPan.current) {
      const dx = e.clientX - lastPan.current.x;
      const dy = e.clientY - lastPan.current.y;
      lastPan.current = { x: e.clientX, y: e.clientY };
      setTransform((prev) => (prev.scale === MIN_SCALE ? prev : clamp({ ...prev, x: prev.x + dx, y: prev.y + dy })));
    }
  };

  const endPointer = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) lastPinchDist.current = null;
    if (pointers.current.size === 0) lastPan.current = null;
  };

  const reset = () => setTransform({ scale: 1, x: 0, y: 0 });
  const zoomButton = (factor: number) => {
    const el = viewportRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, factor);
  };

  return (
    <div className="zoom-viewport" ref={viewportRef}>
      <div
        className="zoom-surface"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={endPointer}
        onPointerCancel={endPointer}
        onPointerLeave={endPointer}
      >
        <div
          className={`zoom-content${smooth ? ' smooth' : ''}`}
          style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})` }}
        >
          {children}
        </div>
      </div>

      <div className="zoom-controls">
        <button className="zoom-btn" onClick={() => zoomButton(1.3)} aria-label="확대">＋</button>
        <button className="zoom-btn" onClick={() => zoomButton(1 / 1.3)} aria-label="축소">－</button>
        <button className="zoom-btn" onClick={reset} aria-label="화면 맞춤">⤢</button>
      </div>
    </div>
  );
}
