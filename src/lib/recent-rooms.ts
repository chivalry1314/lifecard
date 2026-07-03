const STORAGE_KEY = "lifecard_recent_rooms_v2";
const MAX_RECENT_ROOMS = 5;

export interface RecentRoom {
  roomId: string;
  playerName: string;
  isHost: boolean;
  hostToken?: string;
  playerToken?: string;
  joinedAt: number;
}

export function getRecentRooms(): RecentRoom[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as RecentRoom[]) : [];
    return parsed
      .filter(
        (r): r is RecentRoom =>
          typeof r.roomId === "string" &&
          typeof r.playerName === "string" &&
          typeof r.joinedAt === "number"
      )
      .sort((a, b) => b.joinedAt - a.joinedAt);
  } catch {
    return [];
  }
}

export function addRecentRoom(
  room: Omit<RecentRoom, "joinedAt"> & Partial<Pick<RecentRoom, "joinedAt">>
): void {
  if (typeof window === "undefined") return;
  const existing = getRecentRooms().find((r) => r.roomId === room.roomId);
  const rooms = getRecentRooms().filter((r) => r.roomId !== room.roomId);
  rooms.unshift({
    ...existing,
    ...room,
    joinedAt: room.joinedAt ?? Date.now(),
  });
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(rooms.slice(0, MAX_RECENT_ROOMS))
  );
}

export function updateRecentRoomTokens(
  roomId: string,
  tokens: Partial<Pick<RecentRoom, "hostToken" | "playerToken">>
): void {
  if (typeof window === "undefined") return;
  const rooms = getRecentRooms();
  const room = rooms.find((r) => r.roomId === roomId);
  if (!room) return;
  Object.assign(room, tokens);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export function removeRecentRoom(roomId: string): void {
  if (typeof window === "undefined") return;
  const rooms = getRecentRooms().filter((r) => r.roomId !== roomId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rooms));
}

export function clearRecentRooms(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
