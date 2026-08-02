import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowUpRight } from "lucide-react";

export default function ProjectDetail({ project, lang, onClose }) {
  const z = lang === "zh";

  // ESC 关闭
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handler);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e) => { if (e.target === e.currentTarget) onClose(); },
    [onClose]
  );

  if (!project) return null;

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.28 }}
        onClick={handleBackdropClick}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 80,
          background: "rgba(0,0,0,0.82)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <motion.div
          key="panel"
          layoutId={`project-card-${project.id}`}
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.94, opacity: 0 }}
          transition={{ type: "spring", damping: 30, stiffness: 340, mass: 0.8 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: "960px",
            maxHeight: "min(88svh, calc(100svh - 3rem))",
            overflow: "hidden",
            background: "var(--bg-surface, #0a0a0a)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "20px",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Close button */}
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              position: "absolute",
              top: "1.25rem",
              right: "1.25rem",
              zIndex: 20,
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--text-sub)",
              flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>

          <div style={{ overflowY: "auto", flex: 1 }}><div style={{ padding: "4rem 2rem 3rem" }}>
            {/* Header meta */}
            <div style={{ marginBottom: "0.5rem" }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--text-dim)",
              }}>
                {z ? project.companyZh : project.companyEn} · {project.year}
              </span>
            </div>

            {/* Title */}
            <h2 style={{
              fontSize: "clamp(2rem, 6vw, 3.5rem)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--text-main)",
              marginBottom: "1rem",
            }}>
              {z ? project.titleZh : project.titleEn}
            </h2>

            {/* Tags + Role */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {project.tags.map((tag) => (
                <span key={tag} style={{
                  padding: "3px 10px",
                  borderRadius: "999px",
                  border: "1px solid var(--border-subtle)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "10px",
                  letterSpacing: "0.08em",
                  color: "var(--text-dim)",
                  textTransform: "uppercase",
                }}>
                  {tag}
                </span>
              ))}
              <span style={{
                padding: "3px 10px",
                borderRadius: "999px",
                background: "rgba(246,74,53,0.12)",
                border: "1px solid rgba(246,74,53,0.25)",
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.08em",
                color: "rgba(246,74,53,0.85)",
                textTransform: "uppercase",
              }}>
                {z ? project.roleZh : project.roleEn}
              </span>
            </div>

            {/* Cover image —— 作品比例从 4.6:1 的播报条到 1:2 的竖版卡片都有，
                所以不锁死画框比例，让图片按原比例完整显示，只限制最大高度。 */}
            <div style={{
              width: "100%",
              borderRadius: "12px",
              overflow: "hidden",
              marginBottom: "2rem",
              background: "#111",
              display: "flex",
              justifyContent: "center",
            }}>
              <img
                src={project.cover}
                alt={z ? project.titleZh : project.titleEn}
                style={{
                  width: "100%",
                  height: "auto",
                  maxHeight: "58svh",
                  objectFit: "contain",
                  display: "block",
                }}
              />
            </div>

            {/* Description */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: "1.5rem",
              marginBottom: "2rem",
            }}>
              <p style={{
                fontSize: "clamp(0.9rem, 1.6vw, 1.05rem)",
                lineHeight: 1.75,
                color: "var(--text-sub)",
                maxWidth: "60ch",
              }}>
                {z ? project.descZh : project.descEn}
              </p>
            </div>

            {/* Extra images grid */}
            {project.images && project.images.length > 1 && (
              <div style={{
                columns: "2 260px",
                columnGap: "1rem",
                marginBottom: "2rem",
              }}>
                {project.images.slice(1).map((src, i) => (
                  <div key={src} style={{
                    borderRadius: "10px",
                    overflow: "hidden",
                    background: "#111",
                    marginBottom: "1rem",
                    breakInside: "avoid",
                  }}>
                    <img
                      src={src}
                      alt={`${z ? project.titleZh : project.titleEn} ${i + 2}`}
                      style={{ width: "100%", height: "auto", display: "block" }}
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Tools footer */}
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
              paddingTop: "1.5rem",
              borderTop: "1px solid var(--border-subtle)",
              flexWrap: "wrap",
            }}>
              <span style={{
                fontFamily: "var(--font-mono)",
                fontSize: "10px",
                letterSpacing: "0.1em",
                color: "var(--text-dim)",
                textTransform: "uppercase",
                flexShrink: 0,
              }}>
                {z ? "使用工具" : "Tools"}
              </span>
              {project.tools.map((tool) => (
                <span key={tool} style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "11px",
                  color: "var(--text-sub)",
                  letterSpacing: "0.05em",
                }}>
                  {tool}
                </span>
              ))}
            </div>
          </div>
        </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}
