export const translations = {
  en: {
    nav: { about:'About', projects:'Projects', portfolio:'Portfolio', strengths:'Strengths', contact:'Contact' },
    hero: { role: 'Visual Designer · AI Designer · Brand Designer', subtitle: 'Crafting digital experiences where aesthetics meet strategy', cta: 'View My Work', contact: 'Get In Touch' },
    about: { 
      title: 'About Me', subtitle: 'Designer who bridges visual artistry with product thinking',
      intro: "I'm Hou Haiyan, a designer focused on UI/UX, visual design, and brand identity. I combine industrial design thinking with internet product design.",
      education: 'Education', honor: 'Honors & Awards',
      contactInfo: 'Contact Info', email: 'Email', location: 'Location',
      stats: { projects:'Projects', experience:'Internships', skills:'Skills', tools:'Tools' },
    },
    projects: { title: 'Featured Projects', subtitle: 'Selected works that showcase my design thinking' },
    portfolio: { title: 'Complete Portfolio', subtitle: 'Browse all my work by category' },
    strengths: { title: 'My Strengths', subtitle: 'What makes me different' },
    contact: { title: "Let's Work Together", subtitle: "I'm always open to discussing new projects, creative ideas, or opportunities.", email: 'Email Me', location: 'Wuhan, China', send: 'Send Message' },
  },
  zh: {
    nav: { about:'关于我', projects:'精选项目', portfolio:'全作品浏览', strengths:'个人优势', contact:'联系我' },
    hero: { role: '视觉设计师 · AI设计师 · 品牌设计师', subtitle: '当美学遇见策略，创造有深度的数字体验', cta: '查看作品', contact: '联系我' },
    about: { 
      title: '关于我', subtitle: '一位连接视觉艺术与产品思维的创作者',
      intro: '我是侯海岩，一名专注于UI/UX设计、视觉设计和品牌设计的创作者。我将工业设计思维与互联网产品设计相结合，创造既能解决问题的作品，也能驱动商业价值。',
      education: '教育背景', honor: '荣誉奖项',
      contactInfo: '联系方式', email: '邮箱', location: '所在城市',
      stats: { projects:'项目经验', experience:'实习经历', skills:'专业技能', tools:'设计工具' },
    },
    projects: { title: '精选项目', subtitle: '精选作品，展现我的设计思维' },
    portfolio: { title: '全作品浏览', subtitle: '按分类浏览我的所有作品' },
    strengths: { title: '个人优势', subtitle: '我的核心竞争力' },
    contact: { title: '期待与您合作', subtitle: "我始终欢迎讨论新项目、创意想法，或有幸成为您愿景的一部分。", email: '发送邮件', location: '中国·武汉', send: '发送消息' },
  },
};

export function t(lang, section, key, subKey) {
  const val = (translations[lang] || translations.zh)[section]?.[key];
  if (subKey && typeof val === 'object') return val[subKey] || '';
  if (typeof val === 'string') return val;
  return '';
}
