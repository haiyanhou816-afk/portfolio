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

  const dismissLoading = useCallback(() => setLoading(false), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

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
    <div className={`min-h-screen ${theme === 'light' ? 'light-theme' : ''} ${loading ? '' : 'site-ready'}`}>
      <AnimatePresence>
        {loading && <LoadingScreen onComplete={dismissLoading} />}
      </AnimatePresence>
      <Header lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} onNavigate={() => setPage('analyzer')} onInspiration={() => setPage('inspiration')} />
      <main className="site-flow">
        <Hero lang={lang} theme={theme} />
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
