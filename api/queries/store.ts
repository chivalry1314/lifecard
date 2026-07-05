/**
 * 统一数据访问层
 *
 * 如果配置了有效的 CloudBase 环境变量，则使用 CloudBase 文档型数据库；
 * 否则自动降级为本地 JSON 文件存储，数据保存在 ./data/ 目录下。
 */

import { env } from "../lib/env";
import * as cloudbase from "./cloudbase";
import * as file from "./file-store";

function looksLikePlaceholder(value: string): boolean {
  return !value || value.startsWith("your-") || value.includes("your-cloudbase");
}

const useCloudbase =
  !looksLikePlaceholder(env.cloudbaseEnvId) &&
  !looksLikePlaceholder(env.cloudbaseApiKey);

const backend = useCloudbase ? cloudbase : file;

if (!useCloudbase) {
  console.warn(
    "[store] CloudBase not configured. Using local JSON file store (data in ./data)."
  );
}

export type { RoomDoc, PlayerDoc } from "./cloudbase";
export const ALL_CARDS = cloudbase.ALL_CARDS;
export const STAGES = cloudbase.STAGES;
export const ADVERSITY_EVENTS = cloudbase.ADVERSITY_EVENTS;
export const generateRoomId = cloudbase.generateRoomId;
export const shuffle = cloudbase.shuffle;
export const dealCards = cloudbase.dealCards;
export const getRandomEvent = cloudbase.getRandomEvent;

export const createRoom = backend.createRoom;
export const getRoom = backend.getRoom;
export const updateRoomStatus = backend.updateRoomStatus;
export const createPlayer = backend.createPlayer;
export const updatePlayerBaseCards = backend.updatePlayerBaseCards;
export const getPlayer = backend.getPlayer;
export const listPlayersByRoom = backend.listPlayersByRoom;
export const revealPlayerEvent = backend.revealPlayerEvent;
export const pawnCards = backend.pawnCards;
export const acceptAdversity = backend.acceptAdversity;
