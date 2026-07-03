import { z } from "zod";
import { createRouter, publicProcedure, throwAppError } from "../middleware";
import {
  createRoom,
  getRoom,
  updateRoomStatus,
  getRandomEvent,
  listPlayersByRoom,
  STAGES,
} from "../queries/store";
import { Errors } from "../../contracts/errors";
import { nameSchema, roomIdSchema } from "../lib/schemas";

export const roomRouter = createRouter({
  // Create a new room
  create: publicProcedure
    .input(z.object({ hostName: nameSchema }))
    .mutation(async ({ input }) => {
      const room = await createRoom(input.hostName);
      return { roomId: room.roomId, hostToken: room.hostToken };
    }),

  // Get room by roomId
  get: publicProcedure
    .input(z.object({ roomId: roomIdSchema }))
    .query(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }
      return room;
    }),

  // Start the game
  start: publicProcedure
    .input(
      z.object({
        roomId: roomIdSchema,
        hostToken: z.string().min(1, "主持人令牌不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }
      if (room.hostToken !== input.hostToken) {
        throwAppError(Errors.forbidden("只有主持人可以开始游戏"));
      }
      if (room.status !== "waiting") {
        throwAppError(Errors.badRequest("游戏已经开始或已结束"));
      }

      const players = await listPlayersByRoom(input.roomId);
      if (players.length < 2) {
        throwAppError(Errors.badRequest("至少需要 2 名玩家才能开始游戏"));
      }

      const notReady = players.filter((p) => p.baseCards.length !== 10);
      if (notReady.length > 0) {
        throwAppError(
          Errors.badRequest(`还有 ${notReady.length} 位玩家未选择初始底牌`)
        );
      }

      const currentEvent = getRandomEvent(0);
      await updateRoomStatus(input.roomId, {
        status: "playing",
        currentStage: 0,
        currentEvent,
      });
      return { success: true, currentEvent };
    }),

  // Advance to next stage
  nextStage: publicProcedure
    .input(
      z.object({
        roomId: roomIdSchema,
        hostToken: z.string().min(1, "主持人令牌不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }
      if (room.hostToken !== input.hostToken) {
        throwAppError(Errors.forbidden("只有主持人可以推进阶段"));
      }
      if (room.status !== "playing") {
        throwAppError(Errors.badRequest("游戏不在进行中"));
      }

      const players = await listPlayersByRoom(input.roomId);
      const pendingPlayers = players.filter(
        (p) => p.lastActionAtStage !== room.currentStage
      );
      if (pendingPlayers.length > 0) {
        throwAppError(
          Errors.badRequest(
            `还有 ${pendingPlayers.length} 位玩家未在本阶段做出选择`
          )
        );
      }

      const nextStage = room.currentStage + 1;

      if (nextStage >= STAGES.length) {
        await updateRoomStatus(input.roomId, { status: "finished" });
        return { finished: true, stage: room.currentStage };
      }

      const currentEvent = getRandomEvent(nextStage);
      await updateRoomStatus(input.roomId, {
        currentStage: nextStage,
        currentEvent,
      });
      return { finished: false, stage: nextStage, currentEvent };
    }),

  // Finish the game
  finish: publicProcedure
    .input(
      z.object({
        roomId: roomIdSchema,
        hostToken: z.string().min(1, "主持人令牌不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }
      if (room.hostToken !== input.hostToken) {
        throwAppError(Errors.forbidden("只有主持人可以结束游戏"));
      }
      await updateRoomStatus(input.roomId, { status: "finished" });
      return { success: true };
    }),
});
