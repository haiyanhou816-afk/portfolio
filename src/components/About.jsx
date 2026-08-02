import { useRef, useEffect } from "react";
import { motion, useInView, animate } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GraduationCap, Award, Building2, Briefcase } from "lucide-react";
import PixelSnow from "./PixelSnow";
import LogoLoop from "./LogoLoop";
import AvatarSpotlight from "./AvatarSpotlight";
import { asset } from "../utils/asset";
import ExperienceTimeline from "./ExperienceTimeline";

gsap.registerPlugin(ScrollTrigger);

// 数字滚动 counter 子组件
function StatCounter({ value }) {
  // value 形如 "3+" "30+" "15+" "10+"
  const numMatch = value.match(/^(\d+)(.*)/);
  const numPart = numMatch ? parseInt(numMatch[1], 10) : 0;
  const suffix = numMatch ? numMatch[2] : value;

  const spanRef = useRef(null);
  const inViewRef = useRef(null);
  const inView = useInView(inViewRef, { once: true, margin: "-10% 0px" });
  const hasAnimated = useRef(false);

  useEffect(() => {
    if (inView && !hasAnimated.current && spanRef.current) {
      hasAnimated.current = true;
      animate(0, numPart, {
        duration: 1.4,
        ease: [0.22, 1, 0.36, 1],
        onUpdate(v) {
          if (spanRef.current) {
            spanRef.current.textContent = Math.round(v) + suffix;
          }
        },
      });
    }
  }, [inView, numPart, suffix]);

  return (
    <span ref={inViewRef} style={{ display: "inline-block" }}>
      <span ref={spanRef}>0{suffix}</span>
    </span>
  );
}


const stats = [
  { icon: <Briefcase size={20} />, value: "3+", labelKeyZh: "实习经历", labelKeyEn: "Internships" },
  { icon: <Building2 size={20} />, value: "30+", labelKeyZh: "项目经验", labelKeyEn: "Projects" },
  { icon: <GraduationCap size={20} />, value: "15+", labelKeyZh: "专业技能", labelKeyEn: "Skills" },
  { icon: <Award size={20} />, value: "10+", labelKeyZh: "设计工具", labelKeyEn: "Design Tools" },
];

const aboutLogoItems = [
  { src: asset("/logos/about/illustrator.png"), alt: "Illustrator" },
  { src: asset("/logos/about/after-effects.png"), alt: "After Effects" },
  { src: asset("/logos/about/photoshop.png"), alt: "Photoshop" },
  { src: asset("/logos/about/codex.png"), alt: "Codex" },
  { src: asset("/logos/about/blender.png"), alt: "Blender" },
  { src: asset("/logos/about/procreate.png"), alt: "Procreate" },
  { src: asset("/logos/about/tool-06.png"), alt: "Design tool" },
  { src: asset("/logos/about/cinema-4d.png"), alt: "Cinema 4D" },
  { src: asset("/logos/about/rhino.png"), alt: "Rhino" },
];

