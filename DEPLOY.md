# 人生当铺 - 部署指南

## 项目简介

「人生当铺」网页版，一款面向线下聚会的心理向卡牌游戏。无需实体卡牌，扫码输入房间号即可加入，适合 4-12 人围坐一起玩。

## 技术栈

- 前端：React + TypeScript + Tailwind CSS + shadcn/ui
- 后端：tRPC + Hono（部署为 EdgeOne Pages Cloud Functions）
- 数据库：腾讯云 CloudBase NoSQL（免费版）
- 部署：EdgeOne Pages（无需备案）

## 当前部署架构

当前主方案是 **EdgeOne Pages**，GitHub Pages 方案保留为手动触发的备选。

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
- 前后端同域名，**无需处理跨域**
- 不需要 ICP 备案
- 全球边缘节点加速
- 小流量在免费额度内

> 如果 EdgeOne 方案跑不通，可以手动触发 GitHub Pages 备选方案。

## 部署前准备

### 1. 注册腾讯云账号并完成实名认证

访问 [腾讯云官网](https://cloud.tencent.com/) 注册账号并完成实名认证。

### 2. 开通 CloudBase 环境

1. 进入 [云开发 CloudBase 控制台](https://console.cloud.tencent.com/tcb)
2. 免费开通环境，记录 **环境 ID**（EnvId）
3. 创建服务端 API Key：控制台 → **环境设置** → **API Key 管理** → **创建服务端 API Key**
4. 创建数据库集合 `rooms` 和 `players`

### 3. 开通 EdgeOne Pages

1. 进入 [EdgeOne Pages 控制台](https://console.cloud.tencent.com/edgeone/pages)
2. 点击**创建项目** → **导入 Git 仓库**
3. 授权 GitHub 并选择本仓库

## 部署步骤

### 方式一：EdgeOne Pages（推荐，无需备案）

1. 完成上述 CloudBase 环境准备
2. 在 EdgeOne Pages 控制台创建项目，导入 GitHub 仓库
3. 构建配置（通常会自动识别 `edgeone.json`）：
   - 构建命令：`npm run build:edgeone`
   - 输出目录：`dist/public`
4. 在 EdgeOne Pages 控制台 → **环境变量与密钥**，添加：
   - `CLOUDBASE_ENV_ID`：CloudBase 环境 ID
   - `CLOUDBASE_API_KEY`：CloudBase 服务端 API Key
   - `ALLOWED_ORIGINS`：你的 EdgeOne Pages 默认域名（可先填 `*`，部署后改为真实域名）
5. 点击部署

> 后端函数入口为 `cloud-functions/api/[[default]].js`，由 `edgeone/api.ts` 打包生成。

### 方式二：GitHub Pages + CloudBase 云函数（手动触发备选）

> 此方案保留为备选，需要手动触发两个 workflow。当前 CloudBase HTTP 函数在免费版有访问问题，建议优先使用 EdgeOne Pages 方案。

1. 完成 CloudBase 环境准备
2. 在 GitHub Secrets 配置：
   - `TENCENT_CLOUD_SECRET_ID`、`TENCENT_CLOUD_SECRET_KEY`
   - `TCB_ENV_ID`
   - `CLOUDBASE_API_KEY`
   - `ALLOWED_ORIGINS`：GitHub Pages 域名
3. 手动触发 `.github/workflows/deploy-cloudbase-function.yml` 部署后端
4. 拿到云函数 URL 后填入 `VITE_API_URL` Secret
5. 手动触发 `.github/workflows/deploy-gh-pages.yml` 部署前端

### 方式三：自有服务器

```bash
npm run build
npm start
```

默认监听 3000 端口。

## 环境变量说明

| 变量名 | 说明 | EdgeOne Pages | GitHub Pages 方案 |
|--------|------|--------------|------------------|
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID | 必需 | 必需 |
| `CLOUDBASE_API_KEY` | 服务端 API Key | 必需 | 必需 |
| `ALLOWED_ORIGINS` | CORS 允许来源 | 建议配置 | 必需 |
| `VITE_API_URL` | 前端独立部署时的后端地址 | 不配置 | 必需 |

## 免费额度说明

- **EdgeOne Pages**：静态托管和 Cloud Functions 均有免费额度
- **CloudBase 免费体验版**：每月 3000 资源点，足够本项目低频使用
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
