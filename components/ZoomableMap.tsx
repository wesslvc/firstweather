'use client';

import { useRef, useState, useCallback } from 'react';

interface ZoomableMapProps {
  children: React.ReactNode;
}

const MIN_SCALE = 1;
const MAX_SCALE = 5;

export default function ZoomableMap({ children }: ZoomableMapProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState({ scale: 1, x: 0, y: 0 });
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
          className="zoom-content"
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
