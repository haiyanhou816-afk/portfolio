import { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * PixelBulb — 半调点阵灯泡主题切换图标
 * 用程序化生成的点阵网格模拟 halftone 灯泡：
 * 亮起时（light 主题）点阵密集明亮，熄灭时（dark 主题）点阵稀疏暗淡。
 *
 * @param {boolean} lit  — 是否亮起
 * @param {number}  size — 图标边长 px
 */
export default function PixelBulb({ lit = false, size = 18 }) {
  // 点阵网格：24x26，灯泡轮廓由数学形状定义
  const dots = useMemo(() => {
    const COLS = 24;
    const ROWS = 26;
    const result = [];

    // 灯泡玻璃球：圆心 (11.5, 9.5)，半径 8.2
    const bulbCx = 11.5;
    const bulbCy = 9.5;
    const bulbR = 8.2;

    // 灯头（螺纹）：矩形收窄区域
    const neckTop = 17.5;
    const neckBottom = 24;

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const dx = col - bulbCx;
        const dy = row - bulbCy;
        const dist = Math.sqrt(dx * dx + dy * dy);

        let inShape = false;
        let intensity = 0;

        // 玻璃球区域
        if (dist <= bulbR && row < neckTop) {
          inShape = true;
          // 中心亮、边缘暗 —— halftone 渐变
          intensity = 1 - (dist / bulbR) * 0.72;
        }
        // 灯头区域：向下收窄的梯形
        else if (row >= neckTop && row <= neckBottom) {
          const progress = (row - neckTop) / (neckBottom - neckTop);
          const halfWidth = 4.2 - progress * 1.9;
          if (Math.abs(dx) <= halfWidth) {
            inShape = true;
            // 灯头稀疏点阵
            intensity = 0.42 - progress * 0.16;
            // 螺纹横向条带效果
            if (row % 2 === 0) intensity *= 0.55;
          }
        }

        if (!inShape) continue;

        // halftone：intensity 决定点半径
        const r = Math.max(0.16, intensity * 0.46);
        // 边缘点更小更稀疏，制造点阵消散感
        const edgeFade = dist > bulbR * 0.82 && row < neckTop ? 0.6 : 1;

        result.push({
          cx: col,
          cy: row,
          r: r * edgeFade,
          intensity,
        });
      }
    }
    return result;
  }, []);

  return (
    <motion.svg
      width={size}
      height={size * (26 / 24)}
      viewBox="0 0 24 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: "block", overflow: "visible" }}
    >
      {/* 灯泡点阵 */}
      <g>
        {dots.map((d, i) => (
          <motion.circle
            key={i}
            cx={d.cx}
            cy={d.cy}
            r={d.r}
            fill="currentColor"
            initial={false}
            animate={{
              opacity: lit
                ? Math.min(1, d.intensity * 1.5 + 0.28)
                : d.intensity * 0.42 + 0.06,
            }}
            transition={{
              duration: 0.34,
              delay: lit ? d.cy * 0.006 : 0,
              ease: [0.22, 1, 0.36, 1],
            }}
          />
        ))}
      </g>

      {/* 左上高光小圆点 —— 参考图的签名细节 */}
      <motion.circle
        cx={5.6}
        cy={3.4}
        r={1.6}
        fill="currentColor"
        initial={false}
        animate={{
          opacity: lit ? 1 : 0.22,
          scale: lit ? 1 : 0.82,
        }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        style={{ transformOrigin: "5.6px 3.4px" }}
      />

    </motion.svg>
  );
}
