# 人生当铺 - 部署指南

## 项目简介

「人生当铺」网页版，一款面向线下聚会的心理向卡牌游戏。无需实体卡牌，扫码输入房间号即可加入，适合 4-12 人围坐一起玩。

## 技术栈

- 前端：React + TypeScript + Tailwind CSS + shadcn/ui
- 后端：tRPC + Hono
- 数据库：腾讯云 CloudBase NoSQL（免费版）
- 部署：腾讯云 CloudBase（静态网站托管 + HTTP 云函数）

## 当前主方案

当前项目默认使用 **方案 A：CloudBase 完全免费默认域名**。push 到 `main` 时只会自动部署此方案。

GitHub Pages 和自定义域名方案已改为手动触发，如需启用请修改对应 workflow 文件。

## 部署方案选择

| 方案 | 域名 | 是否跨域 | 是否需要备案 | 成本 | 当前状态 |
|------|------|---------|-------------|------|---------|
| **方案 A：完全免费默认域名** | CloudBase 默认域名 | 跨域 | 不需要 | ¥0 | **自动部署** |
| **方案 B：一体化自定义域名** | 已备案自定义域名 | 不跨域 | 需要 | ¥0~几块钱/月 | 手动触发 |
| **方案 C：GitHub Pages 备选** | GitHub Pages + CloudBase | 跨域 | 不需要 | ¥0 | 手动触发 |

---

## 推荐方案 A：完全免费默认域名（无需备案）

```
CloudBase 静态托管默认域名
        │  API 请求（跨域）
        ▼
CloudBase HTTP 云函数默认域名
        │
        ▼
CloudBase NoSQL 数据库
```

**优点：** 完全免费，无需备案，一键部署。  
**缺点：** 前后端使用不同默认域名，会触发浏览器跨域（后端已自动处理 CORS）。

### 1. 前置准备

