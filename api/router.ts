import { createRouter, publicProcedure } from "./middleware";
import { roomRouter } from "./routers/room";
import { playerRouter } from "./routers/player";
import { gameRouter } from "./routers/game";

export const appRouter = createRouter({
  ping: publicProcedure.query(() => ({ ok: true, ts: Date.now() })),
  room: roomRouter,
  player: playerRouter,
  game: gameRouter,
});

export type AppRouter = typeof appRouter;
