import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const tiles = [
  [0, 1], [1, 0], [1, 1], [1, 2],
  [2, 0], [2, 1], [2, 2], [2, 3],
  [3, 1], [3, 2],
];

export default function LoadingScreen({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [activeTiles, setActiveTiles] = useState([]);

  useEffect(() => {
    let imageReady = false;
    let minTimeReady = false;
    let completed = false;
    const image = new Image();
    const startedAt = performance.now();
    const minDuration = 1650;
    let frameId;
    let completeTimeoutId;

    const complete = () => {
      if (completed || !imageReady || !minTimeReady) return;
      completed = true;
      setProgress(100);
      completeTimeoutId = window.setTimeout(onComplete, 380);
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
    image.src = "/hero-bg.jpg";

    const tick = (now) => {
      const elapsed = Math.min((now - startedAt) / minDuration, 1);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setProgress(Math.min(96, Math.round(eased * 96)));

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
    };
  }, [onComplete]);

  useEffect(() => {
    const randomizeTiles = () => {
      const amount = Math.random() > 0.7 ? 2 : 1;
      const picked = new Set();
      while (picked.size < amount) {
        picked.add(Math.floor(Math.random() * tiles.length));
      }
      setActiveTiles([...picked]);
    };

    randomizeTiles();
    const intervalId = window.setInterval(randomizeTiles, 260);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <motion.div
      className="loading-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.55, ease: [0.76, 0, 0.24, 1] } }}
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

      <div className="loading-face" aria-hidden="true">
        {tiles.map(([row, column], index) => {
          const isActive = activeTiles.includes(index);
          const driftX = ((index * 13) % 9) - 4;
          const driftY = ((index * 7) % 7) - 3;

          return (
            <motion.div
              key={`${row}-${column}`}
              className="loading-face__tile"
              style={{ "--row": row, "--column": column }}
              initial={{ opacity: 0, scale: 0.72, y: 18 }}
              animate={{
                x: isActive ? [0, driftX * 3, 0] : [0, driftX, 0],
                y: isActive ? [0, driftY * 4, 0] : [0, driftY, 0],
                scale: isActive ? [1, 0.78, 1.06, 1] : [1, 1.018, 1],
                opacity: isActive ? [1, 0.28, 1] : [0.82, 1, 0.82],
                filter: isActive
                  ? ["contrast(1.25) grayscale(1)", "contrast(1.8) grayscale(1)", "contrast(1.25) grayscale(1)"]
                  : "contrast(1.25) grayscale(1)",
              }}
              transition={{
                delay: 0.1 + index * 0.055,
                duration: isActive ? 0.42 : 2.1 + (index % 3) * 0.22,
                ease: isActive ? [0.22, 1, 0.36, 1] : "easeInOut",
                repeat: isActive ? 0 : Infinity,
                repeatType: "mirror",
              }}
            />
          );
        })}
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
