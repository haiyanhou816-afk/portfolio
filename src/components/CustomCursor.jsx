import { useEffect, useRef, useCallback, useState } from 'react';
import { asset } from '../utils/asset';

const STYLE = `*, *::before, *::after { cursor: none !important; }`;

export default function CustomCursor() {
  /* 触屏没有鼠标指针。原来这支手指图标会停在左上角 (0,0) 挡住 logo，
     还会通过 cursor:none 把桌面光标语义带到手机。只在真鼠标设备启用。 */
  const [enabled, setEnabled] = useState(false);
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
    const mq = window.matchMedia?.('(hover: hover) and (pointer: fine)');
    if (!mq) { setEnabled(true); return undefined; }
    const sync = () => setEnabled(mq.matches);
    sync();
    mq.addEventListener?.('change', sync);
    return () => mq.removeEventListener?.('change', sync);
  }, []);

  useEffect(() => {
    if (!enabled) return undefined;
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
  }, [paint, enabled]);

  if (!enabled) return null;

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
          background: `url(${asset('/cursor-hand-32.png')}) no-repeat center/contain`,
          pointerEvents: 'none',
          zIndex: 99999,
          willChange: 'transform',
          transition: 'none',
        }}
      />
    </>
  );
}
