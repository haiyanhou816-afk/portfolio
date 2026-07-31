import { motion } from 'framer-motion';

/* 软件图标 SVG — 参照视频中 Adobe 风格：深色圆角方底 + 品牌色字母/图形 */
const icons = {
  ps: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#001E36" />
      <text x="32" y="46" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="30" fill="#31A8FF" letterSpacing="-0.5">Ps</text>
    </svg>
  ),
  ai: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#330C00" />
      <text x="32" y="46" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="30" fill="#FF9A00" letterSpacing="-0.5">Ai</text>
    </svg>
  ),
  ae: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#1A0033" />
      <text x="32" y="46" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="28" fill="#9999FF" letterSpacing="-1">Ae</text>
    </svg>
  ),
  pr: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#1A0033" />
      <text x="32" y="46" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="800" fontSize="28" fill="#9999FF" letterSpacing="-1">Pr</text>
    </svg>
  ),
  figma: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <defs>
        <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#A259FF" />
          <stop offset="50%" stopColor="#FF7262" />
          <stop offset="100%" stopColor="#1ABCFE" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#0B001A" />
      <g transform="translate(14,12)">
        <circle cx="16" cy="10" r="9" fill="#FF7262" opacity="0.95" />
        <circle cx="28" cy="25" r="9" fill="#A259FF" opacity="0.95" />
        <circle cx="5" cy="23" r="9" fill="#1ABCFE" opacity="0.95" />
        <circle cx="18" cy="14" r="16" fill="none" stroke="url(#fg)" strokeWidth="1.5" opacity="0.6" />
      </g>
    </svg>
  ),
  procreate: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#0D0D0D" />
      <g transform="translate(8,8)">
        <path d="M4 44 Q4 20 16 8 Q28 0 40 4 Q46 6 44 18 Q42 28 32 34 Q22 40 14 36 Q8 34 6 42 Z" fill="#FF6B6B" opacity="0.9" />
        <path d="M10 36 Q18 28 24 22 Q30 16 32 10 Q34 24 28 34 Q22 40 16 42" fill="#FFB347" opacity="0.45" />
        <path d="M8 40 Q16 30 20 24 Q24 18 22 8 Q24 22 20 32 Q16 38 12 44" fill="#1ABCFE" opacity="0.4" />
        <path d="M6 42 Q10 34 14 26 Q18 18 14 12 Q16 24 14 34 Q10 40 8 44" fill="#A259FF" opacity="0.35" />
      </g>
    </svg>
  ),
  midjourney: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#001A14" />
      <g transform="translate(10,8)">
        <path d="M30 8 Q38 14 32 24 Q28 32 34 36 Q38 38 30 42 Q24 44 18 36 Q10 28 12 18 Q14 10 22 6 Z" fill="#00D4AA" opacity="0.85" />
        <path d="M26 14 Q30 18 28 22" stroke="#00FFC8" strokeWidth="1.5" fill="none" opacity="0.6" />
        <path d="M34 30 Q36 34 32 36" stroke="#00FFC8" strokeWidth="1.5" fill="none" opacity="0.6" />
        <circle cx="16" cy="30" r="3" fill="#00D4AA" opacity="0.3" />
        <circle cx="40" cy="22" r="2.5" fill="#00D4AA" opacity="0.25" />
      </g>
    </svg>
  ),
  c4d: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#1A0010" />
      <g transform="translate(12,10)">
        <polygon points="8,32 32,6 32,32 8,32" fill="#FF3366" opacity="0.7" />
        <polygon points="32,6 32,32 8,32" fill="#FF6699" opacity="0.4" />
        <polygon points="8,32 24,40 32,32" fill="#CC0044" opacity="0.5" />
        <text x="19" y="30" textAnchor="middle" fontFamily="system-ui, sans-serif" fontWeight="900" fontSize="11" fill="#FF6699" opacity="0.9">C4D</text>
      </g>
    </svg>
  ),
  blender: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <rect x="2" y="2" width="60" height="60" rx="14" fill="#1A0A00" />
      <g transform="translate(14,12)">
        <path d="M2 18 Q6 8 16 4 Q24 2 28 12 Q30 18 26 28 Q22 34 16 38 Q8 40 2 30 Z" fill="#FF8500" opacity="0.85" />
        <circle cx="20" cy="16" r="4" fill="#FFB347" opacity="0.7" />
        <path d="M16 12 Q12 20 16 30 Q20 24 24 16 Q20 12 16 12" fill="#FF6600" opacity="0.5" />
      </g>
    </svg>
  ),
};

const tools = [
  { id: 'ps' },
  { id: 'ai' },
  { id: 'ae' },
  { id: 'pr' },
  { id: 'figma' },
  { id: 'procreate' },
  { id: 'midjourney' },
  { id: 'c4d' },
  { id: 'blender' },
];

const delays = [0, 0.12, 0.24, 0.36, 0.08, 0.2, 0.32, 0.44, 0.16];

export default function ToolIcons() {
  return (
    <div className="grid grid-cols-3 gap-3 mt-4">
      {tools.map((tool, i) => (
        <motion.div
          key={tool.id}
          className="tool-icon relative rounded-2xl overflow-hidden group"
          style={{ aspectRatio: '1/1' }}
          animate={{ scale: [1, 1.04, 1] }}
          transition={{
            duration: 3.5,
            delay: delays[i],
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut',
          }}
          whileHover={{ scale: 1.1, transition: { duration: 0.25 } }}
        >
          <div className="absolute inset-0">{icons[tool.id]}</div>
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent rounded-2xl pointer-events-none" />
          <div
            className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
            style={{ boxShadow: 'inset 0 0 40px rgba(255,255,255,0.06), 0 0 20px rgba(255,255,255,0.04)' }}
          />
          <div className="absolute inset-0 rounded-2xl border border-white/[0.06] pointer-events-none" />
        </motion.div>
      ))}
    </div>
  );
}
