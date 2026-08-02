# HANDOFF.md — Portfolio Website 2.0

> 写给完全没有上下文的新会话。读完这份文档再动手，不要跳步骤。
> Last updated: 2026-08-01

---

## 一、项目背景

**设计师**：侯海岩（haiyan）  
**我的角色**：创意总监 / UI-UX 设计师 / 视觉设计师 / 交互设计师 / 前端开发工程师  
**本地路径**：`/Users/hhy/Documents/网站/portfolio`  
**技术栈**：Vite 6.4.1 + React 19 + Tailwind 3 + framer-motion 12.42.2 + GSAP 3.15  
**远端仓库**：`https://github.com/haiyanhou816-afk/portfolio`（**private**）  
**SSH 已验证**：`Hi haiyanhou816-afk!`  
**git config user.name**：`haiyan`

### 设计原则（必读）
- 每次新任务前先读 `/Users/hhy/Documents/网站/portfolio/DESIGN_DNA.md`
- 不推翻 Website 1.0，保留原有设计语言与品牌个性
- 参考 Apple / Linear / Stripe / Notion 的设计思想，不是复制视觉
- 改完提醒用户 **Cmd + Shift + R** 强制刷新
- 每次改完必须 `npm run build` 通过（约 2.4–4.5s，chunk > 500kB 警告为非阻塞已知问题）
- **只有用户明确说「帮我推一下」才执行 git push**

---

## 二、git 状态

**目前本会话所有改动均未 commit / push。**  

```
最新 commit：48ca719 Publish portfolio site（origin/main）

未提交的修改（M = modified，?? = new file）：
M  index.html
M  src/App.jsx
M  src/components/About.jsx
M  src/components/BounceCards.jsx
M  src/components/CodexWorks.jsx
M  src/components/Contact.jsx
M  src/components/Featured.jsx
M  src/components/Header.jsx
M  src/components/Hero.jsx
M  src/components/Hobbies.jsx
M  src/components/LoadingScreen.jsx
M  src/components/Skills.jsx
M  src/index.css
?? DESIGN_DNA.md
?? src/components/AsciiVignetteBloom.jsx
?? src/components/PixelBulb.jsx
?? src/components/ProjectDetail.jsx
?? src/components/ShinyText.css
?? src/components/ShinyText.jsx
?? src/data/
```

用户如要提交，建议运行：
```bash
cd /Users/hhy/Documents/网站/portfolio
git add -A
git commit -m "feat: Website 2.0 — ASCII hero, loading screen, scroll interactions"
git push
```

---

## 三、本会话已完成的工作

### 1. 精选项目 h2 字号调大
`src/index.css`：
- 桌面端 `.featured-grid-section__copy h2` → `font-size: clamp(4.5rem, 12vw, 14rem)`
- 移动端 `@media (max-width: 760px)` → `clamp(4rem, 22vw, 7.5rem)`

### 2. 项目详情弹窗居中
`src/components/ProjectDetail.jsx`：
- backdrop `alignItems: "flex-end"` → `"center"`，padding `"0"` → `"1.5rem"`
- 面板动画从底部滑入改为 `scale: 0.94` + fade 居中出现
- 关闭按钮改 `position: absolute`，内容区独立滚动

### 3. AI 协作作品支持点击进入详情
- **新建** `src/data/codexWorks.js`：5 个作品，结构与 `projects.js` 完全一致
- `src/components/BounceCards.jsx`：新增 `onCardClick` / `cardLabels` 可选 prop
- `src/components/CodexWorks.jsx`：接入 `codexWorks` 数据 + `ProjectDetail` 弹窗

### 4. ShinyText 组件集成
- `src/components/ShinyText.jsx` + `ShinyText.css` 新建
- Contact 模块底部加了走马灯滚动文字："讓下一個視覺項目保持清晰鋒利和可落地"

### 5. ASCII Vignette Bloom 效果（21st.dev 复刻）
**新建** `src/components/AsciiVignetteBloom.jsx`，Canvas2D 从零实现，无外部依赖。

- 源图使用 `/hero-bg.jpg`（`/ascii-editor/demos/generated/ref-008.webp` 项目里不存在）
- 主要 props：`src` / `className` / `config` / `bgColor` / `edgeFade`（0-1 边缘渐隐）/ `reveal`（0-1 逐格揭示）
- 已实现 renderMode：`mosaic`、`pixel`、`dither`、`dots`、`diamond`、`characters`、`hexdump`
- 已实现 pfx：`vignette`、`bloom`、`scanLines`、`filmGrain`
- 已实现 animStyle：`wave`、`pulse`、`shimmer`、`ripple`、`flicker`
- 性能：IntersectionObserver 离屏停 rAF、`prefers-reduced-motion` 静态帧、ResizeObserver 防重绘

