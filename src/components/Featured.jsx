import { useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import GridMotion from "./GridMotion";
import ProjectDetail from "./ProjectDetail";
import { featuredGridSlots, thumbFor } from "../data/projects";

/*
 * 28 张作品刚好铺满 28 格，一张图占一格，不重复。
 * 每格直接携带自己对应的项目，避免点击时再靠 DOM 顺序反查 ——
 * 那种做法依赖全局 querySelectorAll 的返回顺序，很容易错位。
 * 网格只加载缩略图；全尺寸图留给点开后的详情页。
 */
function buildGridItems(z) {
  return featuredGridSlots.map(({ project, src }, i) => ({
    id: `${project.id}-${i}`,
    src: thumbFor(src),
    label: `${z ? "查看项目" : "View project"}: ${z ? project.titleZh : project.titleEn}`,
    project,
  }));
}

export default function Featured({ lang }) {
  const z = lang === "zh";
  const [selected, setSelected] = useState(null);
  const gridItems = useMemo(() => buildGridItems(z), [z]);

  const handleItemActivate = (item) => {
    setSelected(item.project);
  };

  return (
    <>
      <section id="projects" className="featured-grid-section">
        <GridMotion
          items={gridItems}
          gradientColor="rgba(246, 74, 53, .24)"
          onItemActivate={handleItemActivate}
        />

        <div className="featured-grid-section__copy">
          <span>02 / {z ? "精选项目" : "SELECTED WORK"}</span>
          <h2 className="featured-grid-section__title">
            {z ? (
              <>
                <span className="featured-grid-section__title-line">精选</span>
                <span className="featured-grid-section__title-line">项目</span>
              </>
            ) : (
              <>
                <span className="featured-grid-section__title-line">Selected</span>
                <span className="featured-grid-section__title-line">work</span>
              </>
            )}
          </h2>
          <p>
            {z
              ? "鼠标移动探索每一层作品，点击任意图片查看项目详情。"
              : "Move to explore the archive. Click any image to view project details."}
          </p>
        </div>

        {/* 悬浮提示 */}
        <div
          className="featured-grid-section__status"
          aria-hidden="true"
          style={{ pointerEvents: "none" }}
        >
          <span>HOU HAIYAN / ARCHIVE</span>
          <span>{z ? "点击查看详情" : "CLICK TO EXPLORE"}</span>
        </div>
      </section>

      {/* 项目详情覆盖层 */}
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
