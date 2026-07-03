/**
 * 人生当铺 - CloudBase 数据库操作层
 * 基于 CloudBase HTTP API (RESTful) + 腾讯云签名 V3 认证
 * 零 SDK，纯 HTTP 调用
 */

import crypto from "crypto";
import {
  queryDocuments,
  insertDocuments,
  updateDocuments,
} from "./cloudbase-http";

// ─── Types ───

export interface RoomDoc {
  _id?: string;
  roomId: string;
  hostName: string;
  hostToken: string;
  status: "waiting" | "playing" | "finished";
  currentStage: number;
  currentEvent: string;
  stages: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface PlayerDoc {
  _id?: string;
  roomId: string;
  playerName: string;
  playerToken: string;
  baseCards: string[];
  pawnedCards: string[];
  acceptedEvents: number;
  lastActionAtStage: number;
  lastAction: "pawn" | "accept" | null;
  choices: { stageIndex: number; type: "accept" | "pawn"; cards: string[] }[];
  createdAt: Date;
  updatedAt: Date;
}

// ─── Game Data ───

export const ALL_CARDS = [
  "健康", "颜值", "才华", "梦想", "家人陪伴",
  "知心挚友", "安全感", "自信", "好奇心",
  "自由", "爱情", "财富", "幽默感", "责任心",
  "学习能力", "热情", "耐心", "正义感",
] as const;

export const STAGES = [
  { name: "童年", description: "人生最初的篇章，纯真而懵懂" },
  { name: "少年", description: "青春躁动，开始认识世界" },
  { name: "青年", description: "满怀理想，踏上人生征途" },
  { name: "中年", description: "责任与压力并存的人生中段" },
  { name: "暮年", description: "回望一生，沉淀智慧" },
] as const;

export const ADVERSITY_EVENTS: Record<number, string[]> = {
  0: ["父母离异，缺少家庭温暖", "被同学欺负，变得内向", "生了一场大病，休学半年", "家境贫寒，买不起喜欢的玩具"],
  1: ["高考失利，与梦想大学失之交臂", "初恋分手，心痛欲绝", "沉迷游戏，成绩一落千丈", "被朋友背叛，失去信任"],
  2: ["求职屡屡碰壁，怀疑人生", "创业失败，欠下债务", "被裁员，面临经济压力", "异地恋分手，孤独感袭来"],
  3: ["父母生病，需要大量精力和金钱", "职场瓶颈，晋升无望", "婚姻危机，感情出现裂痕", "孩子叛逆，家庭矛盾频发"],
  4: ["身体每况愈下，疾病缠身", "老友相继离去，孤独感加剧", "退休金不足，生活拮据", "子女远在他乡，无人陪伴"],
};

// ─── Helpers ───

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export function generateRoomId(): string {
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function dealCards(): string[] {
  return shuffle([...ALL_CARDS]).slice(0, 10);
}

export function getRandomEvent(stageIndex: number): string {
  const events = ADVERSITY_EVENTS[stageIndex] || ["人生无常，命运给你出了一道难题"];
  return events[Math.floor(Math.random() * events.length)];
}

// ─── Room Operations ───

const ROOMS_COLLECTION = "rooms";
const PLAYERS_COLLECTION = "players";

export async function createRoom(hostName: string): Promise<RoomDoc> {
  const roomId = generateRoomId();
  const room: Omit<RoomDoc, "_id"> = {
    roomId,
    hostName,
    hostToken: generateToken(),
    status: "waiting",
    currentStage: -1,
    currentEvent: "",
    stages: STAGES.map((s) => s.name),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { insertedIds } = await insertDocuments(ROOMS_COLLECTION, [room]);
  return { _id: insertedIds[0], ...room };
}

export async function getRoom(roomId: string): Promise<RoomDoc | null> {
  const docs = await queryDocuments(ROOMS_COLLECTION, { roomId });
  return (docs[0] as unknown as RoomDoc) || null;
}

export async function updateRoomStatus(
  roomId: string,
  updates: Partial<Pick<RoomDoc, "status" | "currentStage" | "currentEvent">>
): Promise<void> {
  const setData: Record<string, unknown> = { updatedAt: new Date() };
  if (updates.status !== undefined) setData.status = updates.status;
  if (updates.currentStage !== undefined) setData.currentStage = updates.currentStage;
  if (updates.currentEvent !== undefined) setData.currentEvent = updates.currentEvent;

  await updateDocuments(ROOMS_COLLECTION, { roomId }, { $set: setData });
}

// ─── Player Operations ───

export async function createPlayer(
  roomId: string,
  playerName: string
): Promise<PlayerDoc> {
  // 如果同名玩家已存在（例如刷新页面后重新加入），直接返回已有数据
  const existing = await queryDocuments(PLAYERS_COLLECTION, { roomId, playerName });
  if (existing.length > 0) {
    return existing[0] as unknown as PlayerDoc;
  }

  const player: Omit<PlayerDoc, "_id"> = {
    roomId,
    playerName,
    playerToken: generateToken(),
    baseCards: [],
    pawnedCards: [],
    acceptedEvents: 0,
    lastActionAtStage: -1,
    lastAction: null,
    choices: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const { insertedIds } = await insertDocuments(PLAYERS_COLLECTION, [player]);
  return { _id: insertedIds[0], ...player };
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

  await updateDocuments(
    PLAYERS_COLLECTION,
    { roomId, playerName },
    {
      $set: {
        baseCards: cards,
        updatedAt: new Date(),
      },
    }
  );

  return { ...player, baseCards: cards };
}

export async function getPlayer(
  roomId: string,
  playerName: string
): Promise<PlayerDoc | null> {
  const docs = await queryDocuments(PLAYERS_COLLECTION, { roomId, playerName });
  return (docs[0] as unknown as PlayerDoc) || null;
}

export async function listPlayersByRoom(roomId: string): Promise<PlayerDoc[]> {
  const docs = await queryDocuments(PLAYERS_COLLECTION, { roomId });
  return docs as unknown as PlayerDoc[];
}

export async function pawnCards(
  roomId: string,
  playerName: string,
  cards: string[],
  stageIndex: number
): Promise<{ baseCards: string[]; pawnedCards: string[] }> {
  const player = await getPlayer(roomId, playerName);
  if (!player) throw new Error("Player not found");

  for (const card of cards) {
    if (!player.baseCards.includes(card)) {
      throw new Error(`Player does not have card: ${card}`);
    }
  }

  const newBaseCards = player.baseCards.filter((c) => !cards.includes(c));
  const newPawnedCards = [...player.pawnedCards, ...cards];
  const newChoices = [
    ...(player.choices || []).filter((c) => c.stageIndex !== stageIndex),
    { stageIndex, type: "pawn" as const, cards },
  ];

  await updateDocuments(
    PLAYERS_COLLECTION,
    { roomId, playerName },
    {
      $set: {
        baseCards: newBaseCards,
        pawnedCards: newPawnedCards,
        lastActionAtStage: stageIndex,
        lastAction: "pawn",
        choices: newChoices,
        updatedAt: new Date(),
      },
    }
  );

  return { baseCards: newBaseCards, pawnedCards: newPawnedCards };
}

export async function acceptAdversity(
  roomId: string,
  playerName: string,
  stageIndex: number
): Promise<void> {
  const player = await getPlayer(roomId, playerName);
  if (!player) throw new Error("Player not found");

  const newChoices = [
    ...(player.choices || []).filter((c) => c.stageIndex !== stageIndex),
    { stageIndex, type: "accept" as const, cards: [] },
  ];

  await updateDocuments(
    PLAYERS_COLLECTION,
    { roomId, playerName },
    {
      $set: {
        acceptedEvents: (player.acceptedEvents || 0) + 1,
        lastActionAtStage: stageIndex,
        lastAction: "accept",
        choices: newChoices,
        updatedAt: new Date(),
      },
    }
  );
}
