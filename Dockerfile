# 人生当铺 - CloudBase 云托管 Dockerfile
# 构建前后端一体化镜像，生产环境由 dist/boot.js 同时提供 API 和前端静态资源

FROM node:22-alpine AS builder

WORKDIR /app

# 先复制依赖文件，利用 Docker 缓存层
COPY package*.json ./
RUN npm ci

# 复制源码并构建
COPY . .
RUN npm run build

# ─────────────────────────────────────────
# 生产镜像
# ─────────────────────────────────────────
FROM node:22-alpine

WORKDIR /app

# 仅安装生产依赖
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# 复制构建产物
COPY --from=builder /app/dist ./dist

# CloudBase 云托管默认通过环境变量 PORT 暴露端口
ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

CMD ["node", "dist/boot.js"]
