import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export default function Hero({ lang, theme }) {
  const heroRef = useRef(null);
  const curtainRef = useRef(null);
  const titleRef = useRef(null);
  const characterRefs = useRef([]);
  const [curtainOpen, setCurtainOpen] = useState(false);
  const isDark = theme === "dark";
  const heroTitle = "portfolio";

  const setPointer = useCallback((event) => {
    const hero = heroRef.current;
    if (!hero) return;

    const bounds = hero.getBoundingClientRect();
    hero.style.setProperty("--pointer-x", `${event.clientX - bounds.left}px`);
    hero.style.setProperty("--pointer-y", `${event.clientY - bounds.top}px`);
    hero.style.setProperty("--pointer-x-normalized", `${(event.clientX - bounds.left) / bounds.width}`);
    hero.style.setProperty("--pointer-y-normalized", `${(event.clientY - bounds.top) / bounds.height}`);
  }, []);

  useEffect(() => {
    const reveal = window.setTimeout(() => setCurtainOpen(true), 120);
    return () => window.clearTimeout(reveal);
  }, []);

  const scrollToProjects = () => {
    document.getElementById("projects")?.scrollIntoView({ behavior: "smooth" });
  };

  const handleTitleMove = (event) => {
    const title = titleRef.current;
    if (!title) return;

    const bounds = title.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    characterRefs.current.forEach((character, index) => {
      const distanceFromCenter = index / (characterRefs.current.length - 1) - 0.5;
      const twist = x * distanceFromCenter * 4.4 + y * 1.35;
      character?.style.setProperty("--character-rotate", `${twist}deg`);
    });
  };

  const resetTitle = () => {
    const title = titleRef.current;
    if (!title) return;

    characterRefs.current.forEach((character) => {
      character?.style.setProperty("--character-rotate", "0deg");
    });
  };

  return (
    <section
      ref={heroRef}
      id="hero"
      className={`portfolio-hero ${isDark ? "portfolio-hero--dark" : "portfolio-hero--light"}`}
      onPointerMove={setPointer}
    >
      <div className="hero-grain" aria-hidden="true" />
      <div className="hero-portrait-base" aria-hidden="true" />
      <div className="hero-portrait-focus" aria-hidden="true" />
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

        <div
          ref={titleRef}
          className="portfolio-hero__title"
          onPointerMove={handleTitleMove}
          onPointerLeave={resetTitle}
        >
          <h1 aria-label="portfolio">
            {heroTitle.split("").map((character, index) => (
              <span
                key={`${character}-${index}`}
                className="portfolio-hero__character"
                ref={(element) => {
                  characterRefs.current[index] = element;
                }}
              >
                {character}
              </span>
            ))}
          </h1>
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
