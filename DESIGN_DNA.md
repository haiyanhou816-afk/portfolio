# Personal Design DNA — HOU HAIYAN
> 每次开始新设计任务前，先读这份文档，再动手。
> Last updated: 2026-08

---

## 一、品牌定位

| 维度 | 定义 |
|------|------|
| **核心身份** | 视觉设计师 × 品牌叙事者 × AI 协作者 |
| **品牌名** | HHY STUDIO / HOUHAIYAN |
| **关键词** | 克制、精准、有力量、有记忆点 |
| **定位句** | "我把想法转化为清晰、鲜活且有记忆点的视觉系统。" |
| **受众** | 互联网公司、游戏公司、品牌方的设计负责人或 HR |
| **差异点** | 设计 × AI 协作能力并行；中英双语；从游戏 UI 到品牌视觉全覆盖 |

---

## 二、视觉语言

### 配色系统（双主题）

**Dark Mode（主推）**
- Background: `#000000` / `#0a0a0a`
- Card: `rgba(15,15,15,0.8)`
- Text Main: `#ffffff`
- Text Sub: `#999999`
- Text Dim: `#555555`
- Border Subtle: `rgba(60,60,60,0.4)`
- Accent Red（仅 Featured）: `rgba(246,74,53,0.24)`
- Loading Warm: `#e9d7ce` / `#d0371e`（马赛克加载屏专属暖调）

**Light Mode**
- Background: `#ffffff` / `#f5f5f5`
- Card: `rgba(255,255,255,0.9)`
- Text Main: `#000000`
- Text Sub: `#666666`

**配色原则**：单色为主，用透明度和层次区分信息权重；红色是唯一有温度的彩色，只在 Featured 区块出现，制造焦点。不要随意引入其他色彩。

---

### 字体系统

| 层级 | 属性 |
|------|------|
| **主字体** | Inter（Google Fonts）；Amazon Ember 声明但需清理 |
| **等宽/标注** | JetBrains Mono → 用于 eyebrow label、loading meta、状态栏 |
| **标题** | `font-bold`（700），`letter-spacing: -0.018em`，`line-height: 1.08` |
| **正文** | `font-normal`（400），`line-height: 1.55` |
| **Eyebrow** | `text-sm tracking-wide uppercase`，灰色，带序号 `01 —` |
| **品牌标记** | 全大写 `HOUHAIYAN` / `HHY` / `HHY STUDIO` |

---

### 间距与留白

- Section padding: `py-32 lg:py-40`（大留白，呼吸感）
- 卡片内边距: `p-6` ~ `p-8`
- 卡片圆角: `rounded-xl`（12px）~ `rounded-2xl`（16px）
- 卡片边框: `border border-white/[0.08]`，悬浮时 `border-white/[0.15]`
- 网格间距: `gap-6` ~ `gap-8`
- Section 之间靠 `-margin-top: -1px` 消除缝隙

---

## 三、布局系统

- **单页滚动**，sections 垂直堆叠，无路由跳转
- 浮动 Pill Nav：滚动后出现，居中，带 backdrop-blur
- 内容容器 `.container-content` 控制最大宽度
- 全局 dot-grid overlay（`.site-flow::after`）作为质感底纹
- 节与节的过渡：目前均为淡入，无品牌化分割器

---

## 四、动效系统

| 层级 | 技术 | 特征 |
|------|------|------|
| 页面级入场 | Framer Motion `FlowSection` | `opacity 0.92→1, y 18→0, blur 7px→0`，duration 1.15s |
| Section 级入场 | GSAP + ScrollTrigger | 标题：`y 80-120, scale 0.9, blur 6-12px` 大幅度揭示；卡片：stagger 中心展开 |
| Hero 交互 | 原生 pointer 事件 | 字母随鼠标扭曲（`--character-rotate`） |
| 项目展示 | GridMotion | 鼠标驱动行间视差 |
| AI 作品 | BounceCards | Elastic 弹性卡片堆叠 |
| 背景 | PixelSnow | 3D 像素粒子浮动（About 区） |
| 自定义光标 | CustomCursor | 替代系统默认 |
| Loading | Framer Motion | 马赛克 tile 闪烁 + 进度条 |

**动效原则**：动效用于揭示内容层级，不用于装饰。每个动效都应有目的（进场=引导注意力，交互=提供反馈，过渡=维持叙事节奏）。

---

## 五、组件模式

- **卡片**：圆角 + 细边框 + 极淡背景 + 悬浮边框加深，无阴影堆砌
- **按钮**：圆角全角（pill）为主，`px-8 py-4`，内联图标
- **Eyebrow label**：`[序号] — [章节名]`，统一小写 + 等宽字体风格
- **标题层级**：Eyebrow → H2（超大，bold）→ Subtitle（gray-500）
- **Section 结构**：全部居左对齐（Contact 居中为例外）

---

## 六、品牌标记与签名元素

1. **字母扭曲标题**（Hero）— 最具辨识度的交互签名
2. **马赛克 Loading**（暖红色 tile face）— 独特的入场仪式
3. **HOUHAIYAN / HHY 印章**（Hero statusbar + stamp）
4. **Dot-grid 全局底纹**
5. **浮动 Pill 导航**
6. **数字编号 Section eyebrow**（01 — 06）
7. **双语切换**（中/英）
8. **Red glow**（仅 Featured 区块的专属色温）
9. **BounceCards** 弹性卡叠方式展示 AI 作品

---

## 七、品牌声音（文案调性）

- 中文：直接、简练、有温度，不用形容词堆砌
- 英文：全大写用于品牌标记；正文句首大写，短句优先
- Slogan 结构："动词 + 形容词 + 名词" — "I turn ideas into clear, vivid visual systems."
- 避免：行业套话（"用心设计"、"追求完美"）

---

## 八、技术栈

```
React 18 + Vite
Tailwind CSS（utility-first）
Framer Motion（页面/组件动效）
GSAP + ScrollTrigger（scroll 驱动动效）
Lucide Icons
Google Fonts: Inter + JetBrains Mono
```

---

## 九、已知问题（1.0 待解决）

1. `--font-sans` 声明 Amazon Ember 但未加载，实际回退 Arial
2. GSAP + Framer Motion 双层动效在同一 section，存在冲突风险
3. Section 序号标注有错位（Hobbies 标 05 但顺序是 03）
4. About 第 4 个 stat：中文"设计工具"、英文"Awards"，数据不一致
5. Featured 项目区无点击进入详情的路径
6. Contact "发送消息"按钮无实际 action
7. 无 Footer，无 SEO meta
8. Section 间无品牌化节奏分割
9. PixelSnow 在 About 区视觉噪声偏重

