import { useCallback, useEffect, useRef, useState } from "react";
import AsciiVignetteBloom from "./AsciiVignetteBloom";

/**
 * 关于我头像 —— 封面质感 + 鼠标交互。
 *
 * 三层结构（自下而上）：
 *  1. 原始照片：静止时唯一可见的层，保持正常观感
 *  2. ASCII 层：与首页封面同一套 mosaic 效果，默认整层不可见，
 *     通过跟随指针的径向 mask 只在鼠标经过处显形
 *  3. 光泽层：斜向高光，随指针移动，给"封面"那种印刷质感
 *
 * 倾斜用 rotateX / rotateY 实现，指针离开时回正。
 * ASCII canvas 常驻挂载而不是 hover 时才创建，避免每次进入都重新
 * 解码图片 + 重建离屏采样，那会有明显的一帧空白。
 */
export default function AvatarSpotlight({ src = "/avatar.jpg", alt }) {
  const wrapRef = useRef(null);
  const rafRef = useRef(0);
  const pendingRef = useRef(null);
  const [hovering, setHovering] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    setReduceMotion(mq.matches);
    const onChange = (event) => setReduceMotion(event.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // 指针位置只写 CSS 变量，不进 React state：
  // 避免每次 pointermove 都触发整棵子树 re-render。
  const applyPointer = useCallback(() => {
    rafRef.current = 0;
    const node = wrapRef.current;
    const point = pendingRef.current;
    if (!node || !point) return;

    const { x, y } = point;
    node.style.setProperty("--spot-x", `${x * 100}%`);
    node.style.setProperty("--spot-y", `${y * 100}%`);

    if (!reduceMotion) {
      // 中心为 0，边缘约 ±7deg；y 轴取反才符合"往哪边推就往哪边倒"的直觉
      const tiltY = (x - 0.5) * 14;
      const tiltX = (0.5 - y) * 14;
      node.style.setProperty("--tilt-x", `${tiltX.toFixed(2)}deg`);
      node.style.setProperty("--tilt-y", `${tiltY.toFixed(2)}deg`);
    }
  }, [reduceMotion]);

  const handlePointerMove = useCallback(
    (event) => {
      if (event.pointerType === "touch") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;

      pendingRef.current = {
        x: (event.clientX - bounds.left) / bounds.width,
        y: (event.clientY - bounds.top) / bounds.height,
      };
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(applyPointer);
      }
    },
    [applyPointer]
  );

  const handlePointerEnter = useCallback((event) => {
    if (event.pointerType === "touch") return;
    setHovering(true);
  }, []);

  const handlePointerLeave = useCallback((event) => {
    if (event.pointerType === "touch") return;
    setHovering(false);

    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pendingRef.current = null;

    // 回正：倾斜归零，光斑退回中心，避免下次进入时从上次的角度突跳
    const node = wrapRef.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
    node.style.setProperty("--spot-x", "50%");
    node.style.setProperty("--spot-y", "50%");
  }, []);

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  return (
    <div
      ref={wrapRef}
      className={`avatar-spotlight ${hovering ? "avatar-spotlight--active" : ""}`}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
    >
      <div className="avatar-spotlight__inner">
        <img className="avatar-spotlight__photo" src={src} alt={alt} loading="lazy" />

        <div className="avatar-spotlight__ascii" aria-hidden="true">
          <AsciiVignetteBloom
            className="avatar-spotlight__canvas"
            src={src}
            bgColor="transparent"
            paused={!hovering}
            config={{
              bgMode: "none",
              cellSize: 11,
              brightness: 10,
              contrast: 122,
              saturation: 78,
              pfx: {
                vignette: { enabled: true, intensity: 30 },
                bloom: { enabled: true, intensity: 28 },
              },
              animIntensity: { enabled: true, intensity: 52 },
            }}
          />
        </div>

        <div className="avatar-spotlight__sheen" aria-hidden="true" />
        <div className="avatar-spotlight__edge" aria-hidden="true" />
      </div>
    </div>
  );
}
