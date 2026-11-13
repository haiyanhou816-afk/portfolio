import { useEffect, useMemo, useRef, useState } from "react";
import "./DriftWall.css";

/* 稳定的伪随机，保证同一列每次渲染速度一致 */
function seed(index) {
  const value = Math.sin((index + 1) * 12.9898) * 43758.5453;
  return value - Math.floor(value);
}

/**
 * DriftWall — 3D 倾斜、多列纵向漂移的图片墙。
 * 每列独立速度（variance）、沿 Z 轴错位形成纵深（depth），
 * 鼠标移动时整面墙做轻微视差（parallax），悬停瓦片抬升（lift）。
 */
export default function DriftWall({
  items = [],
  columns = 5,
  tileWidth = 200,
  tileHeight = 132,
  gap = 18,
  tilt = 16,
  turn = -14,
  perspective = 1200,
  depth = 120,
  speed = 42,
  direction = "up",
  variance = 0.45,
  parallax = 0.6,
  lift = 64,
  fade = 0.6,
  dim = 0.55,
  overlayColor = "#060010",
  onItemClick,
  onItemDelete,
  className = "",
}) {
  const wrapRef = useRef(null);
  const stageRef = useRef(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  /* 量取容器尺寸：墙要铺满可视区，否则 3D 旋转后左右会露出大片空白 */
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const update = () => {
      const rect = wrap.getBoundingClientRect();
      setSize((prev) =>
        Math.abs(prev.width - rect.width) < 2 && Math.abs(prev.height - rect.height) < 2
          ? prev
          : { width: rect.width, height: rect.height }
      );
    };

    update();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(wrap);
    return () => observer.disconnect();
  }, []);

  const tracks = useMemo(() => {
    if (!items.length) return [];

    const cell = tileHeight + gap;
    const colWidth = tileWidth + gap;
    /* columns 作为密度下限；容器更宽时自动补列，保证画面被填满 */
    const coverColumns = size.width
      ? Math.ceil((size.width * 1.26 + 160) / colWidth)
      : Math.round(columns);
    const columnCount = Math.min(20, Math.max(1, Math.round(columns), coverColumns));

    /* 每列瓦片数按容器高度算，够铺满一屏即可（轨道再复制一份做无缝循环） */
    const perColumn = Math.max(
      3,
      Math.ceil(((size.height || 620) * 1.34) / cell) + 1
    );

    const buckets = Array.from({ length: columnCount }, () => []);
    items.forEach((item, index) => buckets[index % columnCount].push(item));
    const middle = (columnCount - 1) / 2;

    return buckets.map((bucket, columnIndex) => {
      const base = bucket.length ? bucket : items;
      /* 每列错开取图，避免相邻列内容整齐重复 */
      const list = Array.from(
        { length: perColumn },
        (_, i) => base[(i + columnIndex * 3) % base.length]
      );

      const random = seed(columnIndex);
      const factor = 1 + (random - 0.5) * 2 * variance;
      const duration = (perColumn * cell) / Math.max(6, speed * factor);
      const z = middle > 0 ? -depth * (Math.abs(columnIndex - middle) / middle) : 0;

      return {
        columnIndex,
        list,
        duration,
        delay: -random * duration,
        z,
      };
    });
  }, [items, columns, tileWidth, tileHeight, gap, speed, variance, depth, size.width, size.height]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const stage = stageRef.current;
    if (!wrap || !stage || !parallax) return;

    let frame = 0;
    let offsetX = 0;
    let offsetY = 0;

    const apply = () => {
      frame = 0;
      stage.style.setProperty("--dw-px", `${(-offsetX * 36 * parallax).toFixed(2)}px`);
      stage.style.setProperty("--dw-py", `${(-offsetY * 22 * parallax).toFixed(2)}px`);
      stage.style.setProperty("--dw-ry", `${(offsetX * 5 * parallax).toFixed(2)}deg`);
      stage.style.setProperty("--dw-rx", `${(-offsetY * 3.5 * parallax).toFixed(2)}deg`);
    };

    const handleMove = (event) => {
      const rect = wrap.getBoundingClientRect();
      offsetX = (event.clientX - rect.left) / rect.width - 0.5;
      offsetY = (event.clientY - rect.top) / rect.height - 0.5;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    const handleLeave = () => {
      offsetX = 0;
      offsetY = 0;
      if (!frame) frame = requestAnimationFrame(apply);
    };

    wrap.addEventListener("mousemove", handleMove);
    wrap.addEventListener("mouseleave", handleLeave);
    return () => {
      wrap.removeEventListener("mousemove", handleMove);
      wrap.removeEventListener("mouseleave", handleLeave);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [parallax]);

  /* 有 onItemClick 就回调（打开详情），否则退回 item.href 跳转 */
  const handleActivate = (item) => {
    if (onItemClick) {
      onItemClick(item);
      return;
    }
    if (item.href) {
      window.open(item.href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div
      ref={wrapRef}
      className={`drift-wall ${className}`.trim()}
      style={{
        "--dw-tile-w": `${tileWidth}px`,
        "--dw-tile-h": `${tileHeight}px`,
        "--dw-gap": `${gap}px`,
        "--dw-perspective": `${perspective}px`,
        "--dw-tilt": tilt,
        "--dw-turn": turn,
        "--dw-lift": `${lift}px`,
        "--dw-dim": dim,
        "--dw-fade": fade,
        "--dw-overlay": overlayColor,
      }}
    >
      <div ref={stageRef} className="drift-wall__stage">
        {tracks.map((track) => (
          <div
            key={track.columnIndex}
            className="drift-wall__col"
            style={{ "--dw-z": `${track.z}px` }}
          >
            <div
              className="drift-wall__track"
              data-direction={direction === "down" ? "down" : "up"}
              style={{
                animationDuration: `${track.duration.toFixed(2)}s`,
                animationDelay: `${track.delay.toFixed(2)}s`,
              }}
            >
              {[...track.list, ...track.list].map((item, index) => (
                <div
                  key={`${item.id ?? item.image}-${index}`}
                  className="drift-wall__tile"
                  role="button"
                  tabIndex={0}
                  aria-label={item.title || "查看图片"}
                  onClick={() => handleActivate(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleActivate(item);
                    }
                  }}
                >
                  <img
                    src={item.image}
                    alt={item.title || ""}
                    decoding="async"
                    draggable={false}
                  />
                  {item.title ? (
                    <span className="drift-wall__title">{item.title}</span>
                  ) : null}
                  {onItemDelete ? (
                    <button
                      type="button"
                      className="drift-wall__del"
                      title="删除此图片"
                      aria-label="删除此图片"
                      onClick={(event) => {
                        event.stopPropagation();
                        onItemDelete(item);
                      }}
                    >
                      <svg
                        viewBox="0 0 24 24"
                        width="13"
                        height="13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v5M14 11v5" />
                      </svg>
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="drift-wall__veil" aria-hidden="true" />
    </div>
  );
}
