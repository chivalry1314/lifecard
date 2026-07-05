# 自动化部署方案

**当前主方案：A. CloudBase 完全免费默认域名**

push 到 `main` 时只会自动部署方案 A。方案 B 和 C 已改为手动触发（`workflow_dispatch`）。

| 方案 | 域名 | 是否跨域 | 是否需要备案 | 成本 | 当前状态 |
|------|------|---------|-------------|------|---------|
| **A. 完全免费默认域名** | CloudBase 默认域名 | 跨域 | 不需要 | ¥0 | **自动部署** |
| **B. 一体化自定义域名** | 已备案自定义域名 | 不跨域 | 需要 | ¥0~几块钱/月 | 手动触发 |
| **C. GitHub Pages 备选** | GitHub Pages + CloudBase | 跨域 | 不需要 | ¥0 | 手动触发 |

---

## 方案 A：完全免费默认域名（推荐入门）

```
CloudBase 静态托管默认域名
        │  API 请求（跨域，后端 CORS 已处理）
        ▼
CloudBase HTTP 云函数默认域名
        │
        ▼
CloudBase NoSQL 数据库
```

**工作流：** `.github/workflows/deploy-cloudbase-free.yml`

### 配置 Secrets

| Secret | 说明 |
|--------|------|
| `TENCENT_CLOUD_SECRET_ID` / `TENCENT_CLOUD_SECRET_KEY` | 腾讯云 API 密钥 |
| `TCB_ENV_ID` | CloudBase 环境 ID |
| `CLOUDBASE_API_KEY` | CloudBase 服务端 API Key |
| `ALLOWED_ORIGINS` | 首次可填 `*`，获取静态托管默认域名后更新为真实域名 |

### 部署流程

push 到 `main` 后，工作流自动完成：

1. `npm run build:function` 构建云函数
2. `tcb fn deploy api ...` 部署 HTTP 云函数
3. 通过 `tcb fn list` 获取云函数默认访问 URL
4. `npm run build` 构建前端，注入 `VITE_API_URL`
5. `tcb hosting deploy ...` 部署前端到 CloudBase 静态托管

### 首次部署后

1. 进入 CloudBase 控制台 → **静态网站托管**
2. 复制默认域名，例如 `https://your-env-id-xxx.tcloudbaseapp.com`
3. 更新 GitHub Secrets 中的 `ALLOWED_ORIGINS` 为该域名
4. 重新触发 workflow

> 前端使用 HashRouter（`VITE_ROUTER_TYPE=hash`），静态资源使用相对路径（`VITE_BASE_URL=./`），兼容默认域名任意子路径。

---

## 方案 B：一体化自定义域名

```
自定义域名（需 ICP 备案）
        │
        ├── /              → CloudBase 静态网站托管
        └── /api/*         → CloudBase HTTP 云函数
```

### 配置 Secrets

| Secret | 说明 |
|--------|------|
| `TENCENT_CLOUD_SECRET_ID` / `TENCENT_CLOUD_SECRET_KEY` | 腾讯云 API 密钥 |
| `TCB_ENV_ID` | CloudBase 环境 ID |
| `CLOUDBASE_API_KEY` | CloudBase 服务端 API Key |
| `ALLOWED_ORIGINS` | 你的自定义域名 |

### 工作流

- **后端：** `.github/workflows/deploy-cloudbase-function.yml`
- **前端：** `.github/workflows/deploy-cloudbase-hosting.yml`

### 控制台配置

1. CloudBase 环境升级到按量付费版
2. **静态网站托管** → **自定义域名**，绑定备案域名
3. 配置路径规则：
   - `/api/*` → 云函数 `api`
   - `/*` → `/index.html`（SPA 回退）

### 与方案 A 的差异

| 配置 | 方案 A（免费） | 方案 B（自定义域名） |
|------|--------------|-------------------|
| `ALLOWED_ORIGINS` | 静态托管默认域名 | 自定义域名 |
| `VITE_API_URL` | 自动获取 | 不配置 |
| `VITE_BASE_URL` | `./` | 不配置 |
| `VITE_ROUTER_TYPE` | `hash` | 不配置（BrowserRouter） |
| 跨域 | 是 | 否 |

---

## 方案 C：GitHub Pages 备选

| Secret | 值 |
|--------|-----|
| `ALLOWED_ORIGINS` | `https://your-username.github.io` |
| `VITE_API_URL` | `https://your-env-id.service.tcloudbase.com/api/trpc` |
| `VITE_BASE_URL` | `./` |
| `VITE_ROUTER_TYPE` | `hash` |

### 工作流

- **后端：** `.github/workflows/deploy-cloudbase-function.yml`
- **前端：** `.github/workflows/deploy-gh-pages.yml`

---

## CORS 说明

- **方案 A/C**：前后端不同域名，浏览器会触发 CORS。后端会根据 `ALLOWED_ORIGINS` 自动放行对应域名，并同步调整 CSP 的 `connect-src`。
- **方案 B**：前后端同域名，不会触发 CORS。`ALLOWED_ORIGINS` 仍建议配置为自定义域名作为安全层。

测试阶段 `ALLOWED_ORIGINS=*` 可用，生产环境建议配置为具体域名。

---

## 本地开发

```bash
npm run dev
```

本地开发无需配置 `VITE_API_URL`，前端通过 Vite 代理到后端。

## 本地验证

合并到 `main` 前请确保：

```bash
npm run check
npm run lint
npm run build
npm run build:function
```

CI 会在 PR 阶段执行这些检查。
