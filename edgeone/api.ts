import app from "../api/app";

export async function onRequest(context: { request: Request }) {
  const { request } = context;

  // EdgeOne Pages 传入的 Request 可能缺少 signal，
  // 而 Hono/tRPC 内部会使用 AbortSignal.any()，导致 TypeError。
  // 如果 signal 不存在，用 AbortController 构造一个合法的 signal。
  if (!request.signal) {
    const controller = new AbortController();
    const patchedRequest = new Request(request, { signal: controller.signal });
    return app.fetch(patchedRequest);
  }

  return app.fetch(request);
}