1. **开通 CloudBase 免费版环境**
   - 进入 [云开发 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
   - 点击"免费开通环境"，记录 **环境 ID**（EnvId）

2. **创建服务端 API Key**
   - 控制台 → **环境设置** → **API Key 管理** → **创建服务端 API Key**
   - 复制 API Key（仅显示一次）

3. **创建数据库集合**
   - 控制台 → **数据库** → 创建 `rooms` 和 `players` 集合

### 2. 配置 GitHub Secrets

| Secret 名 | 说明 |
|-----------|------|
| `TENCENT_CLOUD_SECRET_ID` | 腾讯云 API 密钥 SecretId |
| `TENCENT_CLOUD_SECRET_KEY` | 腾讯云 API 密钥 SecretKey |
| `TCB_ENV_ID` | CloudBase 环境 ID |
| `CLOUDBASE_API_KEY` | CloudBase 服务端 API Key |
| `ALLOWED_ORIGINS` | 前端默认域名，首次可填 `*`，获取真实域名后再更新 |

### 3. 一键部署

push 到 `main`，`.github/workflows/deploy-cloudbase-free.yml` 会自动完成：

1. 构建并部署 CloudBase HTTP 云函数
2. 获取云函数默认访问 URL
3. 用该 URL 重新构建前端
4. 部署前端到 CloudBase 静态网站托管

### 4. 获取前端域名并更新 CORS

部署完成后：

1. 进入 CloudBase 控制台 → **静态网站托管**
2. 查看默认访问域名，例如 `https://your-env-id-xxx.tcloudbaseapp.com`
3. 将该域名填入 GitHub Secrets 的 `ALLOWED_ORIGINS`
4. 重新触发 `deploy-cloudbase-free.yml` workflow

> 测试阶段 `ALLOWED_ORIGINS=*` 也可用，但不建议长期用于生产。

---

## 推荐方案 B：CloudBase 一体化自定义域名

```
自定义域名（需 ICP 备案）
        │
        ├── /              → CloudBase 静态网站托管（前端）
        └── /api/*         → CloudBase HTTP 云函数（后端）
                                │
                                ▼
                        CloudBase NoSQL 数据库
```

**优点：** 同域名不跨域，国内访问最快。  
**缺点：** 需要已备案的自定义域名。

### 部署步骤

1. 完成 CloudBase 环境准备（同上）
2. 环境升级到按量付费版（绑定自定义域名需要）
3. 在 GitHub Secrets 配置：
   - `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`
   - `TCB_ENV_ID`
   - `CLOUDBASE_API_KEY`
   - `ALLOWED_ORIGINS`：你的自定义域名，例如 `https://lifecard.example.com`
4. push 到 `main`：
   - `.github/workflows/deploy-cloudbase-function.yml` 部署后端
   - `.github/workflows/deploy-cloudbase-hosting.yml` 部署前端
5. 在 CloudBase 控制台绑定备案域名，配置路径规则：
   - `/api/*` → 云函数 `api`
   - `/*` → `/index.html`（SPA 回退）

---

## 备选方案 C：CloudBase 云函数 + GitHub Pages

如果你不想用 CloudBase 静态托管，可以继续用 GitHub Pages：

1. 完成 CloudBase 环境准备
2. 在 GitHub Secrets 配置：
   - `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`
   - `TCB_ENV_ID`
   - `CLOUDBASE_API_KEY`
   - `ALLOWED_ORIGINS`：你的 GitHub Pages 域名
3. push 到 `main`，部署 CloudBase HTTP 云函数
4. 拿到云函数 URL 后，填入 `VITE_API_URL` Secret
5. 触发 `.github/workflows/deploy-gh-pages.yml` 部署前端

> 此方案 GitHub Pages 国内访问不稳定，仅作备选。

---

## 本地开发

```bash
npm run dev
```

本地开发时前端走 `/api/trpc`，Vite 会代理到后端，无需配置 `VITE_API_URL`。

## 本地测试云函数产物

```bash
npm run build:function
PORT=9000 NODE_ENV=production node cloudfunctions/api/index.js
```

然后访问 `http://localhost:9000/api/trpc/ping` 测试。

## 环境变量说明

| 变量名 | 说明 | 一体化方案 | 免费默认域名方案 |
|--------|------|-----------|----------------|
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID | 需要 | 需要 |
| `CLOUDBASE_API_KEY` | 服务端 API Key | 需要 | 需要 |
| `ALLOWED_ORIGINS` | CORS 允许来源 | 自定义域名 | 静态托管默认域名 |
| `VITE_API_URL` | 前端请求的后端地址 | 不配置 | 自动获取 |
| `VITE_BASE_URL` | 静态资源基础路径 | 不配置 | `./` |
| `VITE_ROUTER_TYPE` | 路由模式 | 留空（BrowserRouter） | `hash` |

## 免费额度说明

- **CloudBase 免费体验版**：每月 3000 资源点，足够本项目低频使用
- **CloudBase HTTP 云函数**：按调用次数和执行时间计费，小流量基本在免费额度内
- **CloudBase 静态网站托管**：有免费容量和 CDN 流量额度
- **GitHub Pages**：完全免费

## 游戏玩法

1. **创建房间**：输入昵称，生成 6 位房间号
2. **分享房间**：告诉朋友房间号，或让他们扫码加入
3. **开始游戏**：主持人点击"开始游戏"
4. **经历人生**：5 个阶段（童年→少年→青年→中年→暮年），每阶段随机遭遇挫折
5. **做出选择**：
   - **接受**：保留底牌，直面挫折
   - **典当**：选择 2 张底牌抵消挫折
6. **查看报告**：游戏结束后查看人生档案，分享感悟

## 注意事项

- 本游戏设计为**线下聚会场景**，所有玩家在同一空间内
- 游戏节奏由主持人控制（推进阶段）
- 玩家状态不会实时同步，需要点击"刷新"查看最新状态
- 建议 4-12 人参与，一局约 40-60 分钟
