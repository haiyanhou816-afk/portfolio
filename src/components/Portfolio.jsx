export default function Portfolio({ lang }) {
  const z = lang === 'zh';

  return (
    <section id="portfolio" className="relative bg-[var(--bg-base)]">
      {/* Header */}
      <div className="container-content relative z-10 py-24 lg:py-32">
        <span className="text-sm font-medium tracking-wide uppercase mb-4 block text-[var(--text-dim)]">
          03 — {z ? '全作品浏览' : 'Portfolio'}
        </span>
        <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-[var(--text-main)]">
          {z ? '全作品浏览' : 'Complete Portfolio'}
        </h2>
        <p className="text-lg md:text-xl font-normal text-[var(--text-dim)] mb-6">
          {z
            ? '拖拽旋转球体，悬停卡片预览色彩'
            : 'Drag to rotate the sphere, hover to reveal colors'}
        </p>
      </div>
    </section>
  );
}
