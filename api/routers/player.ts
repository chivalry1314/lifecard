import { z } from "zod";
import { createRouter, publicProcedure, throwAppError } from "../middleware";
import {
  createPlayer,
  getRoom,
  getPlayer,
  listPlayersByRoom,
  pawnCards,
  acceptAdversity,
  ALL_CARDS,
} from "../queries/store";
import { Errors } from "../../contracts/errors";
import { nameSchema, roomIdSchema } from "../lib/schemas";

const cardSchema = z
  .array(z.string())
  .length(2, "必须选择 2 张卡牌")
  .refine(
    (cards) => cards.every((card) => ALL_CARDS.includes(card as never)),
    { message: "包含无效的卡牌" }
  );

export const playerRouter = createRouter({
  // Join a room (create player)
  join: publicProcedure
    .input(
      z.object({
        roomId: roomIdSchema,
        playerName: nameSchema,
      })
    )
    .mutation(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }
      if (room.status === "finished") {
        throwAppError(Errors.badRequest("游戏已结束，无法加入"));
      }
      const player = await createPlayer(input.roomId, input.playerName);
      return { playerId: player._id, playerToken: player.playerToken };
    }),

  // Get player by roomId and playerName (requires player token)
  get: publicProcedure
    .input(
      z.object({
        roomId: roomIdSchema,
        playerName: nameSchema,
        playerToken: z.string().min(1, "玩家令牌不能为空"),
      })
    )
    .query(async ({ input }) => {
      const player = await getPlayer(input.roomId, input.playerName);
      if (!player) {
        throwAppError(Errors.notFound("玩家不存在"));
      }
      if (player.playerToken !== input.playerToken) {
        throwAppError(Errors.forbidden("玩家身份验证失败"));
      }
      return player;
    }),

  // Get all players in a room
  listByRoom: publicProcedure
    .input(z.object({ roomId: roomIdSchema }))
    .query(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }
      return listPlayersByRoom(input.roomId);
    }),

  // Pawn cards (give up 2 cards to avoid adversity)
  pawn: publicProcedure
    .input(
      z.object({
        roomId: roomIdSchema,
        playerName: nameSchema,
        playerToken: z.string().min(1, "玩家令牌不能为空"),
        cards: cardSchema,
      })
    )
    .mutation(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }
      if (room.status !== "playing" || room.currentStage < 0) {
        throwAppError(Errors.badRequest("游戏尚未开始或已结束"));
      }

      const player = await getPlayer(input.roomId, input.playerName);
      if (!player) {
        throwAppError(Errors.notFound("玩家不存在"));
      }
      if (player.playerToken !== input.playerToken) {
        throwAppError(Errors.forbidden("玩家身份验证失败"));
      }
      if (player.lastActionAtStage === room.currentStage) {
        throwAppError(Errors.badRequest("本阶段已经做出过选择"));
      }

      return pawnCards(
        input.roomId,
        input.playerName,
        input.cards,
        room.currentStage
      );
    }),

  // Accept adversity (keep cards but mark as accepted)
  accept: publicProcedure
    .input(
      z.object({
        roomId: roomIdSchema,
        playerName: nameSchema,
        playerToken: z.string().min(1, "玩家令牌不能为空"),
      })
    )
    .mutation(async ({ input }) => {
      const room = await getRoom(input.roomId);
      if (!room) {
        throwAppError(Errors.notFound("房间不存在"));
      }
      if (room.status !== "playing" || room.currentStage < 0) {
        throwAppError(Errors.badRequest("游戏尚未开始或已结束"));
      }

      const player = await getPlayer(input.roomId, input.playerName);
      if (!player) {
        throwAppError(Errors.notFound("玩家不存在"));
      }
      if (player.playerToken !== input.playerToken) {
        throwAppError(Errors.forbidden("玩家身份验证失败"));
      }
      if (player.lastActionAtStage === room.currentStage) {
        throwAppError(Errors.badRequest("本阶段已经做出过选择"));
      }

      await acceptAdversity(
        input.roomId,
        input.playerName,
        room.currentStage
      );
      return { success: true };
    }),
});
