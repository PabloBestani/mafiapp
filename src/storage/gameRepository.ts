import type { GameState } from "../domain/types";

export interface GameRepository {
  loadCurrentGame(): Promise<GameState | null>;
  saveCurrentGame(game: GameState): Promise<void>;
  clearCurrentGame(): Promise<void>;
}
