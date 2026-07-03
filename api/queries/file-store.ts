/**
 * JSON 文件存储实现
 * 数据持久化在 ./data/rooms.json 和 ./data/players.json
 * 不依赖任何外部云服务，适合本地体验或自有服务器部署。
 */

import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import type { RoomDoc, PlayerDoc } from "./cloudbase";
import { generateRoomId, generateToken, dealCards } from "./cloudbase";

const DATA_DIR = path.resolve(process.cwd(), "data");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");
const PLAYERS_FILE = path.join(DATA_DIR, "players.json");

let rooms: RoomDoc[] = [];
let players: PlayerDoc[] = [];
let initialized = false;
let writePromise: Promise<void> = Promise.resolve();

function dateReviver(_key: string, value: unknown): unknown {
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
    return new Date(value);
  }
  return value;
}

async function ensureInit() {
  if (initialized) return;
  await mkdir(DATA_DIR, { recursive: true });

  try {
    const roomsData = await readFile(ROOMS_FILE, "utf-8");
    rooms = JSON.parse(roomsData, dateReviver);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    rooms = [];
  }

  try {
    const playersData = await readFile(PLAYERS_FILE, "utf-8");
    players = JSON.parse(playersData, dateReviver);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
    players = [];
  }

  initialized = true;
}

async function save() {
  writePromise = writePromise.then(async () => {
    await mkdir(DATA_DIR, { recursive: true });
    await Promise.all([
      writeFile(ROOMS_FILE, JSON.stringify(rooms, null, 2)),
      writeFile(PLAYERS_FILE, JSON.stringify(players, null, 2)),
    ]);
  });
  await writePromise;
}

export async function createRoom(hostName: string): Promise<RoomDoc> {
  await ensureInit();
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
  rooms.push(room);
  await save();
  return room;
}

export async function getRoom(roomId: string): Promise<RoomDoc | null> {
  await ensureInit();
  return rooms.find((r) => r.roomId === roomId) ?? null;
}

export async function updateRoomStatus(
  roomId: string,
  updates: Partial<Pick<RoomDoc, "status" | "currentStage" | "currentEvent">>
): Promise<void> {
  await ensureInit();
  const room = rooms.find((r) => r.roomId === roomId);
  if (!room) {
    throw new Error("Room not found");
  }
  if (updates.status !== undefined) room.status = updates.status;
  if (updates.currentStage !== undefined) room.currentStage = updates.currentStage;
  if (updates.currentEvent !== undefined) room.currentEvent = updates.currentEvent;
  room.updatedAt = new Date();
  await save();
}

export async function createPlayer(
  roomId: string,
  playerName: string
): Promise<PlayerDoc> {
  await ensureInit();
  const existing = players.find(
    (p) => p.roomId === roomId && p.playerName === playerName
  );
  if (existing) {
    return existing;
  }

  const now = new Date();
  const player: PlayerDoc = {
    _id: `${roomId}:${playerName}`,
    roomId,
    playerName,
    playerToken: generateToken(),
    baseCards: dealCards(),
    pawnedCards: [],
    acceptedEvents: 0,
    lastActionAtStage: -1,
    lastAction: null,
    choices: [],
    createdAt: now,
    updatedAt: now,
  };

  players.push(player);
  await save();
  return player;
}

export async function getPlayer(
  roomId: string,
  playerName: string
): Promise<PlayerDoc | null> {
  await ensureInit();
  return (
    players.find((p) => p.roomId === roomId && p.playerName === playerName) ?? null
  );
}

export async function listPlayersByRoom(roomId: string): Promise<PlayerDoc[]> {
  await ensureInit();
  return players.filter((p) => p.roomId === roomId);
}

export async function pawnCards(
  roomId: string,
  playerName: string,
  cards: string[],
  stageIndex: number
): Promise<{ baseCards: string[]; pawnedCards: string[] }> {
  await ensureInit();
  const player = await getPlayer(roomId, playerName);
  if (!player) {
    throw new Error("Player not found");
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
    { stageIndex, type: "pawn", cards },
  ];
  player.updatedAt = new Date();
  await save();

  return { baseCards: player.baseCards, pawnedCards: player.pawnedCards };
}

export async function acceptAdversity(
  roomId: string,
  playerName: string,
  stageIndex: number
): Promise<void> {
  await ensureInit();
  const player = await getPlayer(roomId, playerName);
  if (!player) {
    throw new Error("Player not found");
  }

  player.acceptedEvents = (player.acceptedEvents || 0) + 1;
  player.lastActionAtStage = stageIndex;
  player.lastAction = "accept";
  player.choices = [
    ...(player.choices || []).filter((c) => c.stageIndex !== stageIndex),
    { stageIndex, type: "accept", cards: [] },
  ];
  player.updatedAt = new Date();
  await save();
}
