# 自动化部署方案

**当前主方案：EdgeOne Pages + CloudBase 数据库**

- 前端：EdgeOne Pages 静态托管
- 后端：EdgeOne Pages Cloud Functions
- 数据库：CloudBase NoSQL

```
EdgeOne Pages 默认域名
        │
        ├── /              → 静态页面（前端）
        └── /api/*         → Cloud Functions（后端）
                                │
                                ▼
                        CloudBase NoSQL 数据库
```

**优点：**
- 前后端同域名，不跨域
- 不需要 ICP 备案
- 全球边缘节点加速
- 小流量在免费额度内

---

## 方案对比

| 方案 | 域名 | 是否跨域 | 是否需要备案 | 成本 | 当前状态 |
|------|------|---------|-------------|------|---------|
| **EdgeOne Pages** | EdgeOne 默认域名 | 否 | 不需要 | ¥0 | **当前主方案** |
| GitHub Pages 备选 | GitHub Pages + CloudBase | 跨域 | 不需要 | ¥0 | 手动触发 |
| CloudBase 一体化 | 已备案自定义域名 | 否 | 需要 | ¥0~几块钱/月 | 已移除 workflow |

---

## EdgeOne Pages 部署

### 1. 前置准备

1. **CloudBase 环境**
   - 进入 [CloudBase 控制台](https://console.cloud.tencent.com/tcb)
   - 免费开通环境，记录 **环境 ID**
   - 创建服务端 API Key
   - 创建数据库集合 `rooms` 和 `players`

2. **EdgeOne Pages 项目**
   - 进入 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
   - 创建项目 → 导入 Git 仓库
   - 选择本仓库和 `main` 分支

### 2. 构建配置

EdgeOne Pages 会自动读取项目根目录的 `edgeone.json`：

```json
{
  "buildCommand": "npm run build:edgeone",
  "outputDirectory": "./dist/public",
  "installCommand": "npm install",
  "nodeVersion": "22.11.0",
  "rewrites": [
    { "source": "/*", "destination": "/index.html" }
  ]
}
```

构建命令说明：
- `vite build`：构建前端静态资源到 `dist/public`
- `node scripts/build-edgeone.mjs`：将 `edgeone/api.ts` 打包为 `cloud-functions/api/[[default]].js`

### 3. 环境变量

在 EdgeOne Pages 控制台 → **环境变量与密钥**，添加：

| 变量名 | 说明 |
|--------|------|
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID |
| `CLOUDBASE_API_KEY` | CloudBase 服务端 API Key |
| `ALLOWED_ORIGINS` | EdgeOne Pages 默认域名，可先填 `*`，部署后改为真实域名 |

> Cloud Functions 中通过 `process.env.XXX` 读取环境变量。

### 4. 路由说明

EdgeOne Pages 自动识别 `cloud-functions/` 目录：

- `cloud-functions/api/[[default]].js` → 路由 `/api/*`
- 前端静态资源 → 路由 `/`
- `rewrites` 配置确保 BrowserRouter 刷新不 404

### 5. 部署

push 到 `main` 后，EdgeOne Pages 会自动重新构建并部署。

---

## 备选：GitHub Pages + CloudBase 云函数

> 此方案保留为手动触发的备选。当前 CloudBase 免费版 HTTP 函数直接 URL 访问存在问题，建议优先使用 EdgeOne Pages。如 EdgeOne 方案跑不通，可切回此方案。

| Secret | 值 |
|--------|-----|
| `ALLOWED_ORIGINS` | `https://your-username.github.io` |
| `VITE_API_URL` | `https://your-env-id.service.tcloudbase.com/api/trpc` |
| `VITE_BASE_URL` | `./` |
| `VITE_ROUTER_TYPE` | `hash` |

手动触发 `.github/workflows/deploy-cloudbase-function.yml` 和 `deploy-gh-pages.yml`。

---

## 本地开发

```bash
npm run dev
```

本地开发时前端走 `/api/trpc`，Vite 会代理到后端，无需配置环境变量。

## 本地验证

合并到 `main` 前请确保：

```bash
npm run check
npm run lint
npm run build
npm run build:edgeone
```

`build:edgeone` 会同时构建前端和 EdgeOne Cloud Function。
