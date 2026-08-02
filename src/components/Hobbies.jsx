import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import {
  PhotographyIcon,
  MusicIcon,
  GamingIcon,
  BasketballIcon,
  TableTennisIcon,
  FitnessIcon,
} from "./HobbyIcons";

gsap.registerPlugin(ScrollTrigger);

const hobbies = [
  {
    Icon: PhotographyIcon,
    zh: "摄影", en: "Photography",
    introZh: "把看见的光留下来", introEn: "Keeping the light I happen to see",
    groups: [
      { labelZh: "常拍", labelEn: "Subjects", itemsZh: ["随手记录", "城市街景", "风景", "光影"], itemsEn: ["Everyday notes", "City streets", "Landscape", "Light & shadow"] },
    ],
  },
  {
    Icon: MusicIcon,
    zh: "音乐", en: "Music",
    introZh: "工作时的背景，也是节奏来源", introEn: "Background for work, and a source of rhythm",
    groups: [
      { labelZh: "最近在听", labelEn: "On repeat", itemsZh: ["《消愁》毛不易", "《晴天》周杰伦"], itemsEn: ["Xiao Chou — Mao Buyi", "Sunny Day — Jay Chou"] },
      { labelZh: "常听风格", labelEn: "Genres", itemsZh: ["说唱", "民谣", "R&B"], itemsEn: ["Hip-hop", "Folk", "R&B"] },
    ],
  },
  {
    Icon: GamingIcon,
    zh: "游戏", en: "Gaming",
    introZh: "在瞄准和过弯之间松一口气", introEn: "Unwinding between crosshairs and corners",
    groups: [
      { labelZh: "在玩", labelEn: "Playing", itemsZh: ["CS2", "极限竞速"], itemsEn: ["CS2", "Forza Horizon"] },
      { labelZh: "时长", labelEn: "Time", itemsZh: ["每周 3-4 小时"], itemsEn: ["3-4 hrs / week"] },
    ],
  },
  {
    Icon: BasketballIcon,
    zh: "篮球", en: "Basketball",
    introZh: "看一个人怎么在一米内解决防守", introEn: "Watching one player solve defense in a single step",
    groups: [
      { labelZh: "喜欢的球星", labelEn: "Favorite player", itemsZh: ["凯里·欧文"], itemsEn: ["Kyrie Irving"] },
      { labelZh: "喜欢的原因", labelEn: "Why", itemsZh: ["把控球做成了一门手艺", "在最挤的地方还能找到出手角度"], itemsEn: ["Turned ball-handling into craft", "Finds an angle where there is none"] },
    ],
  },
  {
    Icon: TableTennisIcon,
    zh: "乒乓球", en: "Table Tennis",
    introZh: "在一米内解决问题", introEn: "Solving problems within one meter",
    groups: [
      { labelZh: "正手", labelEn: "Forehand", itemsZh: ["拉冲为主"], itemsEn: ["Loop drive"] },
      { labelZh: "反手", labelEn: "Backhand", itemsZh: ["拧拉、快撕"], itemsEn: ["Flick, quick counter"] },
      { labelZh: "练习目标", labelEn: "Working on", itemsZh: ["落点更稳，相持更久"], itemsEn: ["Steadier placement, longer rallies"] },
    ],
  },
  {
    Icon: FitnessIcon,
    zh: "健身", en: "Fitness",
    introZh: "把状态维持在可用的水平", introEn: "Keeping myself in working condition",
    groups: [
      { labelZh: "主练", labelEn: "Focus", itemsZh: ["胸", "肩", "背"], itemsEn: ["Chest", "Shoulders", "Back"] },
      { labelZh: "常做动作", labelEn: "Movements", itemsZh: ["卧推", "推肩", "引体向上", "划船"], itemsEn: ["Bench press", "Overhead press", "Pull-up", "Row"] },
    ],
  },
];

export default function Hobbies({ lang }) {
  const z = lang === "zh";
  // 只记一个 index：同一时刻只有一张卡展开，避免多张同时下拉造成版面噪声
  const [activeIndex, setActiveIndex] = useState(-1);
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
          <span className="text-sm font-medium tracking-wide uppercase mb-4 block text-gray-500">03 — {z ? "兴趣爱好" : "Hobbies & Interests"}</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white" style={{ color: "var(--text-main)" }}>{z ? "兴趣爱好" : "Hobbies & Interests"}</h2>
          <p className="text-lg md:text-xl font-normal text-gray-500" style={{ color: "var(--text-sub)" }}>{z ? "生活与创作之间，找到节奏" : "Between life and creation, finding rhythm"}</p>
        </div>

        <div className="hobby-grid">
          {hobbies.map((item, i) => {
            const isActive = activeIndex === i;
            // 逐条淡入的序号跨 group 连续累加，节奏才是一条线而不是每组重来
            let stepIndex = -1;

            return (
              <motion.article
                key={item.en}
                ref={(el) => setCardRef(el, i)}
                className="hobby-card"
                data-active={isActive ? "true" : "false"}
                tabIndex={0}
                onMouseEnter={() => setActiveIndex(i)}
                onMouseLeave={() => setActiveIndex((cur) => (cur === i ? -1 : cur))}
                onFocus={() => setActiveIndex(i)}
                onBlur={() => setActiveIndex((cur) => (cur === i ? -1 : cur))}
              >
                <span className="hobby-card__icon">
                  <item.Icon active={isActive} />
                </span>

                <h3 className="hobby-card__title">{z ? item.zh : item.en}</h3>
                <p className="hobby-card__intro">{z ? item.introZh : item.introEn}</p>

                {/* 标题下方的细线：从左侧生长出来，作为「内容要出来了」的起手式 */}
                <span className="hobby-card__rule" aria-hidden="true" />

                <div className="hobby-card__detail">
                  {item.groups.map((group) => (
                    <div className="hobby-card__group" key={group.labelEn}>
                      <span className="hobby-card__label">{z ? group.labelZh : group.labelEn}</span>
                      <ul className="hobby-card__list">
                        {(z ? group.itemsZh : group.itemsEn).map((entry) => {
                          stepIndex += 1;
                          return (
                            <li
                              key={entry}
                              className="hobby-card__item"
                              style={{ "--step": stepIndex }}
                            >
                              {entry}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
