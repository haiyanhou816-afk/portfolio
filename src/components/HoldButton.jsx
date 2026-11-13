import { useCallback, useEffect, useRef, useState } from "react";
import "./HoldButton.css";

const SIZES = {
  sm: { height: 30, paddingX: 12, fontSize: 12 },
  md: { height: 40, paddingX: 18, fontSize: 13 },
  lg: { height: 48, paddingX: 24, fontSize: 14 },
};

/* 竖向波浪边（填充沿 X 轴推进时用）：viewBox 0 0 16 100，曲线从 x=0 起鼓包，右侧实心 */
function wavePathVertical(segments = 5) {
  const step = 100 / segments;
  let d = "M 0 0";
  for (let i = 0; i < segments; i += 1) {
    d += ` Q 16 ${(step * (i + 0.5)).toFixed(2)} 0 ${(step * (i + 1)).toFixed(2)}`;
  }
  return `${d} L 16 100 L 16 0 Z`;
}

/* 横向波浪边（填充沿 Y 轴推进时用）：viewBox 0 0 100 16，下侧实心 */
function wavePathHorizontal(segments = 6) {
  const step = 100 / segments;
  let d = "M 0 0";
  for (let i = 0; i < segments; i += 1) {
    d += ` Q ${(step * (i + 0.5)).toFixed(2)} 16 ${(step * (i + 1)).toFixed(2)} 0`;
  }
  return `${d} L 100 16 L 0 16 Z`;
}

/**
 * HoldButton — 长按确认按钮。
 * 按住时填充条按 holdTime 匀速推进，走完触发 onHold；中途松手按 releaseTime 回退。
 */
export default function HoldButton({
  children,
  doneLabel = "Done",
  backgroundColor = "#27272a",
  fillColor = "#eab308",
  textColor = "#f5f5f5",
  fillTextColor = "#ffffff",
  size = "md",
  radius = 14,
  fillDirection = "right",
  holdTime = 2000,
  releaseTime = 200,
  pressScale = 0.97,
  wave = false,
  waveAmplitude = 6,
  glow = false,
  resetAfter = 1200,
  disabled = false,
  onHold,
  className = "",
  ...rest
}) {
  const rootRef = useRef(null);
  const rafRef = useRef(0);
  const timerRef = useRef(0);
  const progressRef = useRef(0);
  const [phase, setPhase] = useState("idle");
  const phaseRef = useRef("idle");

  const preset = SIZES[size] || SIZES.md;
  const direction = ["right", "left", "up", "down"].includes(fillDirection)
    ? fillDirection
    : "right";
  const isVertical = direction === "up" || direction === "down";

  const setPhaseSafe = (next) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const setProgress = (value) => {
    progressRef.current = value;
    rootRef.current?.style.setProperty("--hb-p", String(value));
  };

  const stopRaf = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  const clearTimer = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = 0;
  };

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    []
  );

  const complete = useCallback(() => {
    stopRaf();
    setProgress(1);
    setPhaseSafe("done");
    onHold?.();
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      setProgress(0);
      setPhaseSafe("idle");
    }, Math.max(0, resetAfter));
  }, [onHold, resetAfter]);

  const startHold = () => {
    if (disabled || phaseRef.current === "done") return;
    stopRaf();
    clearTimer();
    setPhaseSafe("holding");
    const from = progressRef.current;
    const startedAt = performance.now() - from * holdTime;

    const tick = (now) => {
      const next = Math.min(1, (now - startedAt) / holdTime);
      setProgress(next);
      if (next >= 1) {
        complete();
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const cancelHold = () => {
    if (phaseRef.current !== "holding") return;
    stopRaf();
    setPhaseSafe("idle");
    const from = progressRef.current;
    if (!from) return;
    const startedAt = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - startedAt) / Math.max(1, releaseTime));
      /* easeOut，回退收得干脆一点 */
      setProgress(from * (1 - t) * (1 - t));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  };

  const handlePointerDown = (event) => {
    if (event.button !== 0 && event.pointerType === "mouse") return;
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    startHold();
  };

  const handlePointerUp = (event) => {
    event.stopPropagation();
    cancelHold();
  };

  const handleKeyDown = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    if (event.repeat) return;
    startHold();
  };

  const handleKeyUp = (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    cancelHold();
  };

  const label = phase === "done" ? doneLabel : children;

  return (
    <span
      ref={rootRef}
      className={`hold-button-root ${className}`.trim()}
      style={{
        "--hb-h": `${preset.height}px`,
        "--hb-px": `${preset.paddingX}px`,
        "--hb-fs": `${preset.fontSize}px`,
        "--hb-radius": `${radius}px`,
        "--hb-bg": backgroundColor,
        "--hb-fill": fillColor,
        "--hb-text": textColor,
        "--hb-fill-text": fillTextColor,
        "--hb-press": pressScale,
        "--hb-amp": waveAmplitude,
      }}
    >
      {glow ? <span className="hb__glow" aria-hidden="true" /> : null}
      <button
        type="button"
        data-dir={direction}
        className={`hold-button${phase === "holding" ? " is-holding" : ""}${
          phase === "done" ? " is-done" : ""
        }`}
        disabled={disabled}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={cancelHold}
        onKeyDown={handleKeyDown}
        onKeyUp={handleKeyUp}
        onBlur={cancelHold}
        onContextMenu={(event) => event.preventDefault()}
        {...rest}
      >
        <span className="hb__fill" aria-hidden="true">
          {wave ? (
            <svg
              className="hb__wave"
              viewBox={isVertical ? "0 0 100 16" : "0 0 16 100"}
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <path
                d={isVertical ? wavePathHorizontal() : wavePathVertical()}
                fill="currentColor"
              />
            </svg>
          ) : null}
        </span>
        <span className="hb__label">{label}</span>
        <span className="hb__label hb__label--fill" aria-hidden="true">
          {label}
        </span>
      </button>
    </span>
  );
}
