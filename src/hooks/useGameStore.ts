import { useState, useCallback } from "react";

export interface GameState {
  roomId: string | null;
  playerName: string | null;
  isHost: boolean;
}

const STORAGE_KEY = "renshengdangpu_game_state";

export function useGameStore() {
  const [state, setState] = useState<GameState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved) as GameState;
      }
    } catch {
      // ignore
    }
    return { roomId: null, playerName: null, isHost: false };
  });

  const saveState = useCallback((newState: GameState) => {
    setState(newState);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
    } catch {
      // ignore
    }
  }, []);

  const clearState = useCallback(() => {
    setState({ roomId: null, playerName: null, isHost: false });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }, []);

  return { state, saveState, clearState };
}
