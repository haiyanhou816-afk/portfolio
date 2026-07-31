import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./GridMotion.css";

const isImageSource = (value) =>
  typeof value === "string" &&
  (value.startsWith("http") || value.startsWith("/") || /\.(png|jpe?g|webp|gif|avif)$/i.test(value));

export default function GridMotion({ items = [], gradientColor = "black" }) {
  const rowRefs = useRef([]);
  const mouseXRef = useRef(typeof window === "undefined" ? 0 : window.innerWidth / 2);
  const isVisibleRef = useRef(false);

  const totalItems = 28;
  const defaultItems = Array.from({ length: totalItems }, (_, index) => `Item ${index + 1}`);
  const combinedItems = items.length > 0 ? items.slice(0, totalItems) : defaultItems;

  useEffect(() => {
    const container = rowRefs.current[0]?.parentElement;
    if (!container) return undefined;

    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
    }, { threshold: 0 });

    observer.observe(container);
    return () => observer.disconnect();
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
                const content = combinedItems[rowIndex * 7 + itemIndex];
                return (
                  <div key={itemIndex} className="grid-motion__item">
                    <div className="grid-motion__item-inner">
                      {isImageSource(content) ? (
                        <div className="grid-motion__item-image" style={{ backgroundImage: `url(${content})` }} />
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
