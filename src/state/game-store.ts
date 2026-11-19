import { create } from "zustand";
import type { GameMode, GameSceneId } from "../modes/mode";

export interface GameRuntimeState {
  mode: GameMode;
  activeScene: GameSceneId | null;
  setMode: (mode: GameMode) => void;
  setActiveScene: (scene: GameSceneId | null) => void;
}

export const useGameRuntimeStore = create<GameRuntimeState>((set) => ({
  mode: "hub",
  activeScene: null,
  setMode: (mode) => set({ mode }),
  setActiveScene: (activeScene) => set({ activeScene }),
}));
