import { asset } from "../utils/asset";
import { useEffect, useRef } from "react";

/**
 * "Vignette Bloom" ASCII-art effect — Canvas2D reimplementation.
 *
 * Pipeline (per the spec):
 *  1. draw source photo -> offscreen canvas at target size
 *  2. divide into cellSize grid, sample average color / luminance per cell
 *  3. draw a primitive per cell according to renderMode
 *  4. color adjustments: brightness -> contrast -> saturation -> grayscale -> tint -> blur
 *  5. post-effects from pfx (vignette, bloom, ... ) at their intensity
 *  6. lights glow points
 *  7. reveal mask back to the plain photo
 *  8. animation via animStyle / animSpeed / animIntensity
 *
 * This build is driven by the "Vignette Bloom" preset:
 *   mosaic / solid bg / cell 16 / brightness 12 / contrast 115
 *   pfx: vignette 38 + bloom 25 / animated wave, speed 100, intensity 60
 */

const PRESET = {
  renderMode: "mosaic",
  bgMode: "solid",
  bgBlur: 12,
  bgOpacity: 90,
  cellSize: 16,
  coverage: 100,
  invert: false,
  styleBlend: "source-over",
  charSet: "standard",
  brightness: 12,
  contrast: 115,
  edgeEmphasis: 0,
  density: 0,
  tint: "#3ca6ff",
  tintOpacity: 0,
  overlayBlend: "multiply",
  saturation: 100,
  grayscale: 0,
  blurType: "off",
  blurAmount: 35,
  pfx: {
    vignette: { enabled: true, intensity: 38 },
    bloom: { enabled: true, intensity: 25 },
    scanLines: { enabled: false, intensity: 40 },
    chromatic: { enabled: false, intensity: 15 },
    filmGrain: { enabled: false, intensity: 30 },
    glitch: { enabled: false, intensity: 20 },
    pixelate: { enabled: false, intensity: 15 },
    halftone: { enabled: false, intensity: 20 },
    filmDust: { enabled: false, intensity: 20 },
  },
  animated: true,
  animStyle: "wave",
  animSpeed: { enabled: true, intensity: 100 },
  animIntensity: { enabled: true, intensity: 60 },
  lights: { enabled: false, points: [] },
  mask: { enabled: false, invert: false, dataUrl: null },
};

const CHAR_SETS = {
  standard: " .:-=+*#%@",
  blocks: " ░▒▓█",
  hex: "0123456789ABCDEF",
};

const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/* ---------- step 4: color adjustments, applied per sampled cell ---------- */
function adjustColor(rgb, cfg) {
  let [r, g, b] = rgb;

  // brightness: -100..100 -> additive in 0..255 space
  const bAdd = (cfg.brightness / 100) * 255 * 0.5;
  r += bAdd;
  g += bAdd;
  b += bAdd;

  // contrast: 0..200 (100 = neutral), pivot on mid grey
  const c = cfg.contrast / 100;
  r = (r - 127.5) * c + 127.5;
  g = (g - 127.5) * c + 127.5;
  b = (b - 127.5) * c + 127.5;

  // saturation: 0..200 (100 = neutral)
  const s = cfg.saturation / 100;
  if (s !== 1) {
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r = lum + (r - lum) * s;
    g = lum + (g - lum) * s;
    b = lum + (b - lum) * s;
  }

  // grayscale: 0..100
  const gs = cfg.grayscale / 100;
  if (gs > 0) {
    const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    r += (lum - r) * gs;
    g += (lum - g) * gs;
    b += (lum - b) * gs;
  }

  return [clamp(r, 0, 255), clamp(g, 0, 255), clamp(b, 0, 255)];
}

/* ---------- step 8: animation offset per cell ---------- */
function animOffset(style, cx, cy, cols, rows, t, amp) {
  if (amp <= 0) return 0;
  switch (style) {
    case "wave":
      return Math.sin((cx / cols) * Math.PI * 3 + (cy / rows) * Math.PI * 1.4 + t * 1.7) * amp;
    case "pulse":
      return Math.sin(t * 2.2) * amp;
    case "shimmer":
      return Math.sin(cx * 0.9 + t * 4.5) * Math.cos(cy * 0.7 - t * 2.1) * amp;
    case "ripple": {
      const dx = cx / cols - 0.5;
      const dy = cy / rows - 0.5;
      return Math.sin(Math.hypot(dx, dy) * 18 - t * 3.2) * amp;
    }
    case "flicker":
      return (Math.sin(cx * 12.9898 + cy * 78.233 + Math.floor(t * 9) * 3.71) % 1) * amp;
    default:
      return 0;
  }
}

