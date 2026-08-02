import { asset } from "../utils/asset";
import { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

const API_BASE = import.meta.env.DEV ? 'http://localhost:8765' : '';
const DOG_IMAGE = asset('/folder-pet.png');

export default function DesktopPet({ onBack }) {
  const containerRef = useRef(null);
  const [images, setImages] = useState([]);
  const [petMood, setPetMood] = useState('idle'); // idle | happy | excited | eating | walking
  const [pos, setPos] = useState(() => ({
    x: 100,
    y: window.innerHeight - 200,
  }));
  const [floatingText, setFloatingText] = useState(null);
  const [grabbed, setGrabbed] = useState(false);
  const [grabOffset, setGrabOffset] = useState({ x: 0, y: 0 });

  // ---------- data loading ----------
  useEffect(() => { loadImages(); }, []);
  const loadImages = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/images?page=1&per_page=10`);
      const d = await res.json();
      setImages(d.images || []);
    } catch {}
  };

  // ---------- idle wander ----------
  useEffect(() => {
    if (petMood === 'sleeping') return;
    const iv = setInterval(() => {
      if (Math.random() > 0.7 && petMood === 'idle') {
        setPetMood('walking');
        setTimeout(() => setPetMood('idle'), 2000);
      }
    }, 6000);
    return () => clearInterval(iv);
  }, [petMood]);

  // ---------- message ----------
  const msg = (t) => {
    setFloatingText(t);
    setTimeout(() => setFloatingText(null), 2000);
  };

  // ---------- pointer grab (move the pet) ----------
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const rect = containerRef.current.getBoundingClientRect();
    setGrabbed(true);
    setGrabOffset({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const onPointerMove = (e) => {
    if (!grabbed) return;
    setPos({ x: e.clientX - grabOffset.x, y: e.clientY - grabOffset.y });
  };

  const onPointerUp = () => setGrabbed(false);

  useEffect(() => {
    if (!grabbed) return;
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [grabbed]);

  // ---------- drop handler (catches file drops BEFORE the browser does) ----------
  const onDrop = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setPetMood('eating');

    const file = e.dataTransfer?.files?.[0];
    if (file && file.type.startsWith('image/')) {
      uploadFile(file);
      return;
    }
    const uri = e.dataTransfer.getData('text/uri-list') || e.dataTransfer.getData('text/plain');
    if (uri?.startsWith('http')) {
      uploadUrl(uri);
      return;
    }
    msg('这不是图片哦~ 😿');
    setPetMood('idle');
  };

  const onDragOver = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const onDragEnter = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setPetMood((m) => m === 'eating' ? m : 'excited');
  };

  const onDragLeave = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setPetMood((m) => m === 'excited' ? 'idle' : m);
  };

  // ---------- upload ----------
  const uploadFile = async (file) => {
    const fd = new FormData();
    fd.append('image', file);
    try {
      const r = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: fd });
      const d = await r.json();
      d.success ? (msg('收到新灵感! 🎨'), loadImages()) : msg('哎呀存不进去... 😿');
    } catch { msg('网络断了... 😿'); }
    finally {
      setTimeout(() => setPetMood('happy'), 1000);
      setTimeout(() => setPetMood('idle'), 3000);
    }
  };

  const uploadUrl = async (url) => {
    try {
      const r = await fetch(`${API_BASE}/api/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: url }),
      });
      const d = await r.json();
      d.success ? (msg('收到网络灵感! 🌐'), loadImages()) : msg('哎呀解析失败... 😿');
    } catch { msg('网络断了... 😿'); }
    finally {
      setTimeout(() => setPetMood('happy'), 1000);
      setTimeout(() => setPetMood('idle'), 3000);
    }
  };

  const moodEmoji = { idle: '✨', happy: '💖', excited: '😻', eating: '🍽️', walking: '🚶', sleeping: '💤' };

  return (
    <>
      {/* Floating message */}
      <AnimatePresence>
        {floatingText && (
          <motion.div
            initial={{ opacity: 0, y: 0 }}
            animate={{ opacity: 1, y: -60 }}
            exit={{ opacity: 0 }}
            className="fixed z-[9999] text-sm font-bold pointer-events-none whitespace-nowrap bg-black/80 backdrop-blur rounded-lg px-2 py-1"
            style={{ left: pos.x + 40, top: pos.y - 10 }}
          >
            {floatingText}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pet — renders above everything, captures all drag events */}
      <div
        ref={containerRef}
        style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 9999, touchAction: 'none' }}
        onPointerDown={onPointerDown}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
      >
        <div className="relative group">
          {/* Glow aura */}
          <motion.div
            className={`absolute -inset-8 rounded-full blur-2xl transition-all duration-300 ${
              petMood === 'excited'
                ? 'bg-yellow-400/25 scale-110'
                : petMood === 'happy'
                  ? 'bg-pink-400/15 scale-105'
                  : grabbed
                    ? 'bg-violet-400/20 scale-105'
                    : 'bg-violet-500/8'
            }`}
            animate={{ scale: grabbed ? 0.92 : 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          />
          {/* Main pet image */}
          <motion.img
            src={DOG_IMAGE}
            alt="桌面宠物狗"
            draggable={false}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.92 }}
            className="w-[72px] h-[72px] rounded-2xl shadow-xl cursor-grab active:cursor-grabbing select-none border-2 border-white/10"
          />
          {/* Mood indicator dot */}
          <motion.div
            className="absolute -bottom-0.5 -right-0.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-xs border border-white/10 pointer-events-none"
            key={petMood}
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.15 }}
          >
            {moodEmoji[petMood] || moodEmoji.idle}
          </motion.div>
        </div>
      </div>

      {/* Bottom-right recent inspirations panel */}
      <div className="fixed bottom-4 right-4 pointer-events-auto z-[9998]" style={{ zIndex: 9998 }}>
        <div className="bg-black/80 backdrop-blur-xl rounded-2xl border border-white/10 p-4 max-w-xs">
          <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-2">
            <Sparkles size={14} className="text-violet-400" />
            最近收到的灵感
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {images.slice(0, 6).map((img) => (
              <motion.div key={img.id} whileHover={{ scale: 1.05 }} className="aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/5">
                <img src={`${API_BASE}${img.url}`} alt="" className="w-full h-full object-cover" />
              </motion.div>
            ))}
            {images.length === 0 && (
              <div className="col-span-3 text-xs text-gray-600 py-4 text-center">还没有灵感哦<br />把图片拖给我吧~</div>
            )}
          </div>
        </div>
      </div>

      {/* Back button */}
      {onBack && (
        <button
          onClick={onBack}
          className="fixed top-4 right-4 z-[9999] pointer-events-auto w-10 h-10 rounded-full bg-black/60 backdrop-blur border border-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      )}
    </>
  );
}
