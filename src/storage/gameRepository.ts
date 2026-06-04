import type { GameState, LastGameSetup } from "../domain/types";

export interface UndoSnapshot {
  id: number;
  gameId: string;
  snapshot: GameState;
  reason: string;
  strongCheckpoint: boolean;
  createdAt: string;
}

export interface SaveGameOptions {
  markAsCurrent?: boolean;
}

export interface GameRepository {
  loadCurrentGame(): Promise<GameState | null>;
  loadGame(gameId: string): Promise<GameState | null>;
  saveGame(game: GameState, options?: SaveGameOptions): Promise<void>;
  saveCurrentGame(game: GameState): Promise<void>;
  clearCurrentGame(): Promise<void>;
  pushUndoSnapshot(params: {
    gameId: string;
    snapshot: GameState;
    reason: string;
    strongCheckpoint?: boolean;
  }): Promise<void>;
  listUndoSnapshots(gameId: string, limit?: number): Promise<UndoSnapshot[]>;
  popUndoSnapshot(gameId: string): Promise<GameState | null>;
  saveLastGameSetup(setup: LastGameSetup): Promise<void>;
  loadLastGameSetup(): Promise<LastGameSetup | null>;
}
