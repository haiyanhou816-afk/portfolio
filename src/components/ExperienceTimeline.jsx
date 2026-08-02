import { useEffect, useState } from "react";

/**
 * ExperienceTimeline — 工作经历时间线
 *
 * 交互目的（对照 DESIGN_DNA「动效必须有目的」）：
 *   默认只给公司 + 职位 + 一句话，让人 3 秒扫完三段经历；
 *   真正想细看某一段时，把职责与成果逐字打出来 ——
 *   打字机不是装饰，它把"正在读这一段"这件事变成可见的状态，
 *   同时天然控制了信息释放的顺序（先职责，再成果）。
 *
 * 布局不做位移：详情区的高度由一份透明的原文撑开（ghost），
 * 打字层绝对定位盖在上面。这样悬浮时下方经历不会被顶动。
 */

const EXPERIENCES = [
  {
    period: "2024",
    companyZh: "微派网络",
    companyEn: "Weipai Network",
    roleZh: "UI / 视觉设计实习生",
    roleEn: "UI / Visual Design Intern",
    lineZh: "《贪吃蛇大作战》的游戏界面与运营视觉。",
    lineEn: "Game UI and campaign visuals for “Snake Battle”.",
    dutyZh:
      "负责游戏内界面、活动运营图、图标与击杀掉落物设计，跟进设计稿到多渠道发布的尺寸适配。",
    dutyEn:
      "Designed in-game UI, campaign artwork, icons and kill-drop pickups; handled multi-channel size adaptation from mockup to release.",
    resultZh:
      "掉落物在小尺寸下仍能一眼分辨稀有度，界面与运营资产也整理成了可复用的模板与图标规范。",
    resultEn:
      "Drops stayed legible at icon size, and UI assets became reusable templates and an icon spec.",
  },
  {
    period: "2024",
    companyZh: "盛天网络",
    companyEn: "Shengtian Network",
    roleZh: "广告创意 / 品牌视觉",
    roleEn: "Ad Creative / Brand Visual",
    lineZh: "让广告画面在信息流里被看见。",
    lineEn: "Making ad creative stand out in the feed.",
    dutyZh: "承接广告创意与营销视觉，从概念草图做到成稿，配合投放节奏产出多版本素材。",
    dutyEn:
      "Took ad creative and marketing visuals from concept sketch to final artwork, producing variants to match campaign pacing.",
    resultZh: "沉淀出一套可延展的画面结构，同一主题能快速铺出多个版本供投放挑选。",
    resultEn:
      "Built an extendable visual structure so one theme could fan out into variants for media buying.",
  },
  {
    period: "2023",
    companyZh: "迅鹰科技",
    companyEn: "Xunying Technology",
    roleZh: "品牌视觉设计师",
    roleEn: "Brand Visual Designer",
    lineZh: "从 Banner 到 H5，把品牌铺到每个触点。",
    lineEn: "Carrying one brand voice from banners to H5 pages.",
    dutyZh: "负责品牌视觉延展，产出 Banner、H5 页面、活动海报与直播贴片。",
    dutyEn:
      "Extended the brand system into banners, H5 pages, event posters and livestream overlays.",
    resultZh: "统一了各触点的版式与字体层级，品牌在不同尺寸下保持同一种语气。",
    resultEn:
      "Unified layout and type hierarchy across touchpoints so the brand reads the same at every size.",
  },
];

const CHAR_MS = 14;

/**
 * 逐字显示一段文字。
 * ghost 层是原文本身（opacity 0），负责撑开高度并留给读屏软件；
 * typed 层绝对定位，只做视觉。离开时不做反向删字 —— 收起要比展开果断。
 */
function TypedLine({ text, active, delay = 0 }) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!active) {
      setCount(0);
      setStarted(false);
      return undefined;
    }

    const reduce =
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduce) {
      setStarted(true);
      setCount(text.length);
      return undefined;
    }

    // 成果那一段要等职责打完，靠 delay 排队，而不是把两段耦合成一个状态机
    if (!started) {
      const openTimer = window.setTimeout(() => setStarted(true), delay);
      return () => window.clearTimeout(openTimer);
    }

    if (count >= text.length) return undefined;

    const stepTimer = window.setTimeout(() => {
      setCount((current) => Math.min(current + 1, text.length));
    }, CHAR_MS);
    return () => window.clearTimeout(stepTimer);
  }, [active, started, count, text, delay]);

  const typing = started && count < text.length;

  return (
    <span className="exp-row__text">
      <span className="exp-row__ghost">{text}</span>
      <span className="exp-row__typed" aria-hidden="true">
        {text.slice(0, count)}
        {typing ? <i className="exp-row__caret" /> : null}
      </span>
    </span>
  );
}

export default function ExperienceTimeline({ lang }) {
  const z = lang === "zh";
  const [activeIndex, setActiveIndex] = useState(-1);

  return (
    <ol className="exp-timeline">
      {EXPERIENCES.map((exp, i) => {
        const isActive = activeIndex === i;
        const duty = z ? exp.dutyZh : exp.dutyEn;
        const result = z ? exp.resultZh : exp.resultEn;

        return (
          <li
            key={exp.companyEn}
            className="timeline-item exp-row"
            data-active={isActive ? "true" : "false"}
            tabIndex={0}
            onMouseEnter={() => setActiveIndex(i)}
            onMouseLeave={() => setActiveIndex((current) => (current === i ? -1 : current))}
            onFocus={() => setActiveIndex(i)}
            onBlur={() => setActiveIndex((current) => (current === i ? -1 : current))}
          >
            <div className="exp-row__rail">
              <span className="exp-row__node" aria-hidden="true" />
              <span className="exp-row__year">{exp.period}</span>
            </div>

            <div className="exp-row__main">
              <h4 className="exp-row__head">
                <span className="exp-row__company">{z ? exp.companyZh : exp.companyEn}</span>
                <span className="exp-row__sep" aria-hidden="true">—</span>
                <span className="exp-row__role">{z ? exp.roleZh : exp.roleEn}</span>
              </h4>
              <p className="exp-row__line">{z ? exp.lineZh : exp.lineEn}</p>
            </div>

            <div className="exp-row__detail">
              <div className="exp-row__block">
                <span className="exp-row__label">{z ? "职责" : "Responsibility"}</span>
                <TypedLine key={`duty-${lang}`} text={duty} active={isActive} />
              </div>
              <div className="exp-row__block">
                <span className="exp-row__label">{z ? "成果" : "Outcome"}</span>
                <TypedLine
                  key={`result-${lang}`}
                  text={result}
                  active={isActive}
                  delay={duty.length * CHAR_MS + 180}
                />
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
