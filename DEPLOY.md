# 人生当铺 - 部署指南

## 项目简介

「人生当铺」网页版，一款面向线下聚会的心理向卡牌游戏。无需实体卡牌，扫码输入房间号即可加入，适合 4-12 人围坐一起玩。

## 技术栈

- 前端：React + TypeScript + Tailwind CSS + shadcn/ui
- 后端：tRPC + Hono
- 数据库：腾讯云 CloudBase NoSQL（免费版）
- 部署：CloudBase HTTP 云函数 + GitHub Pages

## 部署前准备

### 1. 注册腾讯云账号并完成实名认证

访问 [腾讯云官网](https://cloud.tencent.com/) 注册账号并完成实名认证。

### 2. 开通 CloudBase 免费体验版

1. 进入 [云开发 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 勾选服务条款，点击"免费开发"或"免费开通环境"
3. 记录**环境 ID**（EnvId）

### 3. 创建服务端 API Key（推荐）

> 这是 CloudBase 推荐的**服务端认证方式**，一个 Key 搞定，无需计算签名。

1. 在 CloudBase 控制台 → **环境设置** → **API Key 管理**
2. 点击 **「创建服务端 API Key」**
3. 输入名称（如 `人生当铺`），选择过期时间（可选长期有效）
4. 创建成功后，**立即复制 API Key**（仅显示一次！）

### 4. 创建数据库集合

在 CloudBase 控制台 → **数据库** → **集合列表** 中，创建：

- `rooms` - 房间信息
- `players` - 玩家信息

无需预设字段结构，文档型数据库会自动适应。

## 自动化部署

详细 CI/CD 方案请见 [CI_CD.md](./CI_CD.md)。

## 部署步骤

### 方式一：CloudBase HTTP 云函数 + GitHub Pages（推荐，完全免费）

1. 按上文完成 CloudBase 环境准备并创建 API Key
2. 在 GitHub 仓库添加 Secrets：
   - `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`
   - `TCB_ENV_ID`
   - `CLOUDBASE_API_KEY`
   - `ALLOWED_ORIGINS`（你的 GitHub Pages 域名）
3. push 到 `main`，`.github/workflows/deploy-cloudbase-function.yml` 会自动部署 HTTP 云函数
4. 拿到云函数 URL 后，填入 `VITE_API_URL` Secret
5. 再次触发 `.github/workflows/deploy-gh-pages.yml`，前端自动部署到 GitHub Pages

> 云函数使用 `scf_bootstrap` 启动 Node 服务，监听 **9000 端口**。产物为 `cloudfunctions/api/index.js`。

### 方式二：部署到自有服务器

1. 构建项目：

```bash
npm run build
```

2. 设置环境变量（参考 `.env.example`）

3. 启动服务：

```bash
npm start
```

默认监听 3000 端口。

## 环境变量说明

| 变量名 | 说明 | 获取位置 |
|--------|------|---------|
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID | CloudBase 控制台首页 |
| `CLOUDBASE_API_KEY` | 服务端 API Key | CloudBase 控制台 → API Key 管理 |
| `ALLOWED_ORIGINS` | CORS 允许的前端域名（多个用逗号分隔） | 你的前端域名 |
| `VITE_API_URL` | 前端独立部署时的后端 API 地址 | 云函数 HTTP 访问地址 |
| `VITE_ROUTER_TYPE` | `hash` 表示使用 HashRouter（静态托管），留空为 BrowserRouter | — |

## 免费额度说明

- **CloudBase 免费体验版**：每月 3000 资源点，足够本项目低频使用
- **CloudBase HTTP 云函数**：按调用次数和执行时间计费，小流量基本在免费额度内
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
