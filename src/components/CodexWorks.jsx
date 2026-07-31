import { motion } from "framer-motion";
import BounceCards from "./BounceCards";

const stackImages = [
  "/inspiration/zcool_ui_2026_portfolio.png",
  "/inspiration/dribbble_ui_health_data_visualization.png",
  "/images/gallery/work-05.png",
  "/inspiration/dribbble_ui_nutrition_tracker_app.png",
  "/images/gallery/work-03.jpeg",
];

const stackTransforms = [
  "rotate(7deg) translate(-176px)",
  "rotate(3deg) translate(-88px)",
  "rotate(-2deg)",
  "rotate(-6deg) translate(88px)",
  "rotate(5deg) translate(176px)",
];

export default function CodexWorks({ lang }) {
  return (
    <motion.section
      id="codex-works"
      className="codex-bounce-section"
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
    >
      <h2 className="codex-bounce-section__title">
        {lang === "zh" ? "AI 协作作品" : "AI Collaborative Works"}
      </h2>
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
      />
    </motion.section>
  );
}
