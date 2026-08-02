import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Globe, Sparkles } from 'lucide-react';
import SunToggle from './SunToggle';

const navIds = ['about', 'projects', 'hobbies', 'codex-works', 'strengths', 'contact'];

export default function Header({ lang, setLang, theme, setTheme, onNavigate, onInspiration }) {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 50);
      const positions = {};
      navIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) positions[id] = el.getBoundingClientRect().top;
      });
      const current = Object.entries(positions).reduce((acc, [id, top]) => 
        top <= window.innerHeight * 0.4 ? id : acc, '');
      setActiveSection(current);
    };
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollTo = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    setMenuOpen(false);
  };

  const isDark = theme === 'dark';

  // Active badge indicator for desktop pills
  const isActive = (id) => activeSection === id;

  return (
    <header className="fixed top-0 left-0 right-0 z-50">
      {/* Transparent strip at top */}
      <div className="h-20" />

      {/* Centered floating pill — follows scroll */}
      <AnimatePresence>
        {(scrolled || menuOpen) && (
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="fixed left-0 right-0 top-2 z-50 flex justify-center px-4 pointer-events-none"
          >
            <div className={`pointer-events-auto flex items-center rounded-full border backdrop-blur-xl transition-colors duration-300 ${
              isDark
                ? 'bg-white/[0.08] border-white/10'
                : 'bg-[var(--bg-base)]/[0.06] border-black/10'
            } px-5 py-2 shadow-lg`}>
              {/* Nav links */}
              {/* Logo */}
              <span className={`text-[11px] font-bold tracking-widest mr-2 ${isDark ? 'text-[var(--text-main)]/70' : 'text-black/60'}`}>
                HOUHAIYAN
              </span>
              <div className="flex items-center gap-0.5">
                {navIds.map((id) => (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`relative px-3 py-1.5 text-[13px] font-medium transition-colors rounded-full whitespace-nowrap ${
                      isActive(id)
                        ? isDark
                          ? 'text-[var(--text-main)] bg-white/10'
                          : 'text-black bg-[var(--bg-base)]/8'
                        : isDark
                          ? 'text-[var(--text-dim)] hover:text-[var(--text-main)]/70'
                          : 'text-[var(--text-dim)] hover:text-black/80'
                    }`}
                  >
                    {lang === 'zh'
                      ? { about:'关于我', projects:'精选项目', hobbies:'兴趣爱好', 'codex-works':'AI 协作作品', strengths:'个人优势', contact:'联系我' }[id] || ''
                      : { about:'About', projects:'Projects', hobbies:'Hobbies', 'codex-works':'AI Works', strengths:'Strengths', contact:'Contact' }[id] || ''}
                  </button>
                ))}
              </div>

              {/* Divider */}
              <div className={`w-px h-4 mx-2 ${isDark ? 'bg-white/10' : 'bg-[var(--bg-base)]/10'}`} />

              {/* Controls: Inspiration + Lang + Theme */}
              <div className="flex items-center gap-1 ml-1">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={onInspiration}
                  className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-[var(--text-sub)] hover:text-[var(--text-main)]' : 'text-[var(--text-dim)] hover:text-black'}`}
                  title="灵感宝库"
                >
                  <Sparkles size={15} className="text-amber-400" />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setLang(prev => prev === 'en' ? 'zh' : 'en')}
                  className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-[var(--text-sub)] hover:text-[var(--text-main)]' : 'text-[var(--text-dim)] hover:text-black'}`}
                  title={lang === 'en' ? '中文' : 'English'}
                >
                  <Globe size={15} />
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                  className={`p-1.5 rounded-full transition-colors ${isDark ? 'text-[var(--text-sub)] hover:text-[var(--text-main)]' : 'text-[var(--text-dim)] hover:text-black'}`}
                >
                  <SunToggle lit={theme === 'light'} size={16} />
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Hamburger — always visible at top-right when scrolled or menu open */}
      <AnimatePresence>
        {(scrolled || menuOpen) && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setMenuOpen(!menuOpen)}
            className="fixed top-5 right-4 lg:hidden z-50 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 dark:bg-white/[0.08] border border-white/10 backdrop-blur-xl text-gray-300"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </motion.button>
        )}
      </AnimatePresence>

      {/* Mobile Fullscreen Menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 top-0 z-40 ${isDark ? 'dark:bg-[var(--bg-base)]/90' : 'bg-white/90'} backdrop-blur-xl lg:hidden`}
          >
            <div className="flex flex-col items-center justify-center h-full gap-8 pt-24">
              {navIds.map((id, i) => (
                <motion.button
                  key={id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  onClick={() => scrollTo(id)}
                  className={`text-2xl font-light transition-colors ${
                    isActive(id)
                      ? isDark ? 'text-[var(--text-main)]' : 'text-black'
                      : isDark ? 'text-[var(--text-dim)] hover:text-[var(--text-main)]/70' : 'text-[var(--text-dim)] hover:text-black/80'
                  }`}
                >
                  {lang === 'zh'
                    ? { about:'关于我', projects:'精选项目', hobbies:'兴趣爱好', 'codex-works':'AI 协作作品', strengths:'个人优势', contact:'联系我' }[id] || ''
                    : { about:'About', projects:'Projects', hobbies:'Hobbies', 'codex-works':'AI Works', strengths:'Strengths', contact:'Contact' }[id] || ''}
                </motion.button>
              ))}

              {/* Mobile controls */}
              <div className="flex items-center gap-6 mt-4">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={onInspiration}
                  className={`flex items-center gap-2 text-lg ${isDark ? 'text-amber-400' : 'text-amber-600'}`}
                >
                  <Sparkles size={18} /> 灵感宝库
                </motion.button>
              </div>

              <div className="flex items-center gap-4 mt-2">
                <button
                  onClick={() => setLang(prev => prev === 'en' ? 'zh' : 'en')}
                  className={`p-3 rounded-full ${isDark ? 'text-[var(--text-sub)]' : 'text-[var(--text-dim)]'}`}
                >
                  <Globe size={20} />
                </button>
                <button
                  onClick={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')}
                  className={`p-3 rounded-full ${isDark ? 'text-[var(--text-sub)]' : 'text-[var(--text-dim)]'}`}
                >
                  <SunToggle lit={theme === 'light'} size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
