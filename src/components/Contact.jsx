import { useRef, useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Mail, Phone, MessageCircle, Copy, Check, ArrowUpRight } from "lucide-react";
import ShinyText from "./ShinyText";

gsap.registerPlugin(ScrollTrigger);

const WECHAT_ID = "IHuangHuaYu";
const EMAIL = "haiyanhou816@gmail.com";
const PHONE = "<REDACTED>";

/**
 * 联系方式默认以星号遮罩，悬停 / 聚焦时逐字"打字机"揭示，移开再逐字收回。
 * 遮罩与真实值等长，字符 1:1 替换，所以揭示过程中不会有布局跳动。
 * 真实值始终以 sr-only 留在 DOM 里，读屏和爬虫读到的是完整信息，不受视觉遮罩影响。
 */
function MaskedReveal({ value, active }) {
  const total = value.length;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const target = active ? total : 0;
    if (count === target) return undefined;

    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
    if (reduce) {
      setCount(target);
      return undefined;
    }

    // 正向 32ms/字，反向 16ms/字收得快一些；一次 timeout 只走一个字符，
    // 到达边界后 effect 直接 return，不会留下空转的定时器。
    const stepMs = active ? 32 : 16;
    const timer = window.setTimeout(() => {
      setCount((current) =>
        active ? Math.min(current + 1, total) : Math.max(current - 1, 0)
      );
    }, stepMs);

    return () => window.clearTimeout(timer);
  }, [active, count, total]);

  const display = value.slice(0, count) + "*".repeat(Math.max(0, total - count));

  return (
    <>
      <span aria-hidden="true">{display}</span>
      <span className="sr-only">{value}</span>
    </>
  );
}

