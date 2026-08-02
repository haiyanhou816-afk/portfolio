import { useEffect, useMemo, useRef } from "react";
import { gsap } from "gsap";
import "./BounceCards.css";

/**
 * 把 "rotate(7deg) translate(-176px)" 这样的 transform 字符串解析成数值。
 *
 * 为什么必须解析：GSAP 如果直接补间 transform 字符串，每帧都要重新解析文本、
 * 再合成矩阵，走的是 CPU 布局路径，合成器无法接管 —— 这就是卡顿的来源。
 * 拆成 rotation / x 两个独立数值后，GSAP 写入的是它自己的变换缓存，
 * 浏览器只做一次矩阵合成，可以稳定跑在合成线程上。
 */
function parseTransform(input) {
  if (!input || input === "none") return { rotation: 0, x: 0 };
  const rotate = input.match(/rotate\((-?[\d.]+)deg\)/);
  const translate = input.match(/translate\((-?[\d.]+)px\)/);
  return {
    rotation: rotate ? parseFloat(rotate[1]) : 0,
    x: translate ? parseFloat(translate[1]) : 0,
  };
}

/**
 * 聚焦权重：高斯钟形，离指针越近越接近 1。
 * 用连续函数而不是"是否等于当前索引"的布尔判断，
 * 卡片才能在指针跨越边界时渐变过渡，而不是整排同时跳一次。
 */
