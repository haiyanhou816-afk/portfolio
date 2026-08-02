import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Code2, Palette, Layers, Box, Rocket, Zap } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const skills = [
  { nameZh: "UI 设计", nameEn: "UI Design", icon: <Code2 size={32} />, descZh: "界面视觉设计", descEn: "Interface visual design" },
  { nameZh: "UX 设计", nameEn: "UX Design", icon: <Palette size={32} />, descZh: "用户体验研究", descEn: "User experience research" },
  { nameZh: "视觉设计", nameEn: "Visual Design", icon: <Layers size={32} />, descZh: "图形与排版", descEn: "Graphics & typography" },
  { nameZh: "游戏 UI", nameEn: "Game UI", icon: <Box size={32} />, descZh: "游戏界面系统", descEn: "Game interface systems" },
  { nameZh: "三维设计", nameEn: "3D Design", icon: <Rocket size={32} />, descZh: "C4D / Blender / Rhino", descEn: "C4D · Blender · Rhino" },
  { nameZh: "品牌设计", nameEn: "Brand Design", icon: <Zap size={32} />, descZh: "品牌视觉体系", descEn: "Brand identity systems" },
];

export default function Skills({ lang }) {
  const z = lang === "zh";
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef({ list: [] });
  const setCardRef = (el, i) => { if (el) cardsRef.current.list[i] = el; };

  // Sophisticated scroll-triggered entrance
  useEffect(() => {
    const tl = gsap.timeline();

    // Title entrance — massive pull-up from deep below
    tl.fromTo(headerRef.current.querySelector("h2"),
      { y: 100, opacity: 0, scale: 0.9, filter: "blur(10px)" },
      { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.8, ease: "power5.out,elastic.out(1,.2),back.out(2)" }
    );

    // Subtitle nudges up
    tl.fromTo(headerRef.current.querySelector("p"),
      { y: 50, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: "-=1.5" }
    );

    // Cards stagger reveal with subtle parallax skew
    const cardEls = cardsRef.current.list.filter(Boolean);
    if (cardEls.length > 0) {
      tl.fromTo(cardEls,
        { y: 80, opacity: 0, scale: 0.92, rotation: [ -2, 0 ] },
        { y: 0, opacity: 1, scale: 1, rotation: 0, stagger: { value: [0.15, 0.25], from: "center" }, duration: { value: [1.0, 1.3] }, ease: "power3.out,elastic.out(1,.2)" }
      );
    }

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 85%",
      end: "bottom center",
      onEnter: () => tl.play(),
      onLeaveBackward: () => tl.progress(0).timeScale(1)
    });

    return () => {
      gsap.killTweensOf("*");
      ScrollTrigger.flush();
    };
  }, []);

  return (
    <motion.section id="strengths" className="relative py-32 lg:py-40 bg-[var(--bg-base)]" ref={sectionRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
    >
      <div className="container-content">
        <div ref={headerRef} className="mb-16 lg:mb-20">
          <span className="text-sm font-medium tracking-wide uppercase mb-4 block text-gray-500">05 — {z ? "个人优势" : "Personal Strengths"}</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-[var(--text-main)]">{z ? "个人优势" : "Personal Strengths"}</h2>
          <p className="text-lg md:text-xl font-normal text-gray-500">{z ? "核心技能与专业能力" : "Core skills and professional expertise"}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {skills.map((skill, i) => (
            <div
              key={i}
              ref={(el) => setCardRef(el, i)}
              className="skill-card-inner relative group overflow-hidden rounded-2xl border border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.02] p-8 hover:border-white/[0.15] dark:hover:border-black/[0.15] transition-all duration-500 cursor-default"
            >
              {/* Top highlight line on hover */}
              <div className="absolute left-0 top-0 right-0 h-0.5 bg-white/[0.1] group:bg-white group/[0.3] group transition-all duration-300" style={{ scaleX: 0, transformOrigin: "left" }} />

              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-6 p-4 rounded-full bg-white/[0.04] dark:bg-black/[0.04] group-hover:bg-white/[0.08] dark:group-hover:bg-black/[0.08] transition-colors duration-300">
                  {skill.icon}
                </div>
                <h3 className="text-xl font-bold mb-3" style={{ color: "var(--text-main)" }}>{z ? skill.nameZh : skill.nameEn}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6" style={{ color: "var(--text-sub)" }}>{z ? skill.descZh : skill.descEn}</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {["Figma", "C4D", "Blender", "Rhino", "Keyshot", "Illustrator"].slice(0, Math.min(3, i % 5 + 1)).map((tag, ti) => (
                    <span key={ti} className="px-3 py-1 rounded-full text-xs font-medium bg-white/[0.06] dark:bg-black/[0.06] text-gray-400 border border-white/[0.08] dark:border-black/[0.08] group-hover:bg-white/[0.12] dark:group-hover:bg-black/[0.12] transition-colors duration-300">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
