import { memo } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * HobbyIcons — 兴趣爱好专用线性图标（含激活动效）
 *
 * 为什么不用 Lucide：篮筐、乒乓球拍、卧推架这三个 Lucide 里没有，
 * 而混用「三个自制 + 三个现成」会出现描边粗细和视觉重量不一致。
 * 所以六个统一自制，严格沿用 Lucide 的规格：24×24、currentColor、
 * strokeWidth 1.7、round 端点，放在胶囊导航那些图标旁边不会显得突兀。
 *
 * 动效只在卡片展开（active）时播放，目的是给「这一栏被打开了」一个
 * 具体的回应，而不是装饰 —— 每个动作都对应这项爱好本身的动作：
 * 快门闪一下、音符飘出去、球投进篮筐、球拍颠球、杠铃推一次。
 */

const SVG_BASE = {
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.7,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  "aria-hidden": "true",
  focusable: "false",
};

const EASE = [0.22, 1, 0.36, 1];

/* ── 摄影：快门收缩 + 闪光灯炸开 ───────────────────────────── */
function PhotographyIconBase({ active }) {
  const still = useReducedMotion();
  const on = active && !still;

  return (
    <svg {...SVG_BASE}>
      <path d="M9.2 6.6 10.6 4.4h4.2l1.4 2.2" />
      <rect x="2.5" y="6.6" width="19" height="13" rx="2.4" />

      {/* 快门：先急收再弹回，读作"咔嚓"的那一下 */}
      <motion.circle
        cx="12"
        cy="13.1"
        initial={false}
        animate={{ r: on ? [3.4, 1.5, 3.4] : 3.4 }}
        transition={
          on
            ? { duration: 0.42, times: [0, 0.38, 1], ease: EASE, repeat: Infinity, repeatDelay: 1.05 }
            : { duration: 0.2 }
        }
      />

      {/* 闪光：三道短射线在机身右上角外侧炸开后立刻收掉 */}
      <motion.g
        initial={false}
        animate={{ opacity: on ? [0, 1, 0] : 0, scale: on ? [0.5, 1.15, 0.9] : 0.5 }}
        style={{ transformOrigin: "19.6px 4.2px" }}
        transition={
          on
            ? { duration: 0.4, ease: "easeOut", repeat: Infinity, repeatDelay: 1.07 }
            : { duration: 0.18 }
        }
      >
        <path d="M19.6 2.1v1.5" />
        <path d="M17.3 2.9 18.4 4" />
        <path d="M21.9 2.9 20.8 4" />
      </motion.g>
    </svg>
  );
}

/* ── 音乐：两枚小音符往右上飘出去 ──────────────────────────── */
function MusicIconBase({ active }) {
  const still = useReducedMotion();
  const on = active && !still;

  // 两枚音符错开半拍出发，飘出去才有先后而不是并排平移
  const notes = [
    { id: "a", dx: 5.2, dy: -8.4, delay: 0 },
    { id: "b", dx: 2.4, dy: -7.2, delay: 0.42 },
  ];

  return (
    <svg {...SVG_BASE}>
      <path d="M9 17.4V6.1l11-1.9v11.3" />
      <circle cx="6.2" cy="17.7" r="2.8" />
      <circle cx="17.2" cy="15.5" r="2.8" />

      {notes.map((note) => (
        <motion.g
          key={note.id}
          initial={false}
          animate={
            on
              ? { x: [0, note.dx], y: [0, note.dy], opacity: [0, 1, 0] }
              : { x: 0, y: 0, opacity: 0 }
          }
          transition={
            on
              ? {
                  duration: 1.15,
                  ease: "easeOut",
                  repeat: Infinity,
                  repeatDelay: 0.2,
                  delay: note.delay,
                  opacity: { duration: 1.15, times: [0, 0.25, 1] },
                }
              : { duration: 0.2 }
          }
        >
          <circle cx="15.4" cy="11.4" r="1.15" />
          <path d="M16.55 11.2V8.4" />
        </motion.g>
      ))}
    </svg>
  );
}

/* ── 游戏：手柄按键交替按下 ────────────────────────────────── */
function GamingIconBase({ active }) {
  const still = useReducedMotion();
  const on = active && !still;

  const press = (delay) =>
    on
      ? {
          animate: { scale: [1, 1.5, 1], opacity: [0.55, 1, 0.55] },
          transition: { duration: 0.5, ease: EASE, repeat: Infinity, repeatDelay: 0.5, delay },
        }
      : { animate: { scale: 1, opacity: 0.55 }, transition: { duration: 0.2 } };

  const a = press(0);
  const b = press(0.25);

  return (
    <svg {...SVG_BASE}>
      <rect x="2.5" y="7.8" width="19" height="10.8" rx="4.4" />
      <path d="M7 13.2h2.7" />
      <path d="M8.35 11.85v2.7" />
      <motion.circle
        cx="15.5"
        cy="12.3"
        r="1.05"
        fill="currentColor"
        stroke="none"
        initial={false}
        style={{ transformOrigin: "15.5px 12.3px" }}
        animate={a.animate}
        transition={a.transition}
      />
      <motion.circle
        cx="17.9"
        cy="14.4"
        r="1.05"
        fill="currentColor"
        stroke="none"
        initial={false}
        style={{ transformOrigin: "17.9px 14.4px" }}
        animate={b.animate}
        transition={b.transition}
      />
    </svg>
  );
}

