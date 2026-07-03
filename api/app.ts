import { Hono, type Context } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

const app = new Hono<{ Bindings: HttpBindings }>();

// Reasonable body limit for tRPC JSON requests
app.use(bodyLimit({ maxSize: 1024 * 1024 }));

// CORS: allow same-origin by default; configurable via ALLOWED_ORIGINS in production
const allowedOrigins = env.allowedOrigins
  ? env.allowedOrigins.split(",").map((o) => o.trim())
  : "*";

// Build CSP connect-src list: always allow same-origin; if specific origins are
// configured (e.g. GitHub Pages frontend -> separate backend), allow them too.
const connectSrc = ["'self'"];
if (typeof allowedOrigins === "string") {
  // wildcard origin — allow any host in CSP too
  connectSrc.push("*");
} else {
  connectSrc.push(...allowedOrigins);
}

// Security headers for all responses
app.use(
  secureHeaders({
    contentSecurityPolicy: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:"],
      connectSrc,
      fontSrc: ["'self'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
      frameAncestors: ["'none'"],
    },
    xFrameOptions: "DENY",
    xContentTypeOptions: "nosniff",
    referrerPolicy: "strict-origin-when-cross-origin",
    strictTransportSecurity:
      env.isProduction
        ? "max-age=63072000; includeSubDomains; preload"
        : undefined,
  })
);

// Credentials require a concrete Access-Control-Allow-Origin value.
// When ALLOWED_ORIGINS='*', reflect the request origin so cookies still work.
const corsOrigin: string | string[] | ((origin: string, c: Context) => string) =
  typeof allowedOrigins === "string"
    ? (origin) => origin || "*"
    : allowedOrigins;

app.use(
  cors({
    origin: corsOrigin,
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;
