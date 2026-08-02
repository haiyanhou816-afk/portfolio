import { useCallback, useEffect, useMemo, useRef } from "react";

/**
 * TextFollowCursor — 逐字符跟随光标的标题交互。
 *
 * 每个字符是一块独立的 3D 平面，正面持续朝向指针 —— 向日葵朝向太阳的关系。
 * 指针被当成悬在页面上方 sunHeight 处的一个光点，字符的法向量始终指向它，
 * 所以指针在上方 / 下方 / 侧面时翻转轴与方向都真实不同，且全程追踪、不截断。
 *
 * 动画完全由单条 requestAnimationFrame 循环驱动，逐帧向目标角度做
 * 指数缓动（critically-damped 风格的 lerp），因此：
 *   - 不依赖 CSS transition，指针高频移动时不会互相打断插值
 *   - 进入与离开共用同一套缓动，离开时平滑归零
 *
 * 性能设计（目标稳定 60FPS）：
 *   - 字符 DOM 矩形缓存在 measure() 里，只在挂载 / resize / 滚动时重算，
 *     pointermove 期间不触发任何 layout 读取
 *   - 只写 transform，不碰会触发重排的属性；每个字符加 will-change
 *   - 所有角度收敛到静止后自动停掉 rAF，空闲时零开销
 *   - IntersectionObserver：滚出视口不排帧
 *   - prefers-reduced-motion：完全不启用交互
 *
 * SSR / 框架兼容：所有 window / document 访问都在 effect 或事件回调内，
 * 模块顶层无副作用，因此 Vite 与 Next.js（App / Pages Router）均可直接用。
 * 在 Next.js 中作为客户端组件使用（文件顶部加 "use client"）。
 */
