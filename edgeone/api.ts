import app from "../api/app";

export async function onRequest(context: { request: Request }) {
  return app.fetch(context.request);
}
