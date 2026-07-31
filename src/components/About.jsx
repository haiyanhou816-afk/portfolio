import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { GraduationCap, Award, Building2, Briefcase } from "lucide-react";
import PixelSnow from "./PixelSnow";
import LogoLoop from "./LogoLoop";

gsap.registerPlugin(ScrollTrigger);

const stats = [
  { icon: <Briefcase size={20} />, value: "3+", labelKeyZh: "实习经历", labelKeyEn: "Internships" },
  { icon: <Building2 size={20} />, value: "30+", labelKeyZh: "项目经验", labelKeyEn: "Projects" },
  { icon: <GraduationCap size={20} />, value: "15+", labelKeyZh: "专业技能", labelKeyEn: "Skills" },
  { icon: <Award size={20} />, value: "10+", labelKeyZh: "设计工具", labelKeyEn: "Awards" },
];

const experiences = [
  {
    companyZh: "武汉微派网络科技有限公司", companyEn: "Wuhan Weipai Network Technology",
    roleZh: "UI / 视觉设计实习生", roleEn: "UI / Visual Design Intern",
    period: "2024",
    descZh: "参与《贪吃蛇大作战》项目，负责游戏UI、运营设计、多渠道适配。",
    descEn: "Contributed to 'Snake Battle' project, responsible for game UI, operational design, and multi-platform adaptation."
  },
  {
    companyZh: "武汉盛天网络技术股份有限公司", companyEn: "Wuhan Shengtian Network Technology",
    roleZh: "广告创意 / 品牌视觉", roleEn: "Ad Creative / Brand Visual",
    period: "2024",
    descZh: "广告创意设计、营销视觉设计、品牌宣传设计。",
    descEn: "Advertising creative design, marketing visual design, and brand promotion design."
  },
  {
    companyZh: "杭州迅鹰科技有限公司", companyEn: "Hangzhou Xunying Technology",
    roleZh: "品牌视觉设计师", roleEn: "Brand Visual Designer",
    period: "2023",
    descZh: "品牌视觉设计、Banner/H5页面、活动海报、直播贴片设计。",
    descEn: "Brand visual design, Banner/H5 pages, event posters, and live streaming overlay design."
  },
];

const aboutLogoItems = [
  { src: "/logos/about/illustrator.png", alt: "Illustrator" },
  { src: "/logos/about/after-effects.png", alt: "After Effects" },
  { src: "/logos/about/photoshop.png", alt: "Photoshop" },
  { src: "/logos/about/codex.png", alt: "Codex" },
  { src: "/logos/about/blender.png", alt: "Blender" },
  { src: "/logos/about/procreate.png", alt: "Procreate" },
  { src: "/logos/about/tool-06.png", alt: "Design tool" },
  { src: "/logos/about/cinema-4d.png", alt: "Cinema 4D" },
  { src: "/logos/about/rhino.png", alt: "Rhino" },
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
      <div className="text-lg font-bold mb-0.5" style={{ color: "var(--text-main)" }}>{stat.value}</div>
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
          speed={0.58}
          depthFade={10}
          farPlane={18}
          brightness={0.46}
          density={0.18}
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

        {/* Left: Avatar + Timeline | Right: Experience cards */}
        <div className="flex flex-col lg:flex-row gap-12 lg:gap-24">
          <div ref={leftColRef} className="lg:w-1/3 space-y-8">
            {/* Avatar card */}
            <motion.div className="stat-card rounded-2xl overflow-hidden transition-all duration-300">
              <div className="aspect-square bg-gradient-to-br from-gray-800 to-black dark:from-gray-100 dark:to-gray-200 flex items-center justify-center">
                <div className="w-full h-full bg-cover bg-center rounded-2xl" style={{ backgroundImage: `url(/avatar.jpg)` }} />
              </div>
            </motion.div>

            {/* Education & Honors */}
            <div className="space-y-6">
              <h3 className="text-xl font-bold mb-4" style={{ color: "var(--text-main)" }}>{z ? "教育背景" : "Education"}</h3>
              {[
                { schoolZh: "武汉工程大学", schoolEn: "Wuhan Institute of Technology", majorZh: "艺术设计学院产品设计专业", majorEn: "Product Design, School of Art & Design", years: "2023-2027" },
              ].map((edu, i) => (
                <motion.div key={i} className="timeline-item relative">
                  <div className="font-semibold" style={{ color: "var(--text-main)" }}>{z ? edu.schoolZh : edu.schoolEn}</div>
                  <div className="text-sm text-gray-400 mt-1">{z ? edu.majorZh : edu.majorEn}</div>
                  <div className="text-xs font-medium text-gray-400 mt-1">{edu.years}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Right: Work experience */}
          <div ref={rightColRef} className="lg:w-2/3 space-y-8">
            {experiences.map((exp, i) => (
              <motion.div key={i} className="experience-card rounded-xl p-6 transition-all duration-300">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="font-bold" style={{ color: "var(--text-main)" }}>{z ? exp.companyZh : exp.companyEn}</div>
                    <div className="text-sm text-gray-400 mt-1">{z ? exp.roleZh : exp.roleEn}</div>
                  </div>
                  <span className="text-xs font-medium text-gray-500">{exp.period}</span>
                </div>
                <p className="text-sm text-gray-400 leading-relaxed">{z ? exp.descZh : exp.descEn}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
