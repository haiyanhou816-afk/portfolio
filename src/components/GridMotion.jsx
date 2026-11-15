import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import "./GridMotion.css";

const isImageSource = (value) =>
  typeof value === "string" &&
  (value.startsWith("http") || value.startsWith("/") || /\.(png|jpe?g|webp|gif|avif)$/i.test(value));

/**
 * items 支持两种写法：
 *   - 字符串（图片 URL 或文字），无交互
 *   - { src, label, id } 对象，此时格子获得按钮语义并可激活
 */
export default function GridMotion({ items = [], gradientColor = "black", onItemActivate }) {
  const rowRefs = useRef([]);
  const mouseXRef = useRef(typeof window === "undefined" ? 0 : window.innerWidth / 2);
  const isVisibleRef = useRef(false);
  /* 28 格作品缩略图约 300KB，原来首屏挂载就全部下载，和开屏图 / JS 抢带宽。
     等网格接近视口再挂 backgroundImage；另有 4s 兜底，保证图一定会出现。 */
  const [imagesReady, setImagesReady] = useState(false);

  const totalItems = 28;
  const defaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);
  const combinedItems = items.length > 0 ? items.slice(0, totalItems) : defaultItems;

  useEffect(() => {
    const container = rowRefs.current[0]?.parentElement;
    if (!container) {
      setImagesReady(true);
      return undefined;
    }

    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
      if (entry.isIntersecting) setImagesReady(true);
    }, { threshold: 0, rootMargin: '400px 0px' });

    observer.observe(container);
    // 兜底：个别 WebView 的 IntersectionObserver 不回调时，等首屏彻底稳定再放行，
    // 避免用户停在首屏就被 28 张缩略图占满带宽
    const fallback = window.setTimeout(() => setImagesReady(true), 15000);
    return () => {
      observer.disconnect();
      window.clearTimeout(fallback);
    };
  }, []);

  useEffect(() => {
    gsap.ticker.lagSmoothing(0);
    const baseDuration = 0.8;
    const inertiaFactors = [0.6, 0.4, 0.3, 0.2];
    const setters = rowRefs.current.map((row, index) => (
      row
        ? gsap.quickTo(row, "x", {
          duration: baseDuration + inertiaFactors[index % inertiaFactors.length],
          ease: "power3.out",
        })
        : null
    ));

    const handleMouseMove = (event) => {
      mouseXRef.current = event.clientX;
    };

    const updateMotion = () => {
      if (!isVisibleRef.current) return;
      const maxMoveAmount = 300;

      rowRefs.current.forEach((row, index) => {
        if (!row || !setters[index]) return;

        const direction = index % 2 === 0 ? 1 : -1;
        const moveAmount = ((mouseXRef.current / window.innerWidth) * maxMoveAmount - maxMoveAmount / 2) * direction;
        setters[index](moveAmount);
      });
    };

    gsap.ticker.add(updateMotion);
    window.addEventListener("mousemove", handleMouseMove);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      gsap.ticker.remove(updateMotion);
    };
  }, []);

  return (
    <div className="grid-motion">
      <section
        className="grid-motion__intro"
        style={{ background: `radial-gradient(circle, ${gradientColor} 0%, transparent 72%)` }}
      >
        <div className="grid-motion__container">
          {Array.from({ length: 4 }, (_, rowIndex) => (
            <div
              key={rowIndex}
              className="grid-motion__row"
              ref={(element) => {
                rowRefs.current[rowIndex] = element;
              }}
            >
              {Array.from({ length: 7 }, (_, itemIndex) => {
                const flatIndex = rowIndex * 7 + itemIndex;
                const raw = combinedItems[flatIndex];
                const isRich = raw && typeof raw === "object";
                const content = isRich ? raw.src : raw;
                const interactive = Boolean(isRich && onItemActivate);

                // 交互语义直接挂在格子上：键盘可达，读屏能报出项目名，
                // 且激活时携带自身数据，不需要事后查 DOM 位置。
                const activate = interactive
                  ? (event) => {
                      event.stopPropagation();
                      onItemActivate(raw, flatIndex);
                    }
                  : undefined;

                const interactiveProps = interactive
                  ? {
                      role: "button",
                      tabIndex: 0,
                      "aria-label": raw.label,
                      onClick: activate,
                      onKeyDown: (event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          activate(event);
                        }
                      },
                    }
                  : {};

                return (
                  <div
                    key={itemIndex}
                    className={`grid-motion__item${interactive ? " grid-motion__item--interactive" : ""}`}
                    {...interactiveProps}
                  >
                    <div className="grid-motion__item-inner">
                      {isImageSource(content) ? (
                        <div className="grid-motion__item-image" style={{ backgroundImage: imagesReady ? `url(${content})` : "none" }} />
                      ) : (
                        <div className="grid-motion__item-content">{content}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="grid-motion__shade" aria-hidden="true" />
      </section>
    </div>
  );
}
