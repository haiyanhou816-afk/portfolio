import { asset } from "../utils/asset";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import AsciiVignetteBloom from "./AsciiVignetteBloom";

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let imageReady = false;
    let minTimeReady = false;
    let completed = false;
    const image = new Image();
    const startedAt = performance.now();
    // 最短展示时长：原为 4200ms，移动端等待过久会被当成「卡住」。
    // 缩短后网格依旧随进度铺开，只是节奏更利落、内容更早可看。
    const minDuration = 1100;
    let frameId;
    let completeTimeoutId;
    let imageTimeoutId;

    const complete = () => {
      if (completed || !imageReady || !minTimeReady) return;
      completed = true;
      setProgress(100);
      completeTimeoutId = window.setTimeout(onComplete, 320);
    };

    const markImageReady = () => {
      imageReady = true;
      complete();
    };

    image.onload = () => {
      if (image.decode) {
        image.decode().then(markImageReady).catch(markImageReady);
      } else {
        markImageReady();
      }
    };
    image.onerror = markImageReady;
    image.src = asset("/hero-bg.jpg");

    /* 兜底：部分移动端 WebView 里 image.decode() 的 Promise 可能永远不 settle，
       弱网下图片请求也可能一直挂着、连 onerror 都不触发。上面两个条件缺一个，
       加载页就会永远停在 096%。这里最多等 2600ms 强制放行，保证网站一定能进。 */
    imageTimeoutId = window.setTimeout(() => {
      if (completed) return;
      imageReady = true;
      minTimeReady = true;
      complete();
    }, 2600);

    const tick = (now) => {
      const elapsed = Math.min((now - startedAt) / minDuration, 1);
      // 近线性 + 尾段减速：全程匀速爬升，最后 15% 放慢一半，结尾正好收在 96%
      const eased = elapsed < 0.85 ? elapsed * 1.08 : 1.08 * 0.85 + (elapsed - 0.85) * 0.547;
      setProgress(Math.min(96, Math.round(Math.min(eased, 1) * 96)));

      if (elapsed < 1) {
        frameId = requestAnimationFrame(tick);
      } else {
        minTimeReady = true;
        complete();
      }
    };

    frameId = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frameId);
      window.clearTimeout(completeTimeoutId);
      window.clearTimeout(imageTimeoutId);
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
          config={{ bgMode: "none" }}
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
