import { useEffect, useRef, useCallback } from 'react';

const STYLE = `*, *::before, *::after { cursor: none !important; }`;

export default function CustomCursor() {
  const elRef = useRef(null);
  const posRef = useRef({ x: 0, y: 0 });
  const pressedRef = useRef(false);
  const rafRef = useRef(null);

  const paint = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const { x, y } = posRef.current;
    const p = pressedRef.current;
    const s = p ? 0.85 : 1;
    const r = p ? -6 : 0;
    el.style.transform = `translate(${x - 16}px, ${y - 4}px) scale(${s}) rotate(${r}deg)`;
  }, []);

  useEffect(() => {
    const onMove = (e) => {
      posRef.current = { x: e.clientX, y: e.clientY };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          paint();
        });
      }
    };

    const onDown = () => {
      pressedRef.current = true;
      paint();
    };

    const onUp = () => {
      pressedRef.current = false;
      paint();
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);

    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [paint]);

  return (
    <>
      <style>{STYLE}</style>
      <div
        ref={elRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: 32,
          height: 32,
          background: 'url(/cursor-hand-32.png) no-repeat center/contain',
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform',
          transition: 'none',
        }}
      />
    </>
  );
}
