import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import './index.css';
import App from './App.jsx';

gsap.registerPlugin(ScrollTrigger);

// polyfill: GSAP 3.15.0 lacks ScrollTrigger.flush()
if (!ScrollTrigger.flush) {
  ScrollTrigger.flush = () => ScrollTrigger.getAll().forEach(st => st.kill(false));
}

createRoot(document.getElementById('root')).render(<App />);