export default function AsciiVignetteBloom({
  src = asset("/hero-bg.jpg"),
  className = "",
  config,
  bgColor = "#0a0a0a",
  /** 0 = 无渐隐，1 = 从中心就开始淡出。给网格做边缘渐变透明 */
  edgeFade = 0,
  /**
   * 逐格揭示进度 0..1。null 表示不做揭示（全部可见）。
   * 每个格子有一个稳定的随机阈值，进度越过阈值才点亮，
   * 刚点亮的一瞬间会过冲成高亮，然后落回本色。
   */
  reveal = null,
  /**
   * 暂停动画循环。用于"层已挂载但视觉上不可见"的场景
   * （例如被 mask/opacity 隐藏），此时 IntersectionObserver
   * 仍判定其可见，不暂停就会空转烧 CPU。
   */
  paused = false,
}) {
  const canvasRef = useRef(null);
  const revealRef = useRef(reveal);
  revealRef.current = reveal;
  const edgeFadeRef = useRef(edgeFade);
  edgeFadeRef.current = edgeFade;
  const cfgRef = useRef({ ...PRESET, ...(config || {}) });
  cfgRef.current = { ...PRESET, ...(config || {}) };
  const pausedRef = useRef(paused);
  // effect 内部挂上循环控制句柄，供 paused 变化时驱动
  const loopRef = useRef({ start: null, stop: null, redraw: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let rafId = 0;
    let disposed = false;
    let cells = [];
    let cols = 0;
    let rows = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;
    let bloomCanvas = null;
    let bloomCtx = null;
    const start = performance.now();
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    const staticOnly = reduceMotion || !cfgRef.current.animated;

    const image = new Image();
    let imageReady = false;

    /* ---- steps 1 + 2: draw source, sample the cell grid ---- */
    const sample = () => {
      const cfg = cfgRef.current;
      const cell = Math.max(4, cfg.cellSize);
      cols = Math.max(1, Math.ceil(width / cell));
      rows = Math.max(1, Math.ceil(height / cell));

      const off = document.createElement("canvas");
      off.width = cols;
      off.height = rows;
      const octx = off.getContext("2d", { willReadFrequently: true });
      if (!octx || !imageReady) {
        cells = [];
        return;
      }

      // cover-fit the photo into the grid so aspect ratio is preserved
      const scale = Math.max(cols / image.width, rows / image.height);
      const dw = image.width * scale;
      const dh = image.height * scale;
      octx.imageSmoothingEnabled = true;
      octx.drawImage(image, (cols - dw) / 2, (rows - dh) / 2, dw, dh);

      const { data } = octx.getImageData(0, 0, cols, rows);
      cells = new Array(cols * rows);

      for (let i = 0; i < cols * rows; i += 1) {
        const p = i * 4;
        const [r, g, b] = adjustColor([data[p], data[p + 1], data[p + 2]], cfg);
        let lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
        if (cfg.invert) lum = 1 - lum;

        const cx = i % cols;
        const cy = (i - cx) / cols;

        // 边缘渐隐：到画布中心的归一化距离 -> 透明度权重
        const nx = cols > 1 ? (cx / (cols - 1)) * 2 - 1 : 0;
        const ny = rows > 1 ? (cy / (rows - 1)) * 2 - 1 : 0;
        const edgeDist = Math.min(1, Math.hypot(nx, ny) / Math.SQRT2);

        // 稳定的伪随机阈值：中心略早、边缘略晚，配合少量抖动
        const jitter = Math.abs(Math.sin(cx * 12.9898 + cy * 78.233) * 43758.5453) % 1;
        const threshold = clamp(edgeDist * 0.55 + jitter * 0.45, 0, 1);

        cells[i] = { r, g, b, lum, edgeDist, threshold };
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const nextDpr = Math.min(window.devicePixelRatio || 1, 2);
      const nextW = Math.max(1, Math.round(rect.width));
      const nextH = Math.max(1, Math.round(rect.height));
      if (nextW === width && nextH === height && nextDpr === dpr && cells.length) return;

      dpr = nextDpr;
      width = nextW;
      height = nextH;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      bloomCanvas = document.createElement("canvas");
      bloomCanvas.width = canvas.width;
      bloomCanvas.height = canvas.height;
      bloomCtx = bloomCanvas.getContext("2d");

      sample();
    };

    /* ---- step 3: one primitive per cell ---- */
    const drawCell = (target, mode, x, y, size, cellData, lum, flash = 0) => {
      const { r, g, b } = cellData;
      if (flash > 0.01) {
        // 点亮瞬间向白色过冲，制造"一格一格亮起来"的观感
        const k = flash * 0.85;
        target.fillStyle = `rgb(${(r + (255 - r) * k) | 0}, ${(g + (255 - g) * k) | 0}, ${(b + (255 - b) * k) | 0})`;
      } else {
        target.fillStyle = `rgb(${r | 0}, ${g | 0}, ${b | 0})`;
      }

      switch (mode) {
        case "mosaic": {
          // luminance drives the block's footprint, leaving a mortar gap
          const s = size * clamp(0.32 + lum * 0.68 + flash * 0.22, 0, 1);
          const o = (size - s) / 2;
          const rad = Math.min(2.5, s * 0.22);
          target.beginPath();
          if (target.roundRect) target.roundRect(x + o, y + o, s, s, rad);
          else target.rect(x + o, y + o, s, s);
          target.fill();
          break;
        }
        case "pixel":
        case "dither": {
          target.fillRect(x, y, size, size);
          break;
        }
        case "dots": {
          const rr = (size / 2) * (0.2 + lum * 0.8);
          target.beginPath();
          target.arc(x + size / 2, y + size / 2, rr, 0, Math.PI * 2);
          target.fill();
          break;
        }
        case "diamond": {
          const h = (size / 2) * (0.3 + lum * 0.7);
          const mx = x + size / 2;
          const my = y + size / 2;
          target.beginPath();
          target.moveTo(mx, my - h);
          target.lineTo(mx + h, my);
          target.lineTo(mx, my + h);
          target.lineTo(mx - h, my);
          target.closePath();
          target.fill();
          break;
        }
        case "characters":
        case "hexdump": {
          const set = mode === "hexdump" ? CHAR_SETS.hex : CHAR_SETS.standard;
          const glyph = set[clamp(Math.floor(lum * (set.length - 1)), 0, set.length - 1)];
          target.font = `${size * (0.7 + lum * 0.35)}px var(--font-mono, monospace)`;
          target.textAlign = "center";
          target.textBaseline = "middle";
          target.fillText(glyph, x + size / 2, y + size / 2);
          break;
        }
        default: {
          target.fillRect(x, y, size, size);
        }
      }
    };

    const renderFrame = (target, time) => {
      const cfg = cfgRef.current;
      const cell = Math.max(4, cfg.cellSize);
      const speed = cfg.animSpeed?.enabled ? cfg.animSpeed.intensity / 100 : 0;
      const amp = cfg.animIntensity?.enabled ? cfg.animIntensity.intensity / 100 : 0;
      const t = cfg.animated ? ((time - start) / 1000) * speed : 0;
      const coverage = cfg.coverage / 100;
      const rev = revealRef.current;
      const edge = clamp(edgeFadeRef.current, 0, 1);

      target.globalCompositeOperation = cfg.styleBlend || "source-over";

      for (let cy = 0; cy < rows; cy += 1) {
        for (let cx = 0; cx < cols; cx += 1) {
          const data = cells[cy * cols + cx];
          if (!data) continue;

          // deterministic per-cell dropout so coverage stays stable across frames
          if (coverage < 1) {
            const hash = ((cx * 73856093) ^ (cy * 19349663)) % 1000;
            if (Math.abs(hash) / 1000 > coverage) continue;
          }

          const wob = animOffset(cfg.animStyle, cx, cy, cols, rows, t, amp);
          let lum = clamp(data.lum + wob * 0.42, 0, 1);

          // 边缘渐隐：越靠边越透明
          let alpha = 1;
          if (edge > 0) {
            const fadeStart = 1 - edge;
            if (data.edgeDist > fadeStart) {
              const k = (data.edgeDist - fadeStart) / Math.max(0.0001, edge);
              alpha = clamp(1 - k, 0, 1);
              alpha *= alpha; // 二次曲线，收尾更柔和
            }
          }

          // 逐格揭示：未到阈值不画；刚过阈值的格子短暂过冲成高亮
          let flash = 0;
          if (rev !== null) {
            if (rev <= data.threshold) continue;
            const age = (rev - data.threshold) / 0.16;
            if (age < 1) {
              flash = 1 - age;
              alpha *= 0.35 + 0.65 * age;
            }
          }

          if (alpha <= 0.01) continue;
          if (lum <= 0.015 && flash <= 0.01) continue;

          target.globalAlpha = alpha;
          drawCell(target, cfg.renderMode, cx * cell, cy * cell, cell, data, lum, flash);
        }
      }

      target.globalAlpha = 1;
      target.globalCompositeOperation = "source-over";
    };

    /* ---- step 5: post-effects ---- */
    const applyBloom = (intensity) => {
      if (!bloomCtx || !bloomCanvas) return;
      const amount = intensity / 100;
      bloomCtx.setTransform(1, 0, 0, 1, 0, 0);
      bloomCtx.clearRect(0, 0, bloomCanvas.width, bloomCanvas.height);
      bloomCtx.filter = `blur(${6 + amount * 14}px) brightness(1.25)`;
      bloomCtx.drawImage(canvas, 0, 0);
      bloomCtx.filter = "none";

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = clamp(amount * 0.9, 0, 1);
      ctx.drawImage(bloomCanvas, 0, 0);
      ctx.restore();
    };

    const applyVignette = (intensity) => {
      const amount = intensity / 100;
      const cxp = width / 2;
      const cyp = height / 2;
      const outer = Math.hypot(cxp, cyp);
      const grad = ctx.createRadialGradient(cxp, cyp, outer * (0.32 - amount * 0.12), cxp, cyp, outer);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.62, `rgba(0,0,0,${amount * 0.32})`);
      grad.addColorStop(1, `rgba(0,0,0,${clamp(amount * 1.45, 0, 0.95)})`);

      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    };

    const applyScanLines = (intensity) => {
      const amount = intensity / 100;
      ctx.save();
      ctx.globalCompositeOperation = "source-over";
      ctx.fillStyle = `rgba(0,0,0,${amount * 0.45})`;
      for (let y = 0; y < height; y += 3) ctx.fillRect(0, y, width, 1);
      ctx.restore();
    };

    const applyFilmGrain = (intensity) => {
      const amount = intensity / 100;
      ctx.save();
      ctx.globalCompositeOperation = "overlay";
      ctx.globalAlpha = amount * 0.4;
      for (let i = 0; i < (width * height) / 900; i += 1) {
        const v = Math.random() > 0.5 ? 255 : 0;
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(Math.random() * width, Math.random() * height, 1, 1);
      }
      ctx.restore();
    };

    /* ---- main loop ---- */
    let lastDrawAt = 0;
    const frame = (time) => {
      rafId = 0;
      if (disposed) return;
      /* 30fps 节流：每帧都要重画整张 ASCII 网格并跑 bloom 后处理，
         60fps 会占满移动端主线程、滚动时明显掉帧；30fps 观感基本一致。
         静态模式不受影响，resize 补帧仍然每帧都画。 */
      if (!staticOnly && lastDrawAt && time - lastDrawAt < 30) {
        rafId = requestAnimationFrame(frame);
        return;
      }
      lastDrawAt = time;
      const cfg = cfgRef.current;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      // step 1: background layer
      if (cfg.bgMode === "solid") {
        ctx.save();
        ctx.globalAlpha = cfg.bgOpacity / 100;
        ctx.fillStyle = bgColor;
        ctx.fillRect(0, 0, width, height);
        ctx.restore();
      } else if (cfg.bgMode === "blur" && imageReady) {
        ctx.save();
        ctx.globalAlpha = cfg.bgOpacity / 100;
        ctx.filter = `blur(${cfg.bgBlur}px)`;
        const scale = Math.max(width / image.width, height / image.height);
        const dw = image.width * scale;
        const dh = image.height * scale;
        ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
        ctx.restore();
      } else if (cfg.bgMode === "photo" && imageReady) {
        ctx.save();
        ctx.globalAlpha = cfg.bgOpacity / 100;
        const scale = Math.max(width / image.width, height / image.height);
        const dw = image.width * scale;
        const dh = image.height * scale;
        ctx.drawImage(image, (width - dw) / 2, (height - dh) / 2, dw, dh);
        ctx.restore();
      }

      // steps 2-3-4: the cell grid itself
      renderFrame(ctx, time);

      // step 5: post-effects, in listed order
      const pfx = cfg.pfx || {};
      if (pfx.scanLines?.enabled) applyScanLines(pfx.scanLines.intensity);
      if (pfx.vignette?.enabled) applyVignette(pfx.vignette.intensity);
      if (pfx.bloom?.enabled) applyBloom(pfx.bloom.intensity);
      if (pfx.filmGrain?.enabled) applyFilmGrain(pfx.filmGrain.intensity);

      if (staticOnly) return;
      rafId = requestAnimationFrame(frame);
    };

    // 动画模式下持续排帧；静态模式下只补画一帧
    const startLoop = () => {
      if (disposed || rafId || pausedRef.current) return;
      rafId = requestAnimationFrame(frame);
    };

    const redrawOnce = () => {
      if (disposed || rafId) return;
      rafId = requestAnimationFrame(frame);
    };

    const stopLoop = () => {
      cancelAnimationFrame(rafId);
      rafId = 0;
    };

    const markImageReady = () => {
      if (disposed || imageReady || image.naturalWidth === 0) return;
      imageReady = true;
      resize(); // 重新按图片采样格子，之前 imageReady=false 时 cells 是空的
      stopLoop();
      startLoop();
      redrawOnce(); // startLoop 被暂停时，至少补画一帧
    };

    image.onload = markImageReady;
    image.onerror = () => {
      // 不把 imageReady 置回 false，交给下面的 decode / 超时兜底再试
    };
    image.src = src;

    /* 部分移动端 WebView 不会触发 Image 的 onload，但 decode() 能成功；
       只等 onload 会让画布永远停在黑底，开屏图像和逐格动画全都看不见。
       这里不等 onload，直接解码一次，再加一道 complete/naturalWidth 兜底。 */
    if (typeof image.decode === "function") {
      image.decode().then(markImageReady).catch(() => {});
    }
    const readyTimeout = window.setTimeout(() => {
      if (!imageReady && image.complete && image.naturalWidth > 0) markImageReady();
    }, 1500);

    resize();
    // 即使初始为 paused 也先画一帧，保证揭示瞬间就有内容而非空白
    redrawOnce();
    startLoop();

    loopRef.current = { start: startLoop, stop: stopLoop, redraw: redrawOnce };

    const observer = new ResizeObserver(() => {
      resize();
      if (staticOnly) redrawOnce();
    });
    observer.observe(canvas);

    // 滚出视口就停掉动画循环，避免常驻页面白耗 CPU
    const visibility = new IntersectionObserver(
      ([entry]) => {
        if (staticOnly) return;
        if (entry?.isIntersecting) startLoop();
        else stopLoop();
      },
      { threshold: 0 },
    );
    visibility.observe(canvas);

    const onVisibilityChange = () => {
      if (staticOnly) return;
      if (document.hidden) stopLoop();
      else startLoop();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      disposed = true;
      window.clearTimeout(readyTimeout);
      loopRef.current = { start: null, stop: null, redraw: null };
      stopLoop();
      observer.disconnect();
      visibility.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [src, bgColor]);

  useEffect(() => {
    pausedRef.current = paused;
    const loop = loopRef.current;
    if (paused) loop.stop?.();
    else loop.start?.();
  }, [paused]);

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />;
}
