/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['attribute', 'data-theme'],
  theme: {
    extend: {
      maxWidth: { 'content': '1700px' },
      fontFamily: {
        // 走 CSS 变量，才能跟着 html[lang] 一起切字族（中文 Inter / 英文 Nunito）
        sans: ['var(--font-sans)'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
