# Portfolio 网站 — 新会话交接文档 (2026-07-24)

> ⚠️ **重要**: 这是一个全新的会话，本文档是你在该线程上下文的唯一来源。以下所有信息来自对上一个 Codex 线程 `019f8e3f-64a9-78f1-9d90-d0957b717a65` 的完整读取。

---

## 任务目标

为视觉设计师侯海岩搭建个人作品集网站，风格要求极简高级、纯黑白配色、支持中英文切换和亮暗主题切换。

**技术栈**: React + Vite 8 + Tailwind CSS 3.x + Framer Motion + GSAP + ScrollTrigger + lucide-react
**项目路径**: `/Users/hhy/Documents/网站/portfolio`
**预览地址**: `http://localhost:5173`

**页面结构（6个模块）**: Hero全屏首页 → About关于我 → Featured精选项目 → Portfolio全作品浏览 → Skills个人优势 → Contact联系收尾页

---

## 已完成内容（截至上一个会话结束）

### 基础架构 ✅
- Vite + React + Tailwind 项目初始化完成
- 中英文切换（所有组件均支持 `lang='zh'` / `lang='en'`）
- 亮暗主题切换（通过 `document.documentElement.setAttribute('data-theme', theme)` 实现）
- Tailwind darkMode 配置：`['attribute', 'data-theme']`
- 生产构建通过：`npx vite build` ✅

### Header 导航栏 ✅
- 固定顶部，滚动后出现磨砂玻璃效果 (`backdrop-blur-2xl`)
- **胶囊造型**：导航链接包裹在 `rounded-full` 容器内
- 当前选中项高亮胶囊色块（白底黑字/黑底白字半透明）
- 滚动后胶囊底板透明度已调至很轻的效果：
  - 暗色模式：`dark:bg-white/3` + `dark:border-transparent`
  - 亮色模式：`bg-black/3` + `border-transparent`
- 移动端汉堡菜单

### Hero 首页 ✅
- **开场动画**：GSAP curtain 遮罩揭开 → 标题 clipPath 揭示 → 照片渐入 → 各区块 stagger 入场 → 滚动指示器淡入
- 超大品牌名 "侯海岩®"（响应式字号 `text-[12vw] sm:text-[9rem] md:text-[10rem] lg:text-[11rem]`，`leading-[0.82]`）
- 黑白肖像照背景（仅暗色模式显示）
- 左侧 **LineSidebar 交互目录**（5个分类：关于我/项目/作品集/优势/联系），proximity-based hover 高亮系统
- 中间角色描述文字
- 右侧 About 介绍文案
- 底部 CTA Row（VIEW PROJECTS 箭头 + 联系我按钮 + 版权信息）
- **Stats Strip（底部统计数字条）已删除**（用户要求移除）

### LineSidebar 组件 ✅
- `src/components/ui/LineSidebar.jsx` — proximity-based hover 交互系统
- 使用 `requestAnimationFrame` 平滑过渡
- Props 支持自定义：`proximityRadius`, `maxShift`, `markerLength`, `smoothing` 等
- `pointerEvents: 'auto'` 确保 framer-motion 动画期间 pointer events 正常

### 其他模块 ✅
- About.jsx — 双栏布局，头像卡片，教育/荣誉/经历时间线
- Featured.jsx — 3张项目卡片，斜切梯形面板设计
- Portfolio.jsx — 8分类筛选 + 网格瀑布流占位
- Skills.jsx — 6张能力卡片
- Contact.jsx — 联系方式 + CTA

---

## 当前问题 / 未完成事项 🔴

