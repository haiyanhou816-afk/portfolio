import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import AsciiVignetteBloom from "./AsciiVignetteBloom";
import TextFollowCursor from "./TextFollowCursor";

export default function Hero({ lang, theme, intro = false, pending = false }) {
  const heroRef = useRef(null);
  const curtainRef = useRef(null);
  const [curtainOpen, setCurtainOpen] = useState(false);
  /*
   * Hero 在加载页背后就已经挂载，那时 intro 还是 false，
   * 所以初值取 0（网格留白），等 intro 转 true 后再逐格点亮。
   * 揭示跑完会置为 1，之后 reveal 传 null 表示完整呈现。
   */
  const [reveal, setReveal] = useState(0);
  const isDark = theme === "dark";
  const heroTitle = "portfolio";

  useEffect(() => {
    const timer = window.setTimeout(() => setCurtainOpen(true), 120);
    return () => window.clearTimeout(timer);
  }, []);

  // 背景网格逐格点亮：一个一个方块亮起来，再落回完整效果
  useEffect(() => {
    /*
     * pending 表示加载页还在，此时按兵不动，等它退场触发 intro。
     * 兜底只针对"加载页被跳过、intro 也没来"的情况，
     * 避免网格永远停在未揭示状态。
     */
    if (!intro) {
      if (pending) return undefined;
      const fallback = window.setTimeout(() => {
        setReveal((current) => (current === 0 ? 1 : current));
      }, 400);
      return () => window.clearTimeout(fallback);
    }

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduce) {
      setReveal(1);
      return undefined;
    }

    let rafId = 0;
    let startedAt = 0;
    const duration = 1400;

    const step = (now) => {
      if (!startedAt) startedAt = now;
      const p = Math.min((now - startedAt) / duration, 1);
      // easeOutCubic：开头密集亮起，收尾放缓
      setReveal(1 - Math.pow(1 - p, 3));
      if (p < 1) rafId = requestAnimationFrame(step);
    };

    // 等幕布开始拉开再启动，避免两段动画抢注意力
    const delay = window.setTimeout(() => {
      rafId = requestAnimationFrame(step);
    }, 260);

    return () => {
      window.clearTimeout(delay);
      cancelAnimationFrame(rafId);
    };
  }, [intro, pending]);

  const scrollToProjects = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      ref={heroRef}
      id="hero"
      className={`portfolio-hero ${isDark ? "portfolio-hero--dark" : "portfolio-hero--light"}`}
    >
      <div className="hero-grain" aria-hidden="true" />
      <div className="hero-ascii" aria-hidden="true">
        <AsciiVignetteBloom
          className="hero-ascii__canvas"
          src="/hero-bg.jpg"
          bgColor="transparent"
          edgeFade={0.3}
          reveal={reveal < 1 ? reveal : null}
          config={{
            bgMode: "none",
            cellSize: 14,
            brightness: isDark ? 6 : 20,
            contrast: 118,
            saturation: isDark ? 55 : 85,
            pfx: {
              vignette: { enabled: true, intensity: 46 },
              bloom: { enabled: true, intensity: 22 },
            },
            animIntensity: { enabled: true, intensity: 42 },
          }}
        />
      </div>
      <div className="hero-sun" aria-hidden="true" />

      <div className="hero-statusbar">
        <nav className="hero-statusbar__nav" aria-label={lang === "zh" ? "首屏导航" : "Cover navigation"}>
          <a href="#about">
            HHY
          </a>
        </nav>

        <div className="hero-statusbar__mark" aria-label="HOUHAIYAN">
          <span>HOU</span>
          <i>HHY</i>
          <span>HAIYAN</span>
        </div>

        <div className="hero-statusbar__info">
          <span>VISUAL DESIGN</span>
          <span>2026</span>
          <span className="hero-statusbar__availability"><i /> AVAILABLE</span>
        </div>
      </div>

      <div className="portfolio-hero__content">
        <p className="portfolio-hero__eyebrow">
          {lang === "zh" ? "视觉设计 / 品牌叙事 / AI 协作" : "VISUAL DESIGN / BRAND NARRATIVE / AI COLLABORATION"}
        </p>

        <div className="portfolio-hero__title">
          <TextFollowCursor
            text={heroTitle}
            as="h1"
            charClassName="portfolio-hero__character"
            sunHeight={520}
            ease={0.16}
            radius={460}
            perspective={620}
          />
        </div>

        <div className="portfolio-hero__footer-copy">
          <p>
            {lang === "zh"
              ? "我把想法转化为清晰、鲜活且有记忆点的视觉系统。"
              : "I turn ideas into clear, vivid visual systems with staying power."}
          </p>
          <motion.button
            type="button"
            onClick={scrollToProjects}
            className="portfolio-hero__cta"
            whileHover={{ x: 5 }}
            whileTap={{ scale: 0.97 }}
          >
            <span>{lang === "zh" ? "浏览作品" : "Explore work"}</span>
            <ArrowDownRight size={20} strokeWidth={1.7} />
          </motion.button>
        </div>
      </div>

      <div className="portfolio-hero__stamp" aria-hidden="true">
        <span>HHY</span>
        <ArrowUpRight size={16} strokeWidth={1.5} />
        <span>STUDIO</span>
      </div>

      <button type="button" className="portfolio-hero__scroll" onClick={scrollToProjects}>
        <span>{lang === "zh" ? "向下滚动" : "Scroll to explore"}</span>
        <i />
      </button>

      <div
        ref={curtainRef}
        className={`hero-curtain ${isDark ? "hero-curtain--dark" : "hero-curtain--light"} ${curtainOpen ? "hero-curtain--open" : ""}`}
      />
    </section>
  );
}
