# 部署指南

由于 `*.github.io` 域名在部分网络环境下无法访问，本项目提供多种部署方案。

## 方案一：Cloudflare Pages（推荐）

✅ **国内可访问** | ✅ 自动部署 | ✅ 全球 CDN

### 步骤

1. 访问 [dash.cloudflare.com](https://dash.cloudflare.com)，注册并登录
2. 进入 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
3. 授权 GitHub，选择 `haiyanhou816-afk/portfolio` 仓库
4. 配置构建：
   - **分支**：`cloudflare-pages`（或 `main`）
   - **构建命令**：`npm run build`
   - **构建输出目录**：`dist`
   - **环境变量**：`VITE_BASE=/`（如已在代码中设置可省略）
5. 点击 **Save and Deploy**

部署完成后会得到一个 `xxx.pages.dev` 域名，全球可访问。

### 使用 Wrangler CLI（可选）

```bash
# 安装 wrangler
npm install -g wrangler

# 登录 Cloudflare
wrangler login

# 部署（首次会创建项目）
wrangler pages deploy dist --project-name=portfolio
```

---

## 方案二：Vercel

✅ 国内可访问 | ✅ 自动部署 | ✅ 免费 SSL

### Web 界面部署

1. 访问 [vercel.com/new](https://vercel.com/new)
2. 导入 GitHub 仓库 `haiyanhou816-afk/portfolio`
3. 配置：
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**: `VITE_BASE=/`
4. 点击 **Deploy**

### Vercel CLI 部署

```bash
npm install -g vercel
vercel login
vercel --prod
```

---

## 方案三：GitHub Pages + 自定义域名

⚠️ **需要自己的域名**

如果你有域名（如 `example.com`），可以继续使用 GitHub Pages：

1. 在仓库根目录添加 `CNAME` 文件，内容为你的域名：
   ```
   portfolio.example.com
   ```

2. 在域名 DNS 设置中添加 CNAME 记录：
   ```
   portfolio  CNAME  haiyanhou816-afk.github.io
   ```

3. GitHub Pages 设置中启用自定义域名和 HTTPS

---

## 当前状态

- ✅ GitHub Pages 部署已配置（分支：`main`）
- ✅ Cloudflare Pages 配置已就绪（分支：`cloudflare-pages`）
- ⏳ 需要在 Cloudflare 控制台完成首次连接

推送此分支后，访问 Cloudflare Dashboard 完成连接即可。
