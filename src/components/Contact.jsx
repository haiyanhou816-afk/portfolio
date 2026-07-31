import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Mail, Phone, Link2 } from "lucide-react";

gsap.registerPlugin(ScrollTrigger);

export default function Contact({ lang }) {
  const z = lang === "zh";
  const sectionRef = useRef(null);
  const headerRef = useRef(null);
  const cardsContainerRef = useRef(null);
  const cardsRef = useRef({ list: [] });
  const setCardRef = (el, i) => { if (el) cardsRef.current.list[i] = el; };

  // Sophisticated scroll-triggered entrance for contact section
  useEffect(() => {
    const tl = gsap.timeline();

    // Title entrance — dramatic swoop from bottom with blur reveal
    tl.fromTo(headerRef.current.querySelector("h2"),
      { y: 120, opacity: 0, scale: 0.9, filter: "blur(12px)" },
      { y: 0, opacity: 1, scale: 1, filter: "blur(0px)", duration: 2.0, ease: "power5.out,elastic.out(1,.15),back.out(2.2)" }
    );

    // Subtitle follows
    tl.fromTo(headerRef.current.querySelector("p"),
      { y: 40, opacity: 0 },
      { y: 0, opacity: 1, duration: 1.2, ease: "power3.out", delay: "-=1.8" }
    );

    // Contact cards stagger reveal
    const cardEls = cardsRef.current.list.filter(Boolean);
    if (cardEls.length > 0) {
      tl.fromTo(cardEls,
        { y: 60, opacity: 0, scale: 0.95, rotation: [ -3, 0 ] },
        { y: 0, opacity: 1, scale: 1, rotation: 0, stagger: { value: [0.2, 0.3], from: "center" }, duration: { value: [1.1, 1.5] }, ease: "power3.out,elastic.out(1,.25)" }
      );
    }

    // CTA button appears last
    tl.fromTo(headerRef.current.nextElementSibling?.querySelector("button"),
      { opacity: 0, y: 20, scale: 0.9 },
      { opacity: 1, y: 0, scale: 1, duration: 0.8, ease: "back.out(1.7)" },
      "-=0.3"
    );

    ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 85%",
      end: "bottom center",
      onEnter: () => tl.play(),
      onLeaveBackward: () => tl.progress(0).timeScale(1)
    });

    return () => {
      gsap.killTweensOf("*");
      ScrollTrigger.flush();
    };
  }, []);

  const contactInfo = [
    { icon: <Phone size={20} />, label: "电话", value: "<REDACTED>", desc: "Mobile" },
    { icon: <Mail size={20} />, label: "微信", value: "I HuangHuaYu", desc: "WeChat" },
    { icon: <Mail size={20} />, label: "邮箱", value: "haiyanhou816@gmail.com", desc: "Email" },
  ];

  return (
    <motion.section id="contact" className="relative py-32 lg:py-40 bg-[var(--bg-base)]" ref={sectionRef}
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.7 }}
    >
      <div className="container-content">
        <div ref={headerRef} className="mb-16 lg:mb-20 text-center">
          <span className="text-sm font-medium tracking-wide uppercase mb-4 block text-gray-500">06 — {z ? "联系收尾页" : "Contact"}</span>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4 text-white" style={{ color: "var(--text-main)" }}>{z ? "联系我" : "Get in Touch"}</h2>
          <p className="text-lg md:text-xl font-normal text-gray-500 max-w-2xl mx-auto" style={{ color: "var(--text-sub)" }}>{z ? "有任何疑问或合作机会，欢迎随时与我联系" : "Feel free to reach out for any questions or collaborations"}</p>
        </div>

        {/* Contact info cards */}
        <div ref={cardsContainerRef} className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto mb-16">
          {contactInfo.map((item, i) => (
            <motion.div
              key={i}
              ref={(el) => setCardRef(el, i)}
              className="relative group rounded-2xl border border-white/[0.08] bg-black/[0.03] dark:bg-white/[0.02] p-8 text-center hover:border-white/[0.15] dark:hover:border-black/[0.15] transition-all duration-500 cursor-default"
            >
              <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/[0.04] dark:bg-black/[0.04] flex items-center justify-center group:bg-white/[0.08] dark:group:bg-black/[0.08] transition-colors duration-300">
                {item.icon}
              </div>
              <div className="text-sm font-medium uppercase tracking-wide mb-2" style={{ color: "var(--text-dim)" }}>{item.label}</div>
              <div className="text-lg font-bold mb-1" style={{ color: "var(--text-main)" }}>{item.value}</div>
              <div className="text-xs text-gray-500 mt-2" style={{ color: "var(--text-sub)" }}>{item.desc}</div>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="text-center">
          <button className="inline-flex items-center gap-3 px-8 py-4 rounded-full border border-white/[0.25] bg-white/[0.04] dark:bg-black/[0.04] text-sm font-medium text-gray-300 hover:text-white hover:border-white/[0.4] hover:bg-white/[0.08] dark:hover:bg-black/[0.08] transition-all duration-300 group">
            <span>{z ? "发送消息" : "Send Message"}</span>
            <Link2 size={16} className="group:translate-x-1 group:-translate-y-0.5 transition-transform duration-300" />
          </button>
        </div>
      </div>
    </motion.section>
  );
}
