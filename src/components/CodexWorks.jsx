import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import BounceCards from "./BounceCards";
import ProjectDetail from "./ProjectDetail";
import { codexWorks } from "../data/codexWorks";

const stackTransforms = [
  "rotate(7deg) translate(-176px)",
  "rotate(3deg) translate(-88px)",
  "rotate(-2deg)",
  "rotate(-6deg) translate(88px)",
  "rotate(5deg) translate(176px)",
];

export default function CodexWorks({ lang }) {
  const z = lang === "zh";
  const [selected, setSelected] = useState(null);

  const stackImages = codexWorks.map((w) => w.cover);
  const cardLabels = codexWorks.map((w) => (z ? w.titleZh : w.titleEn));

  return (
    <>
      <motion.section
        id="codex-works"
        className="codex-bounce-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.7 }}
      >
        <h2 className="codex-bounce-section__title">
          {z ? "AI 协作作品" : "AI Collaborative Works"}
        </h2>
        <p className="codex-bounce-section__subtitle">
          {z
            ? "把犹豫变成版本，再把版本变成判断。"
            : "Hesitation into versions. Versions into judgment."}
        </p>
        <BounceCards
          className="codex-bounce-section__cards"
          images={stackImages}
          containerWidth={780}
          containerHeight={460}
          animationDelay={0.15}
          animationStagger={0.12}
          easeType="elastic.out(1, 0.55)"
          transformStyles={stackTransforms}
          enableHover
          cardLabels={cardLabels}
          onCardClick={(index) => setSelected(codexWorks[index])}
        />
        {/* 底部操作提示 */}
        <p className="codex-bounce-section__hint">
          {z ? "点击任意作品查看详情" : "CLICK ANY CARD TO EXPLORE"}
        </p>
      </motion.section>

      <AnimatePresence>
        {selected && (
          <ProjectDetail
            key={selected.id}
            project={selected}
            lang={lang}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