function focusWeight(distance, sigma = 0.62) {
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

/**
 * 由指针位置反查连续的卡片坐标。
 *
 * 不能简单用 ratio * (count - 1)：卡片在容器里不是均匀铺满的，
 * 而是挤在中间一段（如 -176px ~ +176px，容器却有 780px 宽）。
 * 线性映射会让指针指着第 1 张、算出来却是 1.10，边缘偏差超过一整张卡。
 * 改成在真实 baseX 序列上做线性插值，卡片中心处偏差为 0。
 */
function focusFromOffset(offset, poses) {
  const count = poses.length;
  if (count === 0) return null;
  if (count === 1) return 0;

  const first = poses[0].x;
  const last = poses[count - 1].x;

  if (offset <= first) {
    const span = poses[1].x - first || 1;
    return (offset - first) / span;
  }
  for (let index = 0; index < count - 1; index += 1) {
    const current = poses[index].x;
    const next = poses[index + 1].x;
    if (offset <= next) {
      const span = next - current || 1;
      return index + (offset - current) / span;
    }
  }
  const span = last - poses[count - 2].x || 1;
  return count - 1 + (offset - last) / span;
}

/**
 * 推开权重：tanh 饱和的奇函数。
 * d=0 处为 0（被聚焦的卡片自己不位移），左右两侧分别趋近 -1 / +1。
 *
 * 这里刻意不用高斯的一阶导。那个形状在远端会衰减回 0，
 * 结果是聚焦第一张卡时，右边几张的推力一个比一个小，
 * 卡片间距被压到 14~21px 挤成一叠（卡片本身宽 205px）。
 * tanh 饱和后远端稳定保持约 88px 的原始间距，只有聚焦点附近张开。
 */
function pushWeight(distance, steepness = 1.6) {
  return Math.tanh(distance * steepness);
}

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
  onCardClick,
  cardLabels = [],
  /** 兄弟卡片被推开的距离（px） */
  pushDistance = 160,
}) {
  const imageCount = images.length;
  const containerRef = useRef(null);
  const cardRefs = useRef([]);
  // 每张卡片一组 quickTo 设值函数，全程复用同一条 tween
  const settersRef = useRef([]);
  const readyRef = useRef(false);
  const zOrderRef = useRef([]);

  // 静止姿态只在 transformStyles 变化时解析一次，hover 时不再做字符串处理
  const basePoses = useMemo(
    () => transformStyles.map(parseTransform),
    [transformStyles],
  );
  const basePosesRef = useRef(basePoses);
  basePosesRef.current = basePoses;

  /*
   * 入场：先用 gsap.set 把每张卡片的静止姿态写进 GSAP 的变换缓存。
   * 少了这一步，GSAP 读到的初始 transform 来自 inline style 字符串，
   * 之后第一次 hover 会从"解析出来的值"跳到"数值属性"，出现一次突跳。
   */
  useEffect(() => {
    readyRef.current = false;
    const context = gsap.context(() => {
      const cards = cardRefs.current.filter(Boolean);
      cards.forEach((card, index) => {
        const pose = basePosesRef.current[index] ?? { rotation: 0, x: 0 };
        gsap.set(card, {
          rotation: pose.rotation,
          x: pose.x,
          y: 0,
          scale: 0,
          opacity: 0,
        });
      });
      gsap.to(cards, {
        scale: 1,
        opacity: 1,
        stagger: animationStagger,
        ease: easeType,
        delay: animationDelay,
        force3D: true,
        // 入场结束才允许 hover 接管，否则两套动画抢同一批属性
        onComplete: () => {
          readyRef.current = true;
        },
      });
    }, containerRef);
    return () => {
      readyRef.current = false;
      context.revert();
    };
  }, [animationDelay, animationStagger, easeType]);

  /*
   * 关键改动：用 gsap.quickTo 取代"每次 hover 就 kill 旧 timeline 再建新的"。
   *
   * 旧做法有三处硬伤，叠起来就是不丝滑：
   *   1. kill 会把飞行中的 tween 掐死在任意中间值，新 timeline 从那个位置重新起步，
   *      速度不连续，手感上是一顿一顿的。
   *   2. 每次重建都带 stagger 延迟，指针快速划过几张卡时，
   *      每跨一次边界就多一段空转，越划越迟钝。
   *   3. 目标值是离散的（floor 出索引），跨边界瞬间整排卡片同时换目标。
   *
   * quickTo 全程只维护一条 tween，每帧只改目标值，速度天然连续、可被随时打断。
   */
  useEffect(() => {
    const cards = cardRefs.current;
    const easing = "power3.out";
    settersRef.current = Array.from({ length: imageCount }, (_, index) => {
      const card = cards[index];
      if (!card) return null;
      return {
        x: gsap.quickTo(card, "x", { duration: 0.62, ease: easing }),
        y: gsap.quickTo(card, "y", { duration: 0.62, ease: easing }),
        rotation: gsap.quickTo(card, "rotation", { duration: 0.7, ease: easing }),
        scale: gsap.quickTo(card, "scale", { duration: 0.5, ease: easing }),
      };
    });
    return () => {
      settersRef.current = [];
    };
    /*
     * 依赖卡片数量而不是 images 数组本身。
     * images 通常是父组件 .map() 出来的新数组，每次渲染引用都变，
     * 依赖它会让 quickTo 被反复重建、飞行中的 tween 丢失，
     * 手感又退回不连续的状态。
     */
  }, [imageCount]);

  /**
   * 根据连续的指针位置更新全部卡片。
   * focus 为 null 表示回到静止姿态。
   */
  const applyPointer = (focus) => {
    const setters = settersRef.current;
    const poses = basePosesRef.current;
    const count = imageCount;
    if (!count) return;

    const nextOrder = [];

    for (let index = 0; index < count; index += 1) {
      const setter = setters[index];
      const card = cardRefs.current[index];
      if (!setter || !card) continue;

      const pose = poses[index] ?? { rotation: 0, x: 0 };

      if (focus == null) {
        setter.x(pose.x);
        setter.y(0);
        setter.rotation(pose.rotation);
        setter.scale(1);
        nextOrder.push(0);
        continue;
      }

      const distance = index - focus;
      const weight = focusWeight(distance);
      const push = pushWeight(distance);

      // 聚焦的卡片摆正（base → 0），旁边的卡片保留原本倾斜
      setter.rotation(pose.rotation * (1 - weight));
      setter.x(pose.x + push * pushDistance);
      // 抬起一点，"分开"才有前后关系而不只是横向平移
      setter.y(-12 * weight);
      setter.scale(1 + 0.05 * weight);

      nextOrder.push(weight);
    }

    /*
     * zIndex 不进 tween —— 补间会产生 3.7 这样的中间值，层级在动画途中反复横跳。
     * 同时只在层级真的变化时才写 style，避免每帧触发无意义的样式失效。
     */
    const previous = zOrderRef.current;
    for (let index = 0; index < nextOrder.length; index += 1) {
      const level = Math.round(nextOrder[index] * 10);
      if (previous[index] === level) continue;
      const card = cardRefs.current[index];
      if (card) card.style.zIndex = String(1 + level);
    }
    zOrderRef.current = nextOrder.map((w) => Math.round(w * 10));
  };

  const handlePointerMove = (event) => {
    if (!enableHover || !readyRef.current) return;
    // 触屏没有悬停语义，跟随会变成"点一下跳一下"
    if (event.pointerType === "touch") return;
    const bounds = containerRef.current?.getBoundingClientRect();
    if (!bounds || !bounds.width) return;

    /*
     * 指针相对容器中心的偏移，单位与卡片 baseX 一致，可以直接比较。
     * 保留小数不取整 —— 这才有跨卡片的渐变过渡，而不是越过边界整排跳一次。
     */
    const offset = event.clientX - (bounds.left + bounds.width / 2);
    applyPointer(focusFromOffset(offset, basePosesRef.current));
  };

  const handlePointerLeave = () => {
    if (!enableHover) return;
    applyPointer(null);
  };

  return (
    <div
      className={`bounce-cards ${className}`}
      ref={containerRef}
      style={{ width: containerWidth, height: containerHeight }}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      {images.map((source, index) => {
        const label = cardLabels[index];
        const clickable = typeof onCardClick === "function";
        return (
          <div
            key={`${source}-${index}`}
            className={`bounce-cards__card bounce-cards__card-${index}`}
            ref={(element) => {
              cardRefs.current[index] = element;
            }}
            {...(clickable
              ? {
                  role: "button",
                  tabIndex: 0,
                  "aria-label": label,
                  onClick: () => onCardClick(index),
                  onKeyDown: (event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onCardClick(index);
                    }
                  },
                }
              : {})}
          >
            <img
              className="bounce-cards__image"
              src={source}
              alt={label ?? ""}
              decoding="async"
              loading="lazy"
            />
          </div>
        );
      })}
    </div>
  );
}
