import { asset } from "../utils/asset";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AsciiVignetteBloom from "./AsciiVignetteBloom";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let completed = false;
    const startedAt = Date.now();
    // 最短展示 1700ms：够看清逐格揭示，又不让人久等。
    const minDuration = 1700;
    let exitTimeoutId;
    const tickIds = [];

    /*
     * 关键：进度用 setTimeout 按时间戳推进，不再依赖 requestAnimationFrame。
     * 微信/手机内置浏览器在开屏阶段、息屏或切后台时会暂停 rAF，
     * 之前进度就永远卡在截图里的 049%。setTimeout 虽也会被节流，
     * 但配合下面的硬超时兜底，一定能走到头。
     */
    const finish = () => {
      if (completed) return;
      completed = true;
      tickIds.forEach((id) => window.clearTimeout(id));
      setProgress(100);
      exitTimeoutId = window.setTimeout(onComplete, 300);
    };

    const advance = () => {
      if (completed) return;
      const elapsed = Math.min((Date.now() - startedAt) / minDuration, 1);
      // 近线性 + 尾段减速：结尾正好收在 96%，到点由 finish 补到 100
      const eased =
        elapsed < 0.85 ? elapsed * 1.08 : 1.08 * 0.85 + (elapsed - 0.85) * 0.547;
      setProgress(Math.min(96, Math.round(Math.min(eased, 1) * 96)));
      if (elapsed >= 1) {
        finish();
        return;
      }
      tickIds.push(window.setTimeout(advance, 60));
    };
    advance();

    // 硬超时兜底：无论 rAF/定时器是否被节流，最多 2600ms 强制放行，
    // 保证网站一定能进，绝不出现加载不完卡死。
    tickIds.push(window.setTimeout(finish, 2600));

    // 页面从后台回到前台时若已超时，立刻结束，避免继续转圈。
    const onVisible = () => {
      if (!document.hidden && Date.now() - startedAt >= minDuration) finish();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      tickIds.forEach((id) => window.clearTimeout(id));
      window.clearTimeout(exitTimeoutId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [onComplete]);

  // 进度 0-78% 映射到网格揭示 0-1，之后网格保持完整形态
  const gridReveal = Math.min(1, progress / 78);

  return (
    <motion.div
      className="loading-screen"
      initial={{ opacity: 1 }}
      exit={{
        opacity: 0,
        transition: { duration: 0.72, ease: [0.76, 0, 0.24, 1] },
      }}
      data-exiting={progress >= 100 ? "true" : undefined}
      aria-live="polite"
      aria-label={`Loading ${progress}%`}
    >
      <div className="loading-screen__grain" aria-hidden="true" />

      <div className="loading-screen__meta loading-screen__meta--left">
        <span>YEAR</span>
        <strong>2026</strong>
        <span>TYPE</span>
        <strong>PORTFOLIO</strong>
      </div>
      <div className="loading-screen__meta loading-screen__meta--right">
        <span>HOU HAIYAN</span>
        <strong>VISUAL DESIGN</strong>
      </div>

      <div className="loading-ascii" aria-hidden="true">
        <AsciiVignetteBloom
          className="loading-ascii__canvas"
          src={asset("/hero-bg.jpg")}
          bgColor="transparent"
          edgeFade={0.42}
          /* 网格随进度逐格铺开，在 78% 处就铺满，留一段完整形态给用户看 */
          reveal={gridReveal < 1 ? gridReveal : null}
          /* 静态网格：逐格揭示到位后保持静止，不做 wave 循环闪动 */
          config={{
            bgMode: "none",
            animated: false,
            animIntensity: { enabled: false, intensity: 0 },
            pfx: { vignette: { enabled: true, intensity: 24 }, bloom: { enabled: false, intensity: 0 } },
          }}
        />
      </div>

      <div className="loading-screen__collection">
        <span>PERSONAL</span>
        <strong>ARCHIVE</strong>
      </div>

      <div className="loading-screen__progress">
        <div className="loading-screen__track">
          <motion.i animate={{ scaleX: progress / 100 }} transition={{ ease: "linear", duration: 0.05 }} />
        </div>
        <div className="loading-screen__value">
          <span>LOADING</span>
          <strong>{String(progress).padStart(3, "0")}</strong>
          <em>%</em>
        </div>
      </div>
    </motion.div>
  );
}