export default function Contact({ lang }) {
  const z = lang === "zh";
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsRef = useRef({ list: [] });
  const setCardRef = (el, i) => { if (el) cardsRef.current.list[i] = el; };
  const [copied, setCopied] = useState(false);
  // 当前被悬停 / 聚焦的卡片 id，驱动打字机揭示
  const [activeCard, setActiveCard] = useState(null);

  // GSAP scroll-triggered entrance
  useEffect(() => {
    const tl = gsap.timeline({ paused: true });
    const h2El = headerRef.current?.querySelector("h2");
    const pEl = headerRef.current?.querySelector("p");
    const cardEls = cardsRef.current.list.filter(Boolean);

    if (h2El) {
      tl.fromTo(h2El,
        { y: 80, opacity: 0, scale: 0.92, filter: "blur(10px)" },
        { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 1.6, ease: "power4.out" }
      );
    }
    if (pEl) {
      tl.fromTo(pEl,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1.0, ease: "power3.out" },
        "-=1.3"
      );
    }
    if (cardEls.length > 0) {
      tl.fromTo(cardEls,
        { y: 50, opacity: 0, scale: 0.94 },
        { y: 0, opacity: 1, scale: 1, stagger: 0.12, duration: 1.0, ease: "power3.out" },
        "-=0.8"
      );
    }

    const st = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 85%",
      onEnter: () => tl.play(),
      onLeaveBackward: () => tl.progress(0).pause(),
    });

    return () => {
      st.kill();
      tl.kill();
    };
  }, []);

  const handleCopyWechat = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(WECHAT_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      // fallback: execCommand
      const el = document.createElement("textarea");
      el.value = WECHAT_ID;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }, []);

  const mailtoHref = `mailto:${EMAIL}?subject=${encodeURIComponent(
    z ? "你好，我想与你合作" : "Hi, I'd love to connect"
  )}&body=${encodeURIComponent(
    z
      ? "你好海岩，\n\n我是……\n\n我想和你聊聊……\n\n期待你的回复！"
      : "Hi Haiyan,\n\nI'm … and I'd love to discuss …\n\nLooking forward to hearing from you!"
  )}`;

  const contactCards = [
    {
      id: "phone",
      icon: <Phone size={20} />,
      labelZh: "电话",
      labelEn: "Phone",
      value: PHONE,
      descZh: "随时拨打",
      descEn: "Call anytime",
      href: `tel:${PHONE}`,
      action: null,
    },
    {
      id: "wechat",
      icon: <MessageCircle size={20} />,
      labelZh: "微信",
      labelEn: "WeChat",
      value: WECHAT_ID,
      descZh: "点击复制微信号",
      descEn: "Click to copy ID",
      href: null,
      action: handleCopyWechat,
    },
    {
      id: "email",
      icon: <Mail size={20} />,
      labelZh: "邮箱",
      labelEn: "Email",
      value: EMAIL,
      descZh: "24小时内回复",
      descEn: "Reply within 24h",
      href: mailtoHref,
      action: null,
    },
  ];

  return (
    <motion.section
      id="contact"
      className="relative py-32 lg:py-40 bg-[var(--bg-base)]"
      ref={sectionRef}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
    >
      <div className="container-content">
        {/* Header */}
        <div ref={headerRef} className="mb-16 lg:mb-20 text-center">
          <span className="text-sm font-medium tracking-wide uppercase mb-4 block text-gray-500">
            06 — {z ? "联系我" : "Contact"}
          </span>
          <h2
            className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6"
            style={{ color: "var(--text-main)" }}
          >
            {z ? "联系我" : "Get in Touch"}
          </h2>
          <p
            className="text-lg md:text-xl font-normal max-w-xl mx-auto"
            style={{ color: "var(--text-sub)" }}
          >
            {z
              ? "如果你在寻找能独立推进视觉系统的设计师，欢迎发邮件，我 24 小时内回复。"
              : "If you're looking for a designer who can independently drive visual systems, drop me an email — I reply within 24 hours."}
          </p>
        </div>

        {/* Contact cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto mb-14">
          {contactCards.map((item, i) => {
            const isWechat = item.id === "wechat";
            const Tag = item.href ? "a" : "button";
            const isActive = activeCard === item.id;

            // 触屏没有 hover 语义，pointerenter/leave 会在一次点按里连闪一次，
            // 所以触屏交给 click 处理：点一下揭示并保持。
            const handlePointerEnter = (event) => {
              if (event.pointerType === "touch") return;
              setActiveCard(item.id);
            };
            const handlePointerLeave = (event) => {
              if (event.pointerType === "touch") return;
              setActiveCard((current) => (current === item.id ? null : current));
            };
            const handleFocus = () => setActiveCard(item.id);
            const handleBlur = () =>
              setActiveCard((current) => (current === item.id ? null : current));
            const handleClick = (event) => {
              setActiveCard(item.id);
              item.action?.(event);
            };

            const tagProps = item.href
              ? { href: item.href, target: item.id === "email" ? "_self" : undefined, rel: "noopener noreferrer" }
              : { type: "button" };

            return (
              <motion.div
                key={item.id}
                ref={(el) => setCardRef(el, i)}
                className="relative"
              >
                <Tag
                  {...tagProps}
                  onPointerEnter={handlePointerEnter}
                  onPointerLeave={handlePointerLeave}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onClick={handleClick}
                  className="group w-full flex flex-col items-center rounded-2xl border border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.02] p-8 text-center hover:border-white/[0.18] hover:bg-white/[0.04] transition-all duration-300 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-white/30"
                  style={{ textDecoration: "none" }}
                >
                  {/* Icon ring */}
                  <div className="w-14 h-14 mb-5 rounded-full flex items-center justify-center bg-white/[0.05] group-hover:bg-white/[0.1] transition-colors duration-300">
                    <span style={{ color: "var(--text-sub)" }}>{item.icon}</span>
                  </div>

                  {/* Label */}
                  <div
                    className="text-xs font-medium uppercase tracking-widest mb-2"
                    style={{ color: "var(--text-dim)" }}
                  >
                    {z ? item.labelZh : item.labelEn}
                  </div>

                  {/* Value */}
                  <div
                    className="text-base font-semibold mb-2 break-all"
                    style={{ color: "var(--text-main)", fontFamily: "var(--font-mono)" }}
                  >
                    <MaskedReveal value={item.value} active={isActive} />
                  </div>

                  {/* Desc / copy feedback */}
                  {isWechat ? (
                    <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: "var(--text-dim)" }}>
                      <AnimatePresence mode="wait">
                        {copied ? (
                          <motion.span
                            key="copied"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="flex items-center gap-1"
                            style={{ color: "#4ade80" }}
                          >
                            <Check size={12} />
                            {z ? "已复制！" : "Copied!"}
                          </motion.span>
                        ) : (
                          <motion.span
                            key="hint"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="flex items-center gap-1"
                          >
                            <Copy size={12} />
                            {isActive
                              ? (z ? item.descZh : item.descEn)
                              : (z ? "悬停查看微信号" : "Hover to reveal ID")}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-xs" style={{ color: "var(--text-dim)" }}>
                      {z ? item.descZh : item.descEn}
                    </div>
                  )}
                </Tag>
              </motion.div>
            );
          })}
        </div>

        {/* CTA button */}
        <div className="text-center">
          <motion.a
            href={mailtoHref}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full border border-white/[0.25] bg-white/[0.04] text-sm font-medium transition-all duration-300 hover:border-white/[0.45] hover:bg-white/[0.08]"
            style={{ color: "var(--text-main)", textDecoration: "none" }}
          >
            <span>{z ? "发送邮件" : "Send an Email"}</span>
            <ArrowUpRight size={16} strokeWidth={1.8} />
          </motion.a>
        </div>

        {/* Brand marquee strip */}
        <div className="contact-marquee mt-20">
          <div className="contact-marquee__track">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="contact-marquee__item" aria-hidden={i > 0}>
                <ShinyText
                  text="讓下一個視覺項目保持清晰鋒利和可落地"
                  speed={4}
                  delay={0}
                  color="#484848"
                  shineColor="#c0c0c0"
                  spread={110}
                  direction="left"
                />
                <span className="contact-marquee__sep">✦</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}