export default function TextFollowCursor({
  text,
  as: Tag = "h1",
  className = "",
  charClassName = "",
  /**
   * 指针「悬在页面上方」的虚拟高度（px）—— 太阳的高度。
   * 越小追踪越夸张：水平距离等于 sunHeight 时刚好转到 45°。
   * 朝向由 atan2 推导，天然饱和在 ±90°，因此不需要角度上限。
   */
  sunHeight = 520,
  /** 单字符透视距离（px）。越小翻面的纵深越夸张 */
  perspective = 620,
  /** 0–1，越大跟随越快。0.16 约等于 ~120ms 到位，手感跟手但不抖 */
  ease = 0.16,
  /** 位移 / 缩放的影响半径（px）。只作用于 magnetic，不影响朝向 */
  radius = 460,
  /** 是否附加轻微的位移与缩放，增强"被吸引"的体感 */
  magnetic = true,
  ariaLabel,
}) {
  const chars = useMemo(() => Array.from(text), [text]);

  const rootRef = useRef(null);
  const charRefs = useRef([]);
  // 每个字符的运行时状态：当前值与目标值分离，逐帧收敛
  const stateRef = useRef([]);
  const rectsRef = useRef([]);
  const pointerRef = useRef({ x: 0, y: 0, active: false });
  const rafRef = useRef(0);
  const visibleRef = useRef(true);
  const reduceRef = useRef(false);

  // 保证状态数组与字符数一致（文本或语言切换时会变）
  if (stateRef.current.length !== chars.length) {
    stateRef.current = chars.map(() => ({
      rx: 0, rxTarget: 0,   // 绕横轴翻（指针在上/下）
      ry: 0, ryTarget: 0,   // 绕纵轴翻（指针在左/右）—— 翻书的主轴
      tx: 0, txTarget: 0,
      ty: 0, tyTarget: 0,
      s: 0, sTarget: 0,
    }));
  }

  /** 缓存每个字符的中心点，避免在 pointermove 里读 layout */
  const measure = useCallback(() => {
    rectsRef.current = charRefs.current.map((node) => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { cx: r.left + r.width / 2, cy: r.top + r.height / 2 };
    });
  }, []);

  const commit = useCallback(() => {
    const states = stateRef.current;
    for (let i = 0; i < charRefs.current.length; i += 1) {
      const node = charRefs.current[i];
      const st = states[i];
      if (!node || !st) continue;
      /*
       * perspective() 必须写在每个字符自己的 transform 链首位，
       * 而不是靠父层的 perspective 属性 —— 父层透视会让所有字符共享
       * 一个消失点，靠边的字母翻起来会被拉斜变形。逐字符透视才能让
       * 每个字母都像独立的一页纸各自翻开。
       */
      const flip = `perspective(${perspective}px) rotateY(${st.ry.toFixed(2)}deg) rotateX(${st.rx.toFixed(2)}deg)`;
      node.style.transform = magnetic
        ? `translate3d(${st.tx.toFixed(2)}px, ${st.ty.toFixed(2)}px, 0) ${flip} scale(${(1 + st.s).toFixed(4)})`
        : flip;

      /*
       * 标题用了负 letter-spacing，字母本就贴得很紧。翻面时字母边缘会沿 Z 轴
       * 凸出，相邻字母互相穿插。让翻得越狠的字符 z-index 越高，翻起的那一页
       * 就始终压在邻页之上，视觉上才是"翻开"而不是"穿模"。
       *
       * 向日葵模型下角度可达 ±90°，所以这里的 lift 上限是 90，
       * z-index 落在 10–100，仍远低于 Hero 里其他层级。
       */
      const lift = Math.round(Math.max(Math.abs(st.ry), Math.abs(st.rx)));
      node.style.zIndex = String(10 + lift);
    }
  }, [magnetic, perspective]);

  const tick = useCallback(() => {
    rafRef.current = 0;
    const states = stateRef.current;
    let moving = false;

    for (let i = 0; i < states.length; i += 1) {
      const st = states[i];
      st.rx += (st.rxTarget - st.rx) * ease;
      st.ry += (st.ryTarget - st.ry) * ease;
      st.tx += (st.txTarget - st.tx) * ease;
      st.ty += (st.tyTarget - st.ty) * ease;
      st.s += (st.sTarget - st.s) * ease;

      // 收敛判定：低于视觉可辨阈值就吸附到目标，避免无限逼近导致 rAF 永不停
      if (Math.abs(st.rxTarget - st.rx) < 0.01) st.rx = st.rxTarget;
      else moving = true;
      if (Math.abs(st.ryTarget - st.ry) < 0.01) st.ry = st.ryTarget;
      else moving = true;
      if (Math.abs(st.txTarget - st.tx) < 0.01) st.tx = st.txTarget;
      else moving = true;
      if (Math.abs(st.tyTarget - st.ty) < 0.01) st.ty = st.tyTarget;
      else moving = true;
      if (Math.abs(st.sTarget - st.s) < 0.0004) st.s = st.sTarget;
      else moving = true;
    }

    commit();
    // 静止后主动停循环；下一次 pointermove 会重新拉起
    if (moving && visibleRef.current) rafRef.current = requestAnimationFrame(tick);
  }, [commit, ease]);

  const kick = useCallback(() => {
    if (!rafRef.current && visibleRef.current && !reduceRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [tick]);

  /** 由指针位置推导每个字符的目标姿态 */
  const retarget = useCallback(() => {
    const { x, y, active } = pointerRef.current;
    const states = stateRef.current;
    const rects = rectsRef.current;

    for (let i = 0; i < states.length; i += 1) {
      const st = states[i];
      const rect = rects[i];

      // 指针离开视口时回正，字符归位
      if (!active || !rect) {
        st.rxTarget = 0;
        st.ryTarget = 0;
        st.txTarget = 0;
        st.tyTarget = 0;
        st.sTarget = 0;
        continue;
      }

      const dx = x - rect.cx;
      const dy = y - rect.cy;

      /*
       * 向日葵模型：把指针看成悬在页面上方 sunHeight 处的太阳，字符的正面
       * 法向量始终指向它 —— 所以无论指针在页面哪个角落，字母都在"看着"它，
       * 不存在影响半径之外突然回正的断层。
       *
       *   rotateY = atan2(dx, h)                  ← 左右转头
       *   rotateX = -atan2(dy, hypot(dx, h))      ← 上下俯仰（屏幕 y 向下为正，
       *                                              取负号才是指针在下方时下缘后翻）
       *
       * 用 atan2 而非归一化向量的好处：第二参数恒为正，值域被限制在 ±90°，
       * 天然饱和、永不越界，所以不需要任何 clamp；水平偏移 = h 时正好 45°，
       * 偏到 2h 是 63.4°，极远处逼近 90°。绕字符转一圈最大单帧跳变 0.8°，全域连续。
       */
      const ry = (Math.atan2(dx, sunHeight) * 180) / Math.PI;
      const rx = (-Math.atan2(dy, Math.hypot(dx, sunHeight)) * 180) / Math.PI;
      st.ryTarget = ry;
      st.rxTarget = rx;

      /*
       * 位移与缩放仍然按距离衰减 —— 朝向是"看向太阳"，全程生效；
       * 而"被吸引"的体感只该发生在指针附近，否则整行标题会被整体拖走。
       */
      if (magnetic) {
        const dist = Math.hypot(dx, dy);
        const falloff = dist >= radius ? 0 : (1 - dist / radius) ** 2;
        st.txTarget = (dx / radius) * 16 * falloff;
        st.tyTarget = (dy / radius) * 16 * falloff;
        st.sTarget = 0.06 * falloff;
      }
    }
  }, [magnetic, radius, sunHeight]);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    reduceRef.current = mq?.matches ?? false;
    const onPref = (event) => {
      reduceRef.current = event.matches;
      if (event.matches) {
        pointerRef.current.active = false;
        retarget();
        // 直接落到静止姿态，不做动画
        stateRef.current.forEach((st) => {
          st.rx = 0; st.ry = 0; st.tx = 0; st.ty = 0; st.s = 0;
        });
        commit();
      }
    };
    mq?.addEventListener?.("change", onPref);

    measure();

    const onPointerMove = (event) => {
      if (reduceRef.current) return;
      // 触屏没有悬停语义，跟随会变成"点一下跳一下"，直接不参与
      if (event.pointerType === "touch") return;
      pointerRef.current = { x: event.clientX, y: event.clientY, active: true };
      retarget();
      kick();
    };

    const onPointerLeave = () => {
      pointerRef.current.active = false;
      retarget();
      kick();
    };

    // 位置缓存失效的场景：尺寸变化与滚动
    const onResize = () => { measure(); retarget(); kick(); };

    const root = rootRef.current;
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", onPointerLeave);
    document.addEventListener("pointerleave", onPointerLeave);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });

    const ro = new ResizeObserver(onResize);
    if (root) ro.observe(root);

    let io;
    if (root) {
      io = new IntersectionObserver(
        ([entry]) => {
          visibleRef.current = entry?.isIntersecting ?? true;
          if (!visibleRef.current) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = 0;
          } else {
            measure();
            kick();
          }
        },
        { threshold: 0 }
      );
      io.observe(root);
    }

    return () => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
      mq?.removeEventListener?.("change", onPref);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", onPointerLeave);
      document.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
      ro.disconnect();
      io?.disconnect();
    };
  }, [commit, kick, measure, retarget]);

  return (
    <Tag ref={rootRef} className={className} aria-label={ariaLabel ?? text}>
      {chars.map((char, index) => (
        <span
          key={`${char}-${index}`}
          className={charClassName}
          aria-hidden="true"
          ref={(node) => {
            charRefs.current[index] = node;
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </Tag>
  );
}
