import "dotenv/config";

export const env = {
  isProduction: process.env.NODE_ENV === "production",
  // CloudBase configuration (API Key auth - simpler than TC3 signature)
  // 这是本游戏实际使用的唯一外部服务
  cloudbaseEnvId: process.env.CLOUDBASE_ENV_ID ?? "",
  cloudbaseApiKey: process.env.CLOUDBASE_API_KEY ?? "",
  // MySQL / Drizzle（当前游戏逻辑未使用，仅保留兼容）
  databaseUrl: process.env.DATABASE_URL ?? "",
  // CORS allowed origins, comma-separated; defaults to "*" if unset
  allowedOrigins: process.env.ALLOWED_ORIGINS ?? "",
};
