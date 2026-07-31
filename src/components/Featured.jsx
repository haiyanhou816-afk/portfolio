import GridMotion from "./GridMotion";

const imagePool = [
  "/images/gallery/work-01.jpeg",
  "/images/gallery/work-05.png",
  "/images/gallery/work-03.jpeg",
  "/images/gallery/work-07.jpeg",
  "/images/gallery/work-02.jpeg",
  "/images/gallery/work-06.jpeg",
  "/images/gallery/work-04.jpeg",
];

export default function Featured({ lang }) {
  const z = lang === "zh";
  const items = Array.from({ length: 28 }, (_, index) => imagePool[index % imagePool.length]);

  return (
    <section id="projects" className="featured-grid-section">
      <GridMotion items={items} gradientColor="rgba(246, 74, 53, .24)" />

      <div className="featured-grid-section__copy">
        <span>02 / {z ? "精选项目" : "SELECTED WORK"}</span>
        <h2>{z ? "精选项目" : "Selected work"}</h2>
        <p>
          {z
            ? "鼠标移动探索每一层作品；后续可直接替换为你上传的项目图片。"
            : "Move to explore the archive. Your uploaded project images can replace these anytime."}
        </p>
      </div>

      <div className="featured-grid-section__status" aria-hidden="true">
        <span>HOU HAIYAN / ARCHIVE</span>
        <span>MOVE TO EXPLORE</span>
      </div>
    </section>
  );
}
