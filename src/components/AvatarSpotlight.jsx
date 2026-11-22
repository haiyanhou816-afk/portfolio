import { asset } from "../utils/asset";
import { useCallback, useEffect, useRef, useState } from "react";
import AsciiVignetteBloom from "./AsciiVignetteBloom";

/**
 * 关于我头像 —— 封面质感 + 鼠标 / 手机体感交互。
 *
 * 三层结构（自下而上）：
 *  1. 原始照片：静止时唯一可见的层，保持正常观感
 *  2. ASCII 层：与首页封面同一套 mosaic 效果，默认整层不可见，
 *     通过跟随"指针"的径向 mask 只在交互处显形
 *  3. 光泽层：斜向高光，随指针移动，给"封面"那种印刷质感
 *
 * 桌面：鼠标位置 → 光斑位置 + rotateX/rotateY 倾斜。
 * 手机：点按钮开启体感后，DeviceOrientation 的 beta/gamma 相对
 *       开启瞬间的姿态取增量，映射成同一组 0~1 的虚拟指针坐标，
 *       因此手机往右倾 = 光斑往右走，往前/后倾 = 光斑上下走。
 *       倾斜方向和桌面保持同一套直觉（往哪边推就往哪边倒）。
 *
 * ASCII canvas 常驻挂载而不是 hover 时才创建，避免每次进入都重新
 * 解码图片 + 重建离屏采样，那会有明显的一帧空白。
 */
const FULL_TILT = 26; // 倾斜多少度到达图片边缘

export default function AvatarSpotlight({ src = asset("/avatar.jpg"), alt, lang = "zh" }) {
  const z = lang === "zh";
  const wrapRef = useRef(null);
  const rafRef = useRef(0);
  const pendingRef = useRef(null);
  const baseRef = useRef(null); // 体感基准姿态 { beta, gamma }
  const [hovering, setHovering] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [gyroStatus, setGyroStatus] = useState("idle"); // idle | on | denied | unsupported
  const [touchDevice, setTouchDevice] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    setReduceMotion(mq.matches);
    const onChange = (event) => setReduceMotion(event.matches);
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  useEffect(() => {
    setTouchDevice(window.matchMedia?.("(hover: none)")?.matches ?? false);
  }, []);

  // 虚拟指针位置只写 CSS 变量，不进 React state：
  // 避免每次移动都触发整棵子树 re-render。
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

  const queuePoint = useCallback(
    (x, y) => {
      // 限幅，手机突然翻转时不会让光斑飞出卡片
      pendingRef.current = {
        x: Math.min(1, Math.max(0, x)),
        y: Math.min(1, Math.max(0, y)),
      };
      if (!rafRef.current) rafRef.current = requestAnimationFrame(applyPointer);
    },
    [applyPointer]
  );

  const handlePointerMove = useCallback(
    (event) => {
      if (event.pointerType === "touch" || gyroStatus === "on") return;
      const bounds = event.currentTarget.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      queuePoint(
        (event.clientX - bounds.left) / bounds.width,
        (event.clientY - bounds.top) / bounds.height
      );
    },
    [gyroStatus, queuePoint]
  );

  const handlePointerEnter = useCallback(
    (event) => {
      if (event.pointerType === "touch" || gyroStatus === "on") return;
      setHovering(true);
    },
    [gyroStatus]
  );

  const resetCenter = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    pendingRef.current = null;
    const node = wrapRef.current;
    if (!node) return;
    node.style.setProperty("--tilt-x", "0deg");
    node.style.setProperty("--tilt-y", "0deg");
    node.style.setProperty("--spot-x", "50%");
    node.style.setProperty("--spot-y", "50%");
  }, []);

  const handlePointerLeave = useCallback(
    (event) => {
      if (event.pointerType === "touch") return;
      setHovering(false);
      resetCenter();
    },
    [resetCenter]
  );

  // 手机倾斜 → 虚拟指针。beta = 前后俯仰，gamma = 左右横滚；
  // 以开启瞬间的姿态为原点取增量，横屏时按屏幕旋转角换算轴向。
  const handleOrientation = useCallback(
    (event) => {
      const { beta, gamma } = event;
      if (typeof beta !== "number" || typeof gamma !== "number") return;
      const angle = window.screen?.orientation?.angle ?? window.orientation ?? 0;

      let rawX = gamma;
      let rawY = beta;
      if (angle === 90) {
        rawX = -beta;
        rawY = gamma;
      } else if (angle === 180 || angle === -180) {
        rawX = -gamma;
        rawY = -beta;
      } else if (angle === 270 || angle === -90) {
        rawX = beta;
        rawY = -gamma;
      }

      if (!baseRef.current) baseRef.current = { x: rawX, y: rawY };
      const base = baseRef.current;
      queuePoint(0.5 + (rawX - base.x) / (2 * FULL_TILT), 0.5 + (rawY - base.y) / (2 * FULL_TILT));
    },
    [queuePoint]
  );

  const enableGyro = useCallback(async () => {
    const DOE = window.DeviceOrientationEvent;
    if (!DOE) {
      setGyroStatus("unsupported");
      return;
    }
    try {
      // iOS 13+ 必须在用户手势里申请授权
      if (typeof DOE.requestPermission === "function") {
        const result = await DOE.requestPermission();
        if (result !== "granted") {
          setGyroStatus("denied");
          return;
        }
      }
      baseRef.current = null;
      window.addEventListener("deviceorientation", handleOrientation);
      setHovering(false);
      resetCenter();
      setGyroStatus("on");
    } catch {
      setGyroStatus("denied");
    }
  }, [handleOrientation, resetCenter]);

  const disableGyro = useCallback(() => {
    window.removeEventListener("deviceorientation", handleOrientation);
    baseRef.current = null;
    setGyroStatus("idle");
    resetCenter();
  }, [handleOrientation, resetCenter]);

  // 页面切到后台 / 组件卸载时停掉监听与动画帧
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden && gyroStatus === "on") {
        window.removeEventListener("deviceorientation", handleOrientation);
      } else if (!document.hidden && gyroStatus === "on") {
        baseRef.current = null;
        window.addEventListener("deviceorientation", handleOrientation);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [gyroStatus, handleOrientation]);

  useEffect(
    () => () => {
      window.removeEventListener("deviceorientation", handleOrientation);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    [handleOrientation]
  );

  const active = hovering || gyroStatus === "on";
  const gyroLabel =
    gyroStatus === "on"
      ? z
        ? "体感已开启 · 点按关闭"
        : "Tilt on · tap to stop"
      : gyroStatus === "denied"
        ? z
          ? "未获得动作权限 · 点按重试"
          : "Motion blocked · tap to retry"
        : gyroStatus === "unsupported"
          ? z
            ? "此设备不支持体感"
            : "Tilt not available"
          : z
            ? "开启体感 · 倾斜手机试试"
            : "Enable tilt";

  return (
    <div
      ref={wrapRef}
      className={`avatar-spotlight ${active ? "avatar-spotlight--active" : ""}`}
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
            paused={!active}
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

      {touchDevice && (
        <button
          type="button"
          className={`avatar-spotlight__gyro ${
            gyroStatus === "on" ? "avatar-spotlight__gyro--on" : ""
          }`}
          onClick={gyroStatus === "on" ? disableGyro : enableGyro}
          disabled={gyroStatus === "unsupported"}
          aria-pressed={gyroStatus === "on"}
        >
          <span className="avatar-spotlight__gyro-dot" aria-hidden="true" />
          {gyroLabel}
        </button>
      )}
    </div>
  );
}
