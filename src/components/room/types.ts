export interface RoomPlayer {
  _id?: string;
  playerName: string;
  baseCards: string[];
  pawnedCards: string[];
  acceptedEvents?: number;
  lastActionAtStage?: number;
  lastAction?: "accept" | "pawn" | null;
  stageEvents?: Record<number, string>;
  choices?: { stageIndex: number; type: "accept" | "pawn"; cards: string[]; event?: string }[];
  updatedAt?: string | Date;
}

export interface RoomInfo {
  roomId: string;
  hostName: string;
  status: "waiting" | "playing" | "finished";
  currentStage: number;
  currentEvent?: string;
}