### 6. 加载页换成 ASCII 效果
`src/components/LoadingScreen.jsx`：
- 中间视觉换成 `<AsciiVignetteBloom edgeFade={0.42} config={{ bgMode: "none" }} />`
- 右下角进度条样式**保持不变**（用户明确要求）
- `bgMode: "none"` 保证 canvas 区域透明，不会出现突兀方块

### 7. 首页头图背景换成 ASCII 效果
`src/components/Hero.jsx`：
- 插入 `<div className="hero-ascii">` 包 `AsciiVignetteBloom`
- 参数（背景不抢前景）：cellSize 14 / saturation isDark?55:85 / brightness isDark?6:20 / contrast 118 / vignette 46 / bloom 22 / animIntensity 42 / edgeFade 0.3
- 去掉了原鼠标交互蒙版（`hero-portrait-base` / `hero-portrait-focus`）

### 8. 加载页网格边缘渐隐 + 加载页→首页入场编排

四拍时序：
| 时间 | 事件 |
|---|---|
| 0ms | 进度 100%，加载页四角文字散开 |
| 0.12s | 幕布横向拉开 1.25s |
| 0.26s | 首页背景网格逐格点亮 1.4s，easeOutCubic |
| 1.12s | 首页文字接力错峰入场，最后一个 2.85s 收尾 |

相关文件：
- `App.jsx`：`loading` / `intro` state，3100ms 后清除 `intro`
- `Hero.jsx`：`intro` / `pending` props + `reveal` state，rAF 驱动 0→1
- `index.css`：`.site-intro` 各元素 animation-delay 1.12s–1.7s

### 9. 加载页时长延长
`LoadingScreen.jsx`：
- `minDuration`：4200ms（约 4.8s 总时长）
- 进度曲线：近线性 + 尾段减速（`elapsed < 0.85 ? elapsed * 1.08 : 1.08 * 0.85 + (elapsed - 0.85) * 0.547`）
- 网格跟随进度铺开：`const gridReveal = Math.min(1, progress / 78)`（第 63 行）

---

## 四、⚠️ 下一步任务（新会话直接从这里开始）

**用户要求**：首屏 Hero 内容随滚动**分层消散/复现**，而非硬邦邦固定在页面上。下滑离开时逐渐消散，上滑回来时逐渐显现（必须双向可逆）。

### 推荐实现方案

用 framer-motion 的 `useScroll` + `useTransform`：

```js
import { useScroll, useTransform } from "framer-motion";

// heroRef 已挂在 <section> 上，直接复用
const { scrollYProgress } = useScroll({
  target: heroRef,
  offset: ["start start", "end start"],
});
```

各层消散节奏建议（滚动 0→1 时 opacity 变化区间）：

| 元素 | className | opacity 区间 | 附加效果 |
|---|---|---|---|
| scroll 提示 | `.portfolio-hero__scroll` | [0, 0.08] → [1, 0] | 最先消失 |
| 状态栏 | `.hero-statusbar` | [0, 0.1] → [1, 0] | 最先消失 |
| 眉标 | `.portfolio-hero__eyebrow` | [0, 0.18] → [1, 0] | 上移 −20px |
| 底部文案 | `.portfolio-hero__footer-copy` | [0, 0.2] → [1, 0] | 较早 |
| 右下角戳 | `.portfolio-hero__stamp` | [0, 0.2] → [1, 0] | 较早 |
| 大标题 h1 | `.portfolio-hero__title` | [0, 0.3] → [1, 0] | blur 0→8px + 上移 −40px，主角 |
| 光晕 | `.hero-sun` | [0, 0.45] → [1, 0] | 中等 |
| ASCII 背景 | `.hero-ascii` | [0.1, 0.6] → [0.6, 0] | 轻微缩放 1→0.96 |
| 颗粒层 | `.hero-grain` | [0.2, 0.7] → [0.17, 0] | 最晚淡出 |

把对应 `div` / `button` 换成 `motion.div` / `motion.button`，绑 `style={{ opacity: opacityValue, ... }}`。

### 必须解决的冲突