/* ── 篮球：球划一道弧线进筐，网兜跟着一抖 ──────────────────── */
function BasketballIconBase({ active }) {
  const still = useReducedMotion();
  const on = active && !still;

  return (
    <svg {...SVG_BASE}>
      {/* 篮板 + 篮筐 */}
      <rect x="5.6" y="2.4" width="12.8" height="6.4" rx="1.1" />
      <path d="M8.8 8.9h6.4" />

      {/* 网兜：上宽下窄的梯形 + 两道横向网格，球穿过时纵向拉长
          （宽度贴着篮筐 8.8→15.2 起口，否则看着像漏斗不像篮筐） */}
      <motion.g
        initial={false}
        style={{ transformOrigin: "12px 9px" }}
        animate={on ? { scaleY: [1, 1, 1.25, 1] } : { scaleY: 1 }}
        transition={
          on
            ? { duration: 1.5, times: [0, 0.46, 0.62, 0.82], ease: EASE, repeat: Infinity, repeatDelay: 0.35 }
            : { duration: 0.2 }
        }
      >
        <path d="M8.9 9.2 10.4 13.6" />
        <path d="M15.1 9.2 13.6 13.6" />
        <path d="M9.5 10.9h5" />
        <path d="M10 12.4h4" />
      </motion.g>

      {/* 球：底部起手 → 上升到筐口 → 穿网落下 → 淡出复位 */}
      <motion.circle
        r="2.6"
        initial={false}
        animate={
          on
            ? { cx: [7.2, 9, 12, 12, 12, 7.2], cy: [20.4, 13.4, 9.6, 14.2, 20.4, 20.4], opacity: [1, 1, 1, 1, 0, 0] }
            : { cx: 7.2, cy: 20.4, opacity: 1 }
        }
        transition={
          on
            ? { duration: 1.5, times: [0, 0.3, 0.5, 0.68, 0.84, 1], ease: "linear", repeat: Infinity, repeatDelay: 0.35 }
            : { duration: 0.25, ease: EASE }
        }
      />
    </svg>
  );
}

/* ── 乒乓球：球拍颠球 ──────────────────────────────────────── */
function TableTennisIconBase({ active }) {
  const still = useReducedMotion();
  const on = active && !still;

  return (
    <svg {...SVG_BASE}>
      {/* 拍面 + 拍柄：整体随颠球轻微起伏，像在跟球 */}
      <motion.g
        initial={false}
        style={{ transformOrigin: "10.4px 14px" }}
        animate={on ? { y: [0, 0.9, 0], rotate: [-3, 0, -3] } : { y: 0, rotate: -3 }}
        transition={
          on
            ? { duration: 0.72, ease: "easeInOut", repeat: Infinity }
            : { duration: 0.28, ease: EASE }
        }
      >
        <circle cx="10.4" cy="13" r="4.9" />
        <path d="M10.4 17.9v3.5" strokeWidth="2.2" />
      </motion.g>

      {/* 球：落到拍面接触点再弹回，easeOut/easeIn 分段才有重量感 */}
      <motion.circle
        cx="10.4"
        r="1.65"
        initial={false}
        animate={on ? { cy: [3.6, 6.5, 3.6] } : { cy: 3.6 }}
        transition={
          on
            ? { duration: 0.72, times: [0, 0.5, 1], ease: ["easeIn", "easeOut"], repeat: Infinity }
            : { duration: 0.28, ease: EASE }
        }
      />
    </svg>
  );
}

/* ── 健身：卧推架上的杠铃推一次 ────────────────────────────── */
function FitnessIconBase({ active }) {
  const still = useReducedMotion();
  const on = active && !still;

  return (
    <svg {...SVG_BASE}>
      {/* 支架立柱与底脚 */}
      <path d="M6.2 20.8V11.8" />
      <path d="M17.8 20.8V11.8" />
      <path d="M4.2 20.8h4" />
      <path d="M15.8 20.8h4" />

      {/* 杠铃：横杠 + 两侧配片，整组做一次推举 */}
      <motion.g
        initial={false}
        animate={on ? { y: [0, 3, 0] } : { y: 0 }}
        transition={
          on
            ? { duration: 1.25, times: [0, 0.42, 1], ease: "easeInOut", repeat: Infinity, repeatDelay: 0.2 }
            : { duration: 0.3, ease: EASE }
        }
      >
        <path d="M3.2 9.3h17.6" />
        <path d="M8.4 6.6v5.4" />
        <path d="M15.6 6.6v5.4" />
      </motion.g>
    </svg>
  );
}

export const PhotographyIcon = memo(PhotographyIconBase);
export const MusicIcon = memo(MusicIconBase);
export const GamingIcon = memo(GamingIconBase);
export const BasketballIcon = memo(BasketballIconBase);
export const TableTennisIcon = memo(TableTennisIconBase);
export const FitnessIcon = memo(FitnessIconBase);
