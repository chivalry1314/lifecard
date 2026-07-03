import app from "./app";
import { serve } from "@hono/node-server";

const port = parseInt(process.env.PORT || "9000");

serve({ fetch: app.fetch, port }, () => {
  console.log(`CloudBase HTTP function listening on port ${port}`);
});
