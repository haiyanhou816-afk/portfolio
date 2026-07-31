import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Palette, Music, Gamepad2, Volleyball, Target, Activity } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

const hobbies = [
  { icon: <Palette size={28} />, zh: "摄影", en: "Photography", descZh: "风景 / 建筑", descEn: "Landscape · Architecture" },
  { icon: <Music size={28} />, zh: "音乐", en: "Music", descZh: "潮流音乐 / 民谣", descEn: "Hip-Hop · Folk" },
  { icon: <Gamepad2 size={28} />, zh: "游戏", en: "Gaming", descZh: "FPS / 赛车", descEn: "FPS · Racing" },
  { icon: <Volleyball size={28} />, zh: "篮球", en: "Basketball", descZh: "运动 / 团队竞技", descEn: "Sports · Team Competition" },
  { icon: <Target size={28} />, zh: "乒乓球", en: "Table Tennis", descZh: "球类运动 / 技巧对抗", descEn: "Racquet Sports · Agility" },
  { icon: <Activity size={28} />, zh: "健身运动", en: "Fitness", descZh: "跑步 / 力量训练", descEn: "Running · Strength Training" },
];

export default function Hobbies({ lang }) {
  const z = lang === "zh";
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef({ list: [] });
  const setCardRef = (el, i) => { if (el) cardsRef.current.list[i] = el; };

  // Sophisticated scroll-triggered entrance with parallax feel
  useEffect(() => {
    const tl = gsap.timeline();

    // Title entrance — dramatic scale + blur (very slow and luxurious)
    tl.fromTo(headerRef.current.querySelector("h2"),
      { y: 70, opacity: 0, scale: 0.94, filter: "blur(10px)" },
      { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.8, ease: "power5.out,elastic.out(1,.2),back.out(1.9)" }
    );

    // Subtitle fades in with a gentle float
    tl.fromTo(headerRef.current.querySelector("p"),
      { y: 35, opacity: 0, scale: 0.98 },
      { y: 0, opacity: 1, scale: 1, duration: 1.2, ease: "power3.out", delay: "-=1.5" }
    );

    // Cards stagger reveal — each item slides up with a light pull
    const cardEls = cardsRef.current.list.filter(Boolean);
    if (cardEls.length > 0) {
      tl.fromTo(cardEls,
        { y: 50, opacity: 0, scale: 0.93, rotation: [ -1, 0 ] },
        { y: 0, opacity: 1, scale: 1, rotation: 0, stagger: { value: [0.12, 0.18], from: "center" }, duration: { value: [0.8, 1.1] }, ease: "power3.out,elastic.out(1,.25)" }
      );
    }

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 80%",
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
    <motion.section id="hobbies" className="relative py-32 lg:py-40 bg-[var(--bg-base)]" ref={sectionRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
    >
      <div className="container-content">
        <div ref={headerRef} className="mb-16">
          <span className="text-sm font-medium tracking-wide uppercase mb-4 block text-gray-500">05 — {z ? "兴趣爱好" : "Hobbies & Interests"}</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white" style={{ color: "var(--text-main)" }}>{z ? "兴趣爱好" : "Hobbies & Interests"}</h2>
          <p className="text-lg md:text-xl font-normal text-gray-500" style={{ color: "var(--text-sub)" }}>{z ? "生活与创作之间，找到节奏" : "Between life and creation, finding rhythm"}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {hobbies.map((item, i) => (
            <motion.div
              key={i}
              ref={(el) => setCardRef(el, i)}
              className="group flex flex-col items-center justify-center p-6 rounded-2xl border border-white/[0.05] hover:border-white/[0.15] bg-black/[0.02] dark:bg-white/[0.01] hover:bg-black/[0.04] dark:hover:bg-white/[0.02] transition-all duration-300 cursor-default"
            >
              <div className="text-gray-400 group:text-white transition-colors mb-4">
                {item.icon}
              </div>
              <span className="text-sm font-semibold mb-1" style={{ color: "var(--text-main)" }}>{z ? item.zh : item.en}</span>
              <span className="text-xs text-gray-500 group:text-gray-400 transition-colors" style={{ color: "var(--text-sub)" }}>{z ? item.descZh : item.descEn}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
