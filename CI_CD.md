# 自动化部署方案

本项目采用「CloudBase HTTP 云函数 + GitHub Pages 静态前端」的部署架构：

- **后端**：CloudBase HTTP 云函数（按请求计费，小流量在免费额度内）
- **数据库**：CloudBase NoSQL（免费版每月 3000 资源点）
- **前端**：GitHub Pages（完全免费，无需信用卡）

## 方案对比

| 方案 | 适用场景 | 优点 | 缺点 |
|------|---------|------|------|
| **CloudBase 云函数 + GitHub Pages** | 想全程免费、不想维护服务器 | 0 服务器费用、无镜像仓库、数据库和函数同环境 | 云函数有冷启动、前后端跨域需配置 CORS |
| **CloudBase 云托管** | 已经在用 CloudBase 数据库且预算充足 | 前后端一体、无 CORS、持续运行 | 按 CPU/内存持续计费 |
| **GitHub Actions + 自有服务器** | 已有 VPS / 轻量云服务器 | 成本低、可控性强 | 需要自己维护服务器 |
| **Render / Railway / Fly.io** | 无服务器管理经验 | 一键部署、自动 HTTPS | 长期费用较高或免费额度有限 |

> 当前推荐方案：**CloudBase HTTP 云函数 + GitHub Pages**，适合本项目低频、线下聚会的使用场景，基本可以做到完全免费。

---

## 推荐方案：CloudBase 云函数 + GitHub Pages

### 整体架构

```
GitHub Pages (静态前端)
        │  API 请求
        ▼
CloudBase HTTP 云函数 (Node.js Hono 后端)
        │
        ▼
CloudBase NoSQL 数据库
```

### 1. 前置准备

1. **开通 CloudBase 环境**
   - 进入 [云开发 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
   - 开通环境并记录**环境 ID**
   - 创建服务端 API Key：`环境设置 → API Key 管理 → 创建服务端 API Key`

2. **创建数据库集合**
   - 进入 CloudBase 控制台 → **数据库**
   - 创建 `rooms` 和 `players` 两个集合
   - 默认权限即可，后端使用服务端 API Key 访问

3. **启用 GitHub Pages**
   - 仓库 → **Settings → Pages**
   - **Source** 选择 **GitHub Actions**

### 2. 配置 GitHub Secrets

进入仓库 **Settings → Secrets and variables → Actions → Repository secrets**：

| Secret 名 | 说明 |
|-----------|------|
| `TENCENT_CLOUD_SECRET_ID` | 腾讯云 API 密钥 SecretId |
| `TENCENT_CLOUD_SECRET_KEY` | 腾讯云 API 密钥 SecretKey |
| `TCB_ENV_ID` | CloudBase 环境 ID |
| `CLOUDBASE_API_KEY` | CloudBase 服务端 API Key |
| `ALLOWED_ORIGINS` | 你的 GitHub Pages 域名，例如 `https://your-username.github.io` |
| `VITE_API_URL` | CloudBase 云函数 HTTP 地址，例如 `https://your-env-id.service.tcloudbase.com/api/trpc` |

> `VITE_API_URL` 需要等第一次云函数部署成功后，拿到真实地址再填写。

### 3. 工作流文件

- **后端部署**：`.github/workflows/deploy-cloudbase-function.yml`
  - push 到 `main` 时自动构建并部署 CloudBase HTTP 云函数
  - 部署前会用 GitHub Secrets 替换 `cloudbaserc.json` 中的 `{{env.XXX}}` 占位符
  - 命令：`tcb fn deploy api --httpFn --path /api --dir ./cloudfunctions/api`

- **前端部署**：`.github/workflows/deploy-gh-pages.yml`
  - push 到 `main` 时自动构建并部署到 GitHub Pages
  - 使用 `VITE_API_URL`、`VITE_BASE_URL=./`、`VITE_ROUTER_TYPE=hash`

### 4. 首次部署步骤

1. push 代码到 `main`，触发 `deploy-cloudbase-function.yml`
2. 部署完成后，在 CloudBase 控制台 → **云函数 → HTTP 访问** 查看函数 URL
3. 将函数 URL + `/trpc` 填入 GitHub Secrets 的 `VITE_API_URL`
   - 例如函数访问地址是 `https://your-env-id.service.tcloudbase.com/api`
   - 则 `VITE_API_URL` 填 `https://your-env-id.service.tcloudbase.com/api/trpc`
4. 再次 push 或手动触发 `deploy-gh-pages.yml`，前端就会使用新的后端地址重新构建

### 5. CORS 配置

后端会根据 `ALLOWED_ORIGINS` 自动放行对应域名，并同步调整 `Content-Security-Policy` 的 `connect-src`。

测试阶段可设为 `*`（生产环境不推荐）。

### 6. 本地开发

```bash
npm run dev
```

本地开发时前端走 `/api/trpc`，Vite 会代理到后端，无需配置 `VITE_API_URL`。

### 7. 本地测试云函数产物

```bash
npm run build:function
PORT=9000 NODE_ENV=production node cloudfunctions/api/index.js
```

然后访问 `http://localhost:9000/api/trpc/ping` 测试。

---

## 本地验证

在合并到 `main` 前，确保以下命令全部通过：

```bash
npm run check
npm run lint
npm run build
npm run build:function
```

CI 会在 PR 阶段执行这些检查，只有 push 到 `main` 时才会触发部署。