export default function About({ lang }) {
  const z = lang === "zh";
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const logoStripRef = useRef(null);
  const leftColRef = useRef(null);
  const rightColRef = useRef(null);

  // GSAP ScrollTrigger for sophisticated entrance animation
  useEffect(() => {
    const tl = gsap.timeline();

    // Title entrance — massive scale + blur release (dramatic)
    tl.fromTo(headerRef.current.querySelector("h2"),
      { y: 80, opacity: 0, scale: 0.95, filter: "blur(6px)" },
      { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.4, ease: "power4.out,elastic.out(1,.3),back.out(1.7)" }
    );

    // Subtitle follows
    tl.fromTo(headerRef.current.querySelector("p"),
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.0, ease: "power3.out", delay: "-=0.8" }
    );

    if (logoStripRef.current) {
      tl.fromTo(logoStripRef.current,
        { y: 34, opacity: 0, filter: "blur(8px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.0, ease: "power3.out" },
        "-=0.65"
      );
    }

    // Cards stagger reveal — left and right side by side
    const allCards = [...leftColRef.current.querySelectorAll(".stat-card"), ...rightColRef.current.querySelectorAll(".timeline-item")];
    if (allCards.length > 0) {
      tl.fromTo(allCards,
        { y: 60, opacity: 0, scale: 0.92 },
        { y: 0, opacity: 1, scale: 1, stagger: 0.12, duration: { value: [0.8, 1.1] }, ease: "power3.out,elastic.out(1,.2)" }
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

  const renderStat = (stat, i) => (
    <motion.div key={i} className="stat-card flex flex-col items-center p-6 rounded-xl transition-all duration-300">
      <div className="text-2xl mb-3">{stat.icon}</div>
      <div className="text-lg font-bold mb-0.5" style={{ color: "var(--text-main)" }}>
        <StatCounter value={stat.value} />
      </div>
      <div className="text-xs font-medium uppercase tracking-wide" style={{ color: "var(--text-dim)" }}>{z ? stat.labelKeyZh : stat.labelKeyEn}</div>
    </motion.div>
  );

  return (
    <motion.section id="about" className="relative overflow-hidden py-32 lg:py-40 bg-[var(--bg-base)]" ref={sectionRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
    >
      <div className="about-pixel-snow" aria-hidden="true">
        <PixelSnow
          color="#c6d1dc"
          flakeSize={0.008}
          minFlakeSize={1}
          pixelResolution={380}
          speed={0.30}
          depthFade={10}
          farPlane={18}
          brightness={0.46}
          density={0.06}
          variant="square"
          direction={118}
        />
      </div>
      <div className="container-content relative z-10">
        <div ref={headerRef} className="mb-16">
          <span className="text-sm font-medium tracking-wide uppercase mb-4 block text-gray-500">01 — {z ? "关于我" : "About Me"}</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-[var(--text-main)]">{z ? "关于我" : "About Me"}</h2>
          <p className="text-lg md:text-xl font-normal mb-16 text-gray-500">{z ? "探索我的设计旅程与职业背景" : "Explore my design journey and professional background"}</p>
        </div>

        <div ref={logoStripRef} className="about-logo-loop mb-20">
          <LogoLoop
            logos={aboutLogoItems}
            speed={68}
            direction="left"
            logoHeight={46}
            gap={38}
            hoverSpeed={10}
            fadeOut
            fadeOutColor="var(--bg-base)"
            scaleOnHover
            ariaLabel={z ? "设计工具循环展示" : "Design tools loop"}
          />
        </div>

        {/* Stats row */}
        <div ref={leftColRef} className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-20">
          {stats.map((stat, i) => renderStat(stat, i))}
        </div>

        {/* Left: Avatar | Right: Experience timeline + Education */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          <div ref={leftColRef} className="lg:w-1/3">
            {/* Avatar card */}
            <motion.div className="stat-card rounded-2xl overflow-hidden transition-all duration-300">
              <AvatarSpotlight
                src={asset("/avatar.jpg")}
                alt={z ? "侯海岩的照片" : "Portrait of Hou Haiyan"}
              />
            </motion.div>
          </div>

          {/* Right: Work experience — 时间线，hover 打字机展开职责与成果 */}
          <div ref={rightColRef} className="lg:w-2/3">
            <div className="flex items-baseline justify-between mb-6">
              <h3 className="text-xl font-bold" style={{ color: "var(--text-main)" }}>{z ? "工作经历" : "Experience"}</h3>
              <span className="text-xs" style={{ color: "var(--text-dim)" }}>
                {z ? "悬浮查看职责与成果" : "Hover to reveal details"}
              </span>
            </div>
            <ExperienceTimeline lang={lang} />

            {/* Education */}
            <div className="mt-12 pt-10 border-t" style={{ borderColor: "var(--border-subtle)" }}>
              <h3 className="text-xl font-bold mb-6" style={{ color: "var(--text-main)" }}>{z ? "教育背景" : "Education"}</h3>
              {[
                { schoolZh: "武汉工程大学", schoolEn: "Wuhan Institute of Technology", majorZh: "艺术设计学院产品设计专业", majorEn: "Product Design, School of Art & Design", years: "2023–2027" },
              ].map((edu, i) => (
                <motion.div key={i} className="timeline-item relative pl-1">
                  <div className="font-semibold" style={{ color: "var(--text-main)" }}>{z ? edu.schoolZh : edu.schoolEn}</div>
                  <div className="text-sm mt-1" style={{ color: "var(--text-sub)" }}>{z ? edu.majorZh : edu.majorEn}</div>
                  <div className="text-xs font-medium mt-1" style={{ color: "var(--text-dim)" }}>{edu.years}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
