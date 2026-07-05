/**
 * 本地内存存储实现（开发/演示 fallback）
 * 当没有配置 CloudBase 环境变量时自动启用。
 * 注意：数据仅在进程内存中，重启后丢失，仅用于本地体验。
 */

import type { RoomDoc, PlayerDoc } from "./cloudbase";
import { generateRoomId, generateToken } from "./cloudbase";

const rooms = new Map<string, RoomDoc>();
const players = new Map<string, PlayerDoc>();

function playerKey(roomId: string, playerName: string): string {
  return `${roomId}:${playerName}`;
}

export async function createRoom(hostName: string): Promise<RoomDoc> {
  const roomId = generateRoomId();
  const now = new Date();
  const room: RoomDoc = {
    _id: roomId,
    roomId,
    hostName,
    hostToken: generateToken(),
    status: "waiting",
    currentStage: -1,
    currentEvent: "",
    stages: ["童年", "少年", "青年", "中年", "暮年"],
    createdAt: now,
    updatedAt: now,
  };
  rooms.set(roomId, room);
  return room;
}

export async function getRoom(roomId: string): Promise<RoomDoc | null> {
  return rooms.get(roomId) ?? null;
}

export async function updateRoomStatus(
  roomId: string,
  updates: Partial<Pick<RoomDoc, "status" | "currentStage" | "currentEvent">>
): Promise<void> {
  const room = rooms.get(roomId);
  if (!room) {
    throw new Error("Room not found");
  }
  if (updates.status !== undefined) room.status = updates.status;
  if (updates.currentStage !== undefined) room.currentStage = updates.currentStage;
  if (updates.currentEvent !== undefined) room.currentEvent = updates.currentEvent;
  room.updatedAt = new Date();
}

export async function createPlayer(
  roomId: string,
  playerName: string
): Promise<PlayerDoc> {
  const key = playerKey(roomId, playerName);
  const existing = players.get(key);
  if (existing) {
    return existing;
  }

  const now = new Date();
  const player: PlayerDoc = {
    _id: key,
    roomId,
    playerName,
    playerToken: generateToken(),
    baseCards: [],
    pawnedCards: [],
    acceptedEvents: 0,
    lastActionAtStage: -1,
    lastAction: null,
    stageEvents: {},
    choices: [],
    createdAt: now,
    updatedAt: now,
  };

  players.set(key, player);
  return player;
}

export async function updatePlayerBaseCards(
  roomId: string,
  playerName: string,
  cards: string[]
): Promise<PlayerDoc> {
  const player = await getPlayer(roomId, playerName);
  if (!player) {
    throw new Error("Player not found");
  }
  player.baseCards = cards;
  player.updatedAt = new Date();
  return player;
}

export async function getPlayer(
  roomId: string,
  playerName: string
): Promise<PlayerDoc | null> {
  return players.get(playerKey(roomId, playerName)) ?? null;
}

export async function listPlayersByRoom(roomId: string): Promise<PlayerDoc[]> {
  return Array.from(players.values()).filter((p) => p.roomId === roomId);
}

export async function revealPlayerEvent(
  roomId: string,
  playerName: string,
  stageIndex: number
): Promise<string> {
  const player = await getPlayer(roomId, playerName);
  if (!player) {
    throw new Error("Player not found");
  }

  const existing = player.stageEvents?.[stageIndex];
  if (existing) return existing;

  const { getRandomEvent } = await import("./cloudbase");
  const event = getRandomEvent(stageIndex);
  player.stageEvents = { ...player.stageEvents, [stageIndex]: event };
  player.updatedAt = new Date();
  return event;
}

export async function pawnCards(
  roomId: string,
  playerName: string,
  cards: string[],
  stageIndex: number
): Promise<{ baseCards: string[]; pawnedCards: string[] }> {
  const player = await getPlayer(roomId, playerName);
  if (!player) {
    throw new Error("Player not found");
  }

  const event = player.stageEvents?.[stageIndex];
  if (!event) {
    throw new Error("本阶段尚未抽取挫折事件");
  }

  for (const card of cards) {
    if (!player.baseCards.includes(card)) {
      throw new Error(`Player does not have card: ${card}`);
    }
  }

  player.baseCards = player.baseCards.filter((c) => !cards.includes(c));
  player.pawnedCards = [...player.pawnedCards, ...cards];
  player.lastActionAtStage = stageIndex;
  player.lastAction = "pawn";
  player.choices = [
    ...(player.choices || []).filter((c) => c.stageIndex !== stageIndex),
    { stageIndex, type: "pawn", cards, event },
  ];
  player.updatedAt = new Date();

  return { baseCards: player.baseCards, pawnedCards: player.pawnedCards };
}

export async function acceptAdversity(
  roomId: string,
  playerName: string,
  stageIndex: number
): Promise<void> {
  const player = await getPlayer(roomId, playerName);
  if (!player) {
    throw new Error("Player not found");
  }

  const event = player.stageEvents?.[stageIndex];
  if (!event) {
    throw new Error("本阶段尚未抽取挫折事件");
  }

  player.acceptedEvents = (player.acceptedEvents || 0) + 1;
  player.lastActionAtStage = stageIndex;
  player.lastAction = "accept";
  player.choices = [
    ...(player.choices || []).filter((c) => c.stageIndex !== stageIndex),
    { stageIndex, type: "accept", cards: [], event },
  ];
  player.updatedAt = new Date();
}
