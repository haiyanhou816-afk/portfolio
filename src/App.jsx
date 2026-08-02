import { useState, useEffect, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Header from './components/Header';
import Hero from './components/Hero';
import LoadingScreen from './components/LoadingScreen';
import About from './components/About';
import Featured from './components/Featured';
import Hobbies from './components/Hobbies';
import CodexWorks from './components/CodexWorks';
import Skills from './components/Skills';
import Contact from './components/Contact';
import DesignAnalyzer from './pages/DesignAnalyzer';
import InspirationGallery from './components/InspirationGallery';
import CustomCursor from './components/CustomCursor';

function FlowSection({ children, index }) {
  return (
    <motion.div
      className="site-flow__section"
      initial={{ opacity: 0.92, y: 18, filter: 'blur(7px)' }}
      whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
      viewport={{ once: true, amount: 0.18, margin: '-12% 0px -12% 0px' }}
      transition={{ duration: 1.15, delay: Math.min(index * 0.035, 0.16), ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}

function App() {
  const [lang, setLang] = useState('zh');
  const [theme, setTheme] = useState('dark');
  const [page, setPage] = useState('home');
  const [loading, setLoading] = useState(true);
  // 加载页退场后进入入场编排阶段，结束后才解除首屏动画标记
  const [intro, setIntro] = useState(false);
  // 滚动锁：加载全程 + 入场动画开头一段，避免刷新后直接滑走
  const [scrollLock, setScrollLock] = useState(true);

  const dismissLoading = useCallback(() => {
    setLoading(false);
    setIntro(true);
  }, []);

  useEffect(() => {
    if (!intro) return undefined;
    /*
     * 必须等最后一个文字动画彻底结束再摘掉 site-intro，
     * 否则 animation-delay 会从 1.7s 跳回 0.5s，已完成的动画被重算导致闪跳。
     * 最长时序：stamp 延迟 1.7s + 时长 1.15s = 2.85s，留一点余量。
     */
    const timer = window.setTimeout(() => setIntro(false), 3100);
    /*
     * 不等整个 3.1s 编排结束才放开滚动 —— 那样会像页面卡死。
     * 1500ms 时首屏标题已经落位，此刻交还控制权，节奏和手感都成立。
     */
    const unlock = window.setTimeout(() => setScrollLock(false), 1500);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(unlock);
    };
  }, [intro]);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  /*
   * 语言写到根节点，让 CSS 能按语言切换字族。
   * 中文走 Inter（有完整中文回退链），英文走 Nunito —— 圆润的单层 a
   * 和上翘的 t 让英文读起来更有手感，但它没有中文字形，所以只在 en 下启用。
   */
  useEffect(() => {
    document.documentElement.setAttribute('lang', lang === 'zh' ? 'zh-CN' : 'en');
  }, [lang]);

  /*
   * 加载页 + 入场开头锁死滚动，保证刷新后一定停在首屏头图。
   * 用 overflow:hidden 挡常规滚动，再拦 wheel / touchmove / 方向键，
   * 覆盖触控板惯性和键盘滚动这两条绕过 overflow 的路径。
   */
  useEffect(() => {
    if (!scrollLock) return undefined;

    // 刷新时浏览器会自动恢复上次滚动位置，先关掉并归零
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
    // 用 instant 绕过 html 上的 scroll-behavior: smooth，避免看到回滚过程
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    const root = document.documentElement;
    const { body } = document;
    const prevRootOverflow = root.style.overflow;
    const prevBodyOverflow = body.style.overflow;
    const prevBodyPadding = body.style.paddingRight;

    // 隐藏滚动条会让内容变宽，补上等宽 padding，解锁时才不会横向跳动
    const scrollbarWidth = window.innerWidth - root.clientWidth;
    root.style.overflow = 'hidden';
    body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) body.style.paddingRight = `${scrollbarWidth}px`;

    const blockedKeys = new Set([
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
      'PageUp', 'PageDown', 'Home', 'End', ' ',
    ]);
    const prevent = (event) => {
      if (event.cancelable) event.preventDefault();
    };
    const preventKeys = (event) => {
      if (blockedKeys.has(event.key)) prevent(event);
    };

    window.addEventListener('wheel', prevent, { passive: false });
    window.addEventListener('touchmove', prevent, { passive: false });
    window.addEventListener('keydown', preventKeys);

    return () => {
      root.style.overflow = prevRootOverflow;
      body.style.overflow = prevBodyOverflow;
      body.style.paddingRight = prevBodyPadding;
      window.removeEventListener('wheel', prevent);
      window.removeEventListener('touchmove', prevent);
      window.removeEventListener('keydown', preventKeys);
      window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
    };
  }, [scrollLock]);

  if (page === 'analyzer') {
    return (
      <div className={`min-h-screen ${theme === 'light' ? 'light-theme' : ''}`}>
        <DesignAnalyzer onBack={() => setPage('home')} />
        <CustomCursor />
      </div>
    );
  }

  if (page === 'inspiration') {
    return (
      <>
        <InspirationGallery onBack={() => setPage('home')} />
        <CustomCursor />
      </>
    );
  }

  return (
    <div className={`min-h-screen ${theme === 'light' ? 'light-theme' : ''} ${loading ? '' : 'site-ready'} ${intro ? 'site-intro' : ''}`}>
      <AnimatePresence>
        {loading && <LoadingScreen onComplete={dismissLoading} />}
      </AnimatePresence>
      <Header
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        onNavigate={() => setPage('analyzer')}
        onInspiration={() => setPage('inspiration')}
      />
      <main className="site-flow">
        <Hero lang={lang} theme={theme} intro={intro} pending={loading} />

        <FlowSection index={0}><About lang={lang} /></FlowSection>
        <FlowSection index={1}><Featured lang={lang} /></FlowSection>

        <FlowSection index={2}><Hobbies lang={lang} /></FlowSection>
        <FlowSection index={3}><CodexWorks lang={lang} /></FlowSection>
        <FlowSection index={4}><Skills lang={lang} /></FlowSection>
        <FlowSection index={5}><Contact lang={lang} /></FlowSection>
      </main>
      <CustomCursor />
    </div>
  );
}

export default App;
