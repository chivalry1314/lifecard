import { initTRPC, TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import type { AppError } from "../contracts/errors";

function formatErrorMessage(error: TRPCError): string {
  const { code, message } = error;

  // Format Zod validation errors
  const cause = error.cause;
  if (cause instanceof ZodError) {
    const issues = cause.issues;
    if (issues.length > 0) {
      return issues.map((issue) => issue.message).join("；");
    }
    return "输入参数校验失败";
  }

  // Translate default tRPC messages to Chinese
  if (message === "Internal server error") {
    return "服务器内部错误，请稍后再试";
  }
  if (message === "Not found") {
    return "请求的资源不存在";
  }
  if (message === "Bad request") {
    return "请求参数不正确";
  }
  if (message === "Unauthorized") {
    return "请先登录";
  }
  if (message === "Forbidden") {
    return "没有权限执行该操作";
  }

  // Use the original message for our custom errors and fallback by code
  if (message) {
    return message;
  }

  const codeMessages: Record<string, string> = {
    BAD_REQUEST: "请求参数不正确",
    UNAUTHORIZED: "请先登录",
    FORBIDDEN: "没有权限执行该操作",
    NOT_FOUND: "请求的资源不存在",
    INTERNAL_SERVER_ERROR: "服务器内部错误，请稍后再试",
  };

  return codeMessages[code] ?? "请求处理失败";
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      message: formatErrorMessage(error),
    };
  },
});

export const createRouter = t.router;
export const publicProcedure = t.procedure;

export function throwAppError(error: AppError): never {
  const code =
    error.status === 401
      ? "UNAUTHORIZED"
      : error.status === 403
        ? "FORBIDDEN"
        : error.status === 404
          ? "NOT_FOUND"
          : error.status === 400
            ? "BAD_REQUEST"
            : "INTERNAL_SERVER_ERROR";
  throw new TRPCError({ code, message: error.message });
}
