# Portfolio — 侯海岩 (haiyan)

个人作品集网站。创意总监 / UI-UX 设计师 / 视觉设计师 / 交互设计师 / 前端开发。

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