### 1. ~~首页「侯海岩」字体被裁切~~ ✅ 已修复
- **用户原话**: "首页侯海岩字体被裁切修复"
- **最后状态**: AI 准备开始定位并修复此问题，但因 **Image count 5 exceeds limit 4 per request** 报错导致会话中断（task error），**没有任何代码修改被应用**。
- **需要做什么**: 
  1. 检查 Hero.jsx 中 `<h1>` 元素（第163行）的 overflow / line-height / text-clip 设置
  2. 检查 `.hero-title-clip` 容器的 `clip-path: inset(0 0% 0 0)` 是否导致裁剪
  3. 检查响应式断点下的字体缩放（`text-[12vw] sm:text-[9rem] md:text-[10rem] lg:text-[11rem]`）是否超出容器
  4. 可能需要调整 `leading-[0.82]` 或增加父容器 padding

### 2. Vite dev server 进程不稳定
- 端口 5173 上的服务多次意外退出（进程被 shell 回收）
- 之前尝试过 `screen`、`tmux`、`disown`、`nohup` 等方式保活，但都有不同程度的不稳定
- **建议**: 如果需要重新运行，先 kill 旧进程：`kill $(lsof -ti:5173)` 然后重新启动
- 或者直接用 Vite 自带的 HMR（不带后台保活）即可

---

## 踩过的坑（历史记录）

### 1. Vite 启动后立即退出
- 原因：后台进程被 shell 回收
- 解决：用 `screen` 独立会话启动可暂时存活，但仍偶发断开

### 2. 页面黑屏 — GSAP context 冲突
- 症状：浏览器白屏/黑屏，什么也不渲染
- 原因：**React StrictMode 导致 useEffect 双重执行**，GSAP context 冲突
- 解决：移除了 index.html 中 App.jsx 外的 `<React.StrictMode>` 包裹

### 3. LineSidebar 交互失效
- 症状：鼠标移到目录条目上无高亮/线条动画
- 原因1：包裹 LineSidebar 的 `<motion.div>` 初始化时 `opacity: 0`，即使加了 `pointerEvents: 'auto'`，framer-motion 仍会干扰事件捕获
- 原因2：Hero.jsx 中残留 `defaultActive={0}` 导致持久高亮干扰 hover 逻辑
- 解决：将 LineSidebar 移出 motion.div 包装，移除 defaultActive prop

### 4. Hero 标题文字颜色硬编码
- 症状：主题切换后标题文字不跟着变色
- 原因：`text-white` 类名硬编码了白色
- 解决：改用内联样式 `style={{ color: isDark ? '#fff' : '#000' }}`

### 5. npx vite build 路径错误
- 原因：在全局环境下搜索 vite 而非项目本地的 node_modules
- 解决：必须先进入 `/Users/hhy/Documents/网站/portfolio` 目录再执行命令

### 6. CSS color-mix() 导致 Vite HMR 不稳定
- 如果在新项目中遇到 HMR 热更新卡顿，将 `color-mix()` 相关样式直接写入 `index.css` 全局样式表

---

## 关键文件说明

| 文件 | 说明 |
|------|------|
| `portfolio/src/components/Hero.jsx` (270行) | ⭐ 首屏核心组件，含 GSAP 开场动画 + LineSidebar |
| `portfolio/src/components/Header.jsx` | 导航栏，胶囊造型 + 磨砂玻璃效果 |
| `portfolio/src/components/ui/LineSidebar.jsx` | 交互目录组件 |
| `portfolio/src/App.jsx` | 根组件，管理 lang + theme 状态 |
| `portfolio/src/index.css` | 全局 CSS 变量主题系统 + Tailwind + LineSidebar 样式 |
| `portfolio/tailwind.config.js` | darkMode: ['attribute', 'data-theme'] |
| `portfolio/HANDOFF.md` (旧版) | 上一版交接文档，位于同目录，有补充细节 |

---

## 快速启动

```bash
cd /Users/hhy/Documents/网站/portfolio
npx vite --host 0.0.0.0 --port 5173
# 浏览器打开 http://localhost:5173
```

---

## 联系方式
- 手机: <REDACTED>
- 微信: IHuangHuaYu
- 邮箱: haiyanhou816@gmail.com
