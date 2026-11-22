# Portfolio — 侯海岩 (haiyan)

个人作品集网站。创意总监 / UI-UX 设计师 / 视觉设计师 / 交互设计师 / 前端开发。

## 网站监测台

- **实时数据（在线）**：[portfolio-admin-15620.app.workbuddy.host/?sharecode=OREZLXLSU5](https://portfolio-admin-15620.app.workbuddy.host/?sharecode=OREZLXLSU5)
  - 数据来自 Cloudflare Web Analytics，实时拉取；包含访问趋势、星期热力、设备分布、异常告警、深浅色切换和二维码分享卡片。
  - 这是 WorkBuddy 托管的 Node/Express 后台，GitHub Pages 只能放静态文件、不能直接运行它。
- **源码**：本仓库的 `monitor-backend` 分支（`index.js`、`cloudflare.js`、`monitor.js`、`views/`）。

  ```bash
  git fetch origin monitor-backend
  git checkout monitor-backend
  npm install
  # 参考该分支的 .env.example 填写 Cloudflare 和分享码配置
  node index.js
  ```

- **静态快照（GitHub Pages）**：[monitor.html](https://haiyanhou816-afk.github.io/portfolio/monitor.html)。数据定格在生成那一刻，不会自动更新，主要用于展示监测台外观；实时数据请打开上面的在线链接。

## 技术栈

- Vite + React 19
- Tailwind CSS 3
- framer-motion + GSAP

## 本地开发

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # 产物输出到 dist/
npm run preview  # 预览构建产物
```

## 环境变量

复制 `.env.example` 为 `.env` 后按需填写。所有变量都是可选的，留空时对应功能会自动降级（不渲染或跳过）。

| 变量 | 说明 |
| --- | --- |
| `VITE_CONTACT_PHONE` | 联系区展示的电话号码，未配置时不渲染电话卡片 |
| `AGNES_API_KEY` | 仅供本地开发服务器代理使用，不参与前端构建 |

`.env` 已被 `.gitignore` 忽略，请勿提交任何真实凭据。

## 版权

代码以 MIT 许可证发布，见 `LICENSE`。

`public/images/` 下的作品图片、文案及品牌视觉为作者本人所有，**不在 MIT 许可范围内**，未经许可请勿转载或用于商业用途。
