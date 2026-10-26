'use client';

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

export interface SignaturePadHandle {
  clear: () => void;
  /** PNG data URL of the drawing, or null when nothing was drawn. */
  toDataUrl: () => string | null;
}

/**
 * Drawn signature (touch, pen or mouse) on a canvas with pointer events —
 * no dependency. Figma 12 "Signature pad": 180px, dashed navy border,
 * baseline and hint.
 */
export const SignaturePad = forwardRef<
  SignaturePadHandle,
  { hint: string; onChange?: (hasInk: boolean) => void; label: string }
>(function SignaturePad({ hint, onChange, label }, ref) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const last = useRef<{ x: number; y: number } | null>(null);
  const [hasInk, setHasInk] = useState(false);
  const hasInkRef = useRef(false);

  const ctx = () => canvas.current?.getContext('2d') ?? null;

  // Size the backing store to the element (device pixels).
  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const resize = () => {
      const r = el.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(r.width * dpr);
      const h = Math.round(r.height * dpr);
      if (el.width === w && el.height === h) return;
      // Resizing clears the canvas; keep the drawing.
      const prev = el.width && el.height ? el.toDataURL() : null;
      el.width = w;
      el.height = h;
      const c = el.getContext('2d');
      if (!c) return;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      c.lineWidth = 2.4;
      c.strokeStyle = '#181818';
      if (prev && hasInkRef.current) {
        const img = new Image();
        img.onload = () => c.drawImage(img, 0, 0, r.width, r.height);
        img.src = prev;
      }
    };
    resize();
    const ro =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const mark = (v: boolean) => {
    hasInkRef.current = v;
    setHasInk(v);
    onChange?.(v);
  };

  const point = (e: React.PointerEvent) => {
    const r = canvas.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  useImperativeHandle(ref, () => ({
    clear() {
      const el = canvas.current;
      const c = ctx();
      if (el && c) {
        c.save();
        c.setTransform(1, 0, 0, 1, 0, 0);
        c.clearRect(0, 0, el.width, el.height);
        c.restore();
      }
      mark(false);
    },
    toDataUrl() {
      return hasInkRef.current && canvas.current
        ? canvas.current.toDataURL('image/png')
        : null;
    },
  }));

  return (
    <div className="pay-sig">
      <span className="pay-sig-line" aria-hidden="true" />
      {!hasInk ? <p className="pay-sig-hint">{hint}</p> : null}
      <canvas
        ref={canvas}
        role="img"
        aria-label={label}
        onPointerDown={(e) => {
          e.preventDefault();
          canvas.current?.setPointerCapture(e.pointerId);
          drawing.current = true;
          const p = point(e);
          last.current = p;
          const c = ctx();
          if (c) {
            c.beginPath();
            c.arc(p.x, p.y, 1.1, 0, Math.PI * 2);
            c.fillStyle = '#181818';
            c.fill();
          }
          if (!hasInkRef.current) mark(true);
        }}
        onPointerMove={(e) => {
          if (!drawing.current || !last.current) return;
          const c = ctx();
          if (!c) return;
          const p = point(e);
          c.beginPath();
          c.moveTo(last.current.x, last.current.y);
          c.lineTo(p.x, p.y);
          c.stroke();
          last.current = p;
        }}
        onPointerUp={() => {
          drawing.current = false;
          last.current = null;
        }}
        onPointerCancel={() => {
          drawing.current = false;
          last.current = null;
        }}
      />
    </div>
  );
});
