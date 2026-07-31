import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import "./BounceCards.css";

export default function BounceCards({
  className = "",
  images = [],
  containerWidth = 400,
  containerHeight = 400,
  animationDelay = 0.5,
  animationStagger = 0.06,
  easeType = "elastic.out(1, 0.8)",
  transformStyles = [
    "rotate(10deg) translate(-170px)",
    "rotate(5deg) translate(-85px)",
    "rotate(-3deg)",
    "rotate(-10deg) translate(85px)",
    "rotate(2deg) translate(170px)",
  ],
  enableHover = true,
}) {
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  const activeIndexRef = useRef(null);
  const pointerXRef = useRef(0);
  const hoverFrameRef = useRef(0);

  useEffect(() => {
    const context = gsap.context(() => {
      gsap.fromTo(
        ".bounce-cards__card",
        { scale: 0, opacity: 0 },
        { scale: 1, opacity: 1, stagger: animationStagger, ease: easeType, delay: animationDelay },
      );
    }, containerRef);
    return () => context.revert();
  }, [animationDelay, animationStagger, easeType]);

  useEffect(() => () => {
    if (hoverFrameRef.current) cancelAnimationFrame(hoverFrameRef.current);
  }, []);

  const getNoRotationTransform = (transformString) => (
    /rotate\([\s\S]*?\)/.test(transformString)
      ? transformString.replace(/rotate\([\s\S]*?\)/, "rotate(0deg)")
      : transformString === "none" ? "rotate(0deg)" : `${transformString} rotate(0deg)`
  );

  const getPushedTransform = (baseTransform, offsetX) => {
    const match = baseTransform.match(/translate\(([-0-9.]+)px\)/);
    if (match) return baseTransform.replace(/translate\(([-0-9.]+)px\)/, `translate(${parseFloat(match[1]) + offsetX}px)`);
    return baseTransform === "none" ? `translate(${offsetX}px)` : `${baseTransform} translate(${offsetX}px)`;
  };

  const pushSiblings = (hoveredIndex) => {
    if (!enableHover || !containerRef.current) return;
    images.forEach((_, index) => {
      const target = cardRefs.current[index];
      if (!target) return;
      gsap.killTweensOf(target);
      const baseTransform = transformStyles[index] || "none";
      const isHovered = index === hoveredIndex;
      gsap.to(target, {
        transform: isHovered
          ? getNoRotationTransform(baseTransform)
          : getPushedTransform(baseTransform, index < hoveredIndex ? -160 : 160),
        duration: 0.4,
        ease: "back.out(1.4)",
        delay: isHovered ? 0 : Math.abs(hoveredIndex - index) * 0.05,
        overwrite: "auto",
      });
    });
  };

  const resetSiblings = () => {
    if (!enableHover || !containerRef.current) return;
    images.forEach((_, index) => {
      const target = cardRefs.current[index];
      if (!target) return;
      gsap.killTweensOf(target);
      gsap.to(target, {
        transform: transformStyles[index] || "none",
        duration: 0.4,
        ease: "back.out(1.4)",
        overwrite: "auto",
      });
    });
  };

  const handlePointerMove = (event) => {
    if (!enableHover || !containerRef.current) return;
    pointerXRef.current = event.clientX;
    if (hoverFrameRef.current) return;

    hoverFrameRef.current = requestAnimationFrame(() => {
      hoverFrameRef.current = 0;
      const bounds = containerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const ratio = Math.min(0.999, Math.max(0, (pointerXRef.current - bounds.left) / bounds.width));
      const nextIndex = Math.floor(ratio * images.length);
      if (nextIndex === activeIndexRef.current) return;
      activeIndexRef.current = nextIndex;
      pushSiblings(nextIndex);
    });
  };

  const handlePointerLeave = () => {
    if (hoverFrameRef.current) cancelAnimationFrame(hoverFrameRef.current);
    hoverFrameRef.current = 0;
    if (activeIndexRef.current == null) return;
    activeIndexRef.current = null;
    resetSiblings();
  };

  return (
    <div
      className={`bounce-cards ${className}`}
      ref={containerRef}
      style={{ width: containerWidth, height: containerHeight }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {images.map((source, index) => (
        <div
          key={`${source}-${index}`}
          className={`bounce-cards__card bounce-cards__card-${index}`}
          style={{ transform: transformStyles[index] ?? "none" }}
          ref={(element) => {
            cardRefs.current[index] = element;
          }}
        >
          <img className="bounce-cards__image" src={source} alt="" />
        </div>
      ))}
    </div>
  );
}