1. **CSS animation vs framer-motion inline style 冲突**  
   `.site-ready` / `.site-intro` 对 hero 元素应用 `animation: hero-content-enter 1.15s ... both`，`both` 使入场结束后 fill state 继续保持，会压制 framer-motion 的 inline style（CSS animation 优先级更高）。  
   **解决方法**：只在 `intro === false`（入场动画已结束）后启用滚动绑定。可用 `useTransform` 配合一个 `enabled` 状态：
   ```js
   const [scrollReady, setScrollReady] = useState(false);
   // intro 变为 false 后再开启
   useEffect(() => {
     if (!intro) {
       const t = setTimeout(() => setScrollReady(true), 100);
       return () => clearTimeout(t);
     }
   }, [intro]);
   ```
   
2. **移动端 `.hero-ascii { opacity: .42 }` 是 CSS 写死的**  
   framer-motion 控 opacity 会冲突。解决：用 CSS 变量 `--ascii-opacity` 作为通道，或改为在移动端用 `style` prop 覆盖。

3. **`prefers-reduced-motion`**  
   开启时不做滚动消散，保持静态。

4. **`.hero-ascii` 已有 `mask-image`**  
   叠加 `filter: blur()` 时要注意：`filter` 会创建新的 stacking context，可能打断 mask。建议把 blur 用在上层内容元素，不要加在 `.hero-ascii` 上。

---

## 五、关键文件速查

| 文件 | 内容 |
|---|---|
| `src/components/Hero.jsx` | **下一步主要改这里**。`heroRef` 在 `<section>` 上可直接给 `useScroll` 使用 |
| `src/App.jsx` | `loading` / `intro` state，3100ms 清 intro |
| `src/components/AsciiVignetteBloom.jsx` | ASCII 效果核心，props: src/className/config/bgColor/edgeFade/reveal |
| `src/components/LoadingScreen.jsx` | 加载页，minDuration 4200，gridReveal 第 63 行 |
| `src/components/ProjectDetail.jsx` | 居中弹窗，复用于 Featured 和 CodexWorks |
| `src/components/BounceCards.jsx` | 支持 onCardClick / cardLabels |
| `src/data/codexWorks.js` | AI 协作作品 5 条数据 |
| `src/data/projects.js` | 原精选项目数据 |
| `src/components/ShinyText.jsx` + `ShinyText.css` | 走马灯组件，在 Contact 中使用 |
| `src/components/PixelBulb.jsx` | 像素灯泡（主题切换按钮） |
| `src/index.css:924` | `hero-content-enter` keyframes |
| `src/index.css:927-943` | `.site-ready` / `.site-intro` animation-delay |
| `src/index.css:.hero-ascii` | 头图 ASCII 层样式（含 mask-image，移动端 opacity .42） |
| `DESIGN_DNA.md` | **每次新任务前必读** |

---

## 六、已知限制与踩坑记录

### 截图验证
**Playwright 无法截图 localhost**。两个 Chromium 二进制（完整版和 headless_shell）导航 localhost 全部超时，即使 curl 返回 200。已尝试端口 5173 / 4399，均失败。**不要再尝试 Playwright 截图**，改为逐行审代码 + python3 验算数值逻辑。

### Python3 做字符串替换
中文路径下 shell heredoc 处理特殊字符不稳定，建议用：
```bash
python3 - << 'PY'
import re
# 读文件 / 做替换 / 写文件
PY
```

### Node REPL
变量会残留，重复 `const` 声明报 `Identifier already declared`。必要时 `mcp__node_repl__js_reset`。

### `exec_command` 后台进程
被 shell 回收，需要 `yield_time_ms` 保持会话；stdin 关闭，需 `tty: true` 才能写入。

### chunk > 500kB 警告
已知非阻塞，不用处理。

### 主题机制
`document.documentElement.setAttribute('data-theme', theme)`，CSS 变量定义在 `src/index.css` 第 8 行（dark）和第 41 行（light）。

### hero-ascii 移动端 opacity
CSS 写死 `.hero-ascii { opacity: .42 }`（在 `@media (max-width: 760px)` 里），如果 framer-motion 同时控制 opacity 会冲突。

---

## 七、用户工作习惯

- 改完提醒 **Cmd + Shift + R** 强制刷新
- 用中文回复
- 讨论设计时把 Website 1.0 的优点、当前问题、2.0 升级策略、实现建议一并说清楚
- 用户想要的是「有目的的交互」，没有明确目的不加动效
- sessionStorage 缓存加载页（同会话只完整播放一次）：用户尚未回应是否要加

---

## 八、下一步之后可以探索（Website 3.0 方向）

- 精选项目卡片 3D 视差翻转
- About 页时间轴展开动画
- 自定义光标拖尾效果增强
- OG 图 / meta 社交分享信息
- 表单实际提交（目前 Contact 是静态的）
- sessionStorage 加载页缓存
