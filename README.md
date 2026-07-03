# 人生当铺

一款面向线下聚会的心理向卡牌游戏网页版。无需实体卡牌，扫码输入房间号即可加入，适合 4-12 人围坐一起玩。

> 人生就像一场当铺游戏：你手握 10 张代表珍贵事物的底牌，却在成长中不断遭遇命运的挫折。是「接受」它，还是用 2 张底牌「典当」来换取平安？每一轮选择，都是一次对价值观的审视。

## 功能特性

- **创建 / 加入房间**：主持人输入昵称创建房间，生成 6 位房间号；其他玩家输入房间号和昵称加入。
- **最近房间记录**：首页自动保存最近加入的房间，方便快速回到房间。
- **主持人控场**：只有主持人可以开始游戏、推进阶段、结束游戏。
- **五段人生旅程**：童年 → 少年 → 青年 → 中年 → 暮年，每阶段随机触发不同的挫折事件。
- **两种选择**：
  - **接受**：直面挫折，保留全部底牌。
  - **典当**：选择 2 张底牌抵消该阶段挫折。
- **全员行动后方可推进**：必须所有玩家在当前阶段做出选择，主持人才能进入下一阶段。
- **手动刷新同步**：不采用轮询，玩家通过点击「刷新」按钮获取最新房间状态，节省资源。
- **人生报告**：游戏结束后查看每位玩家保留率、已典当底牌、接受挫折次数及系统评语。
- **通知弹窗**：所有成功 / 失败 / 提示信息均以屏幕中央的模态弹窗显示，清晰醒目。
- **双存储后端**：
  - 配置 CloudBase 环境变量后，使用腾讯云 CloudBase 文档型数据库持久化数据。
  - 未配置时自动降级为本地 JSON 文件存储（数据保存在 `./data/`）。

## 技术栈

- **前端**：React 19 + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **后端**：tRPC + Hono + `@hono/node-server`
- **状态与请求**：TanStack Query + tRPC React Query
- **数据库**：腾讯云 CloudBase 文档型数据库（可选，未配置则使用本地 JSON）
- **路由**：React Router v7
- **序列化**：superjson
- **校验**：Zod

## 快速开始

### 环境要求

- Node.js >= 20
- npm >= 10

### 安装依赖

```bash
npm install
```

### 开发运行

```bash
npm run dev
```

默认启动在 http://localhost:3000，Vite 会自动尝试下一个可用端口。

### 本地存储模式

不配置 CloudBase 时，项目会自动使用本地 JSON 文件存储：

- 房间和玩家数据保存在 `./data/` 目录下。
- 该目录已加入 `.gitignore`，不会提交到仓库。

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建前端并打包后端入口 `dist/boot.js` |
| `npm run start` | 生产环境启动服务（需先执行 `build`） |
| `npm run check` | 运行 TypeScript 类型检查 |
| `npm run lint` | 运行 ESLint |
| `npm run format` | 使用 Prettier 格式化代码 |
| `npm run test` | 运行单元测试 |

## 项目结构

```
├── api/                    # 后端代码
│   ├── lib/                # 工具库（env、schemas）
│   ├── queries/            # 数据访问层
│   │   ├── cloudbase.ts    # CloudBase HTTP API 实现
│   │   ├── file-store.ts   # 本地 JSON 文件存储实现
│   │   ├── local-store.ts  # 内存存储实现
│   │   └── store.ts        # 统一存储入口，自动选择后端
│   ├── routers/            # tRPC 路由
│   │   ├── game.ts         # 游戏阶段信息
│   │   ├── player.ts       # 玩家相关操作
│   │   └── room.ts         # 房间相关操作
│   ├── boot.ts             # 生产环境启动入口
│   ├── context.ts          # tRPC 上下文
│   ├── middleware.ts       # tRPC 中间件与错误处理
│   └── router.ts           # tRPC 路由聚合
├── contracts/              # 前后端共享类型/错误定义
├── db/                     # Drizzle 相关（当前未启用 CloudBase 时不用）
├── src/                    # 前端代码
│   ├── components/         # React 组件
│   │   ├── room/           # 房间页子组件
│   │   └── ui/             # shadcn/ui 组件
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 前端工具库
│   ├── pages/              # 页面组件
│   ├── providers/          # 全局 Provider
│   ├── App.tsx             # 路由配置
│   └── main.tsx            # 应用入口
├── data/                   # 本地 JSON 存储目录（gitignore）
├── .env.example            # 环境变量示例
├── DEPLOY.md               # 部署指南
└── README.md               # 本文档
```

## 环境变量

复制 `.env.example` 为 `.env` 并按需填写：

| 变量名 | 说明 | 是否必填 |
|--------|------|---------|
| `CLOUDBASE_ENV_ID` | CloudBase 环境 ID | 否，留空则使用本地 JSON |
| `CLOUDBASE_API_KEY` | CloudBase 服务端 API Key | 否，留空则使用本地 JSON |
| `ALLOWED_ORIGINS` | 生产环境 CORS 允许来源，多个用逗号分隔 | 否，留空则允许所有来源 |

> **注意**：`.env` 文件包含真实凭证，请勿提交到 Git。仓库已配置 `.gitignore` 忽略 `.env` 和 `data/`。

## 游戏流程

1. **创建房间**：主持人进入首页，输入昵称后创建房间，获得 6 位房间号与主持权限。
2. **加入房间**：其他玩家输入房间号和昵称加入；主持人自己也需以玩家身份加入才能参与选择。
3. **开始游戏**：在场人数 ≥ 2 时，主持人点击「开始游戏」。
4. **经历人生**：
   - 游戏共 5 个阶段：童年、少年、青年、中年、暮年。
   - 每阶段随机出现一则挫折事件。
   - 每位玩家选择「接受」或「典当 2 张底牌」。
5. **推进阶段**：当所有玩家都完成选择后，主持人才能点击「下一阶段」。
6. **查看报告**：第 5 阶段结束后进入「人生报告」，查看每个人的保留率、典当记录与系统评语。

## 部署

详细部署步骤请参考 [DEPLOY.md](./DEPLOY.md)。

推荐方案（完全免费）：

- 后端：**CloudBase HTTP 云函数**
- 数据库：**CloudBase NoSQL**
- 前端：**GitHub Pages**

本地自托管：

```bash
npm run build
npm start
```

默认监听 `3000` 端口。无论哪种方式，都需要配置 `CLOUDBASE_ENV_ID` 和 `CLOUDBASE_API_KEY`。

## 注意事项

- 本游戏设计为**线下聚会场景**，建议所有玩家在同一空间内，由主持人统一节奏。
- 玩家状态**不会自动实时同步**，需要点击页面中的「刷新」按钮查看最新状态。
- 一局游戏建议 4-12 人参与，时长约 40-60 分钟。
- 主持令牌和玩家令牌会保存在浏览器 `localStorage` 中，刷新页面或重新进入同一房间时会自动恢复身份。

## 开源协议

MIT
