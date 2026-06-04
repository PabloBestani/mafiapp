import type { GameRepository } from "../storage/gameRepository";
import type { GameState, LastGameSetup } from "../domain/types";

export interface AutosaveOptions {
  previousGame?: GameState;
  reason?: string;
  strongCheckpoint?: boolean;
}

export class GameAutosaveService {
  constructor(private readonly games: GameRepository) {}

  async resumeCurrentGame(): Promise<GameState | null> {
    return this.games.loadCurrentGame();
  }

  async saveCurrentGame(
    game: GameState,
    options: AutosaveOptions = {}
  ): Promise<void> {
    if (options.previousGame) {
      const undoSnapshot = {
        gameId: game.id,
        snapshot: options.previousGame,
        reason: options.reason ?? "autosave"
      };

      await this.games.pushUndoSnapshot(
        options.strongCheckpoint === undefined
          ? undoSnapshot
          : { ...undoSnapshot, strongCheckpoint: options.strongCheckpoint }
      );
    }

    await this.games.saveCurrentGame(game);
    await this.games.saveLastGameSetup(extractLastGameSetup(game));
  }

  async undoLastAction(gameId: string): Promise<GameState | null> {
    const previousGame = await this.games.popUndoSnapshot(gameId);

    if (!previousGame) {
      return null;
    }

    await this.games.saveCurrentGame(previousGame);

    return previousGame;
  }

  async clearCurrentGame(): Promise<void> {
    await this.games.clearCurrentGame();
  }

  async loadLastGameSetup(): Promise<LastGameSetup | null> {
    return this.games.loadLastGameSetup();
  }
}

export function extractLastGameSetup(game: GameState): LastGameSetup {
  const activePlayers = game.players
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex);

  return {
    activePlayerIds: activePlayers.map((player) => player.id),
    seatingOrder: activePlayers.map((player) => player.id),
    deck: game.deck
  };
}
