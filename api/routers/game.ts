import { z } from "zod";
import { createRouter, publicProcedure, throwAppError } from "../middleware";
import { getRoom, STAGES } from "../queries/store";
import { Errors } from "../../contracts/errors";
import { roomIdSchema } from "../lib/schemas";

export const gameRouter = createRouter({
  // Get current stage info for a room
  stageInfo: publicProcedure
    .input(z.object({ roomId: roomIdSchema }))
    .query(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }

      const stageIndex = room.currentStage;
      const stage = STAGES[stageIndex];
      if (!stage) {
        throwAppError(Errors.notFound("当前阶段不存在"));
      }

      // Events are now per-player; stageInfo only returns stage metadata.
      // The shared currentEvent field is kept for legacy room compatibility.
      return {
        ...stage,
        index: stageIndex,
        event: "",
      };
    }),

  // Get all stages info (for reference)
  allStages: publicProcedure.query(() => {
    return STAGES.map((s, i) => ({
      ...s,
      index: i,
    }));
  }),
});
