import { memo, useId } from "react";
import { motion } from "framer-motion";

/**
 * SunToggle — 主题切换图标（太阳 / 月亮）
 *
 * 设计取向遵循 DESIGN_DNA：
 *   - 线性描边，与胶囊导航里的 Globe / Sparkles（Lucide）同一套语言
 *   - 单色 currentColor，不引入新彩色（红色是 Featured 专属，不外借）
 *   - 动效必须有目的：这里表达"日 ↔ 夜"的状态转换本身，
 *     光芯收缩成月牙、光芒同时收拢，一眼能读出当前处于哪个主题
 *
 * @param {boolean} lit  — true 为亮色主题（太阳），false 为暗色主题（月亮）
 * @param {number}  size — 图标边长 px
 */
const RAY_COUNT = 8;

// 8 条光芒：正交 4 条更长，对角 4 条略短，避免均匀排布显得呆板
const rays = Array.from({ length: RAY_COUNT }, (_, index) => {
  const angle = (index * 360) / RAY_COUNT;
  const isDiagonal = index % 2 === 1;
  return {
    angle,
    inner: isDiagonal ? 7.4 : 7.2,
    outer: isDiagonal ? 9.9 : 10.4,
  };
});

function SunToggle({ lit = false, size = 18 }) {
  // 描边宽度随尺寸微调，小尺寸下过细会发灰、糊掉
  const stroke = size <= 16 ? 1.7 : 1.5;
  /*
   * Header 会同时挂桌面版和移动版两个实例。
   * mask id 若写死就会在文档里重复，浏览器只认第一个，
   * 结果是移动端图标跟着桌面端的状态走。useId 保证每个实例独立。
   */
  const maskId = `sun-toggle-mask-${useId()}`;

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      {/*
        日月共用一条路径。太阳态是整圆，月亮态靠右上角的遮罩挖出月牙 ——
        比"两个图标交叉淡入淡出"更连贯，读起来是同一个天体在变化。
      */}
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
          <rect x="0" y="0" width="24" height="24" fill="white" />
          <motion.circle
            r="8.6"
            fill="black"
            initial={false}
            animate={{
              cx: lit ? 30 : 17.4,
              cy: lit ? -6 : 6.6,
            }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          />
        </mask>
      </defs>

      <motion.circle
        cx="12"
        cy="12"
        fill="none"
        mask={`url(#${maskId})`}
        initial={false}
        // 月亮态略大一点，月牙被削掉一半后视觉重量才与太阳相当
        animate={{ r: lit ? 5 : 6.2 }}
        transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      />

      {/*
        光芒：太阳态展开，月亮态收回圆心并淡出。
        旋转只作用在这一组，不动整个 svg —— 否则月牙的缺口会被转到正上方，
        看起来像一只碗而不是月亮。
      */}
      <motion.g
        initial={false}
        animate={{ rotate: lit ? 0 : -32 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "12px 12px" }}
      >
        {rays.map((ray) => {
          const radian = (ray.angle * Math.PI) / 180;
          const cos = Math.cos(radian);
          const sin = Math.sin(radian);
          return (
            <motion.line
              key={ray.angle}
              initial={false}
              animate={{
                x1: 12 + cos * (lit ? ray.inner : 0),
                y1: 12 + sin * (lit ? ray.inner : 0),
                x2: 12 + cos * (lit ? ray.outer : 0),
                y2: 12 + sin * (lit ? ray.outer : 0),
                opacity: lit ? 1 : 0,
              }}
              transition={{
                duration: 0.5,
                // 光芒依次展开而不是齐刷刷弹出，节奏更自然
                delay: lit ? 0.08 + (ray.angle / 360) * 0.16 : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
            />
          );
        })}
      </motion.g>
    </motion.svg>
  );
}

export default memo(SunToggle);
