import type { GameState, LastGameSetup } from "../domain/types";
import type { GameRepository, SaveGameOptions, UndoSnapshot } from "./gameRepository";
import type { SqlDatabase } from "./sqlDriver";

const currentGameIdKey = "current_game_id";
const lastGameSetupKey = "last_game_setup";

interface GameRow {
  snapshot_json: string;
}

interface SettingRow {
  value_json: string;
}

interface UndoSnapshotRow {
  id: number;
  game_id: string;
  snapshot_json: string;
  reason: string;
  strong_checkpoint: number;
  created_at: string;
}

export class SQLiteGameRepository implements GameRepository {
  constructor(
    private readonly database: SqlDatabase,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async loadCurrentGame(): Promise<GameState | null> {
    const currentGameId = await this.loadSetting<string>(currentGameIdKey);

    if (!currentGameId) {
      return null;
    }

    return this.loadGame(currentGameId);
  }

  async loadGame(gameId: string): Promise<GameState | null> {
    const row = await this.database.get<GameRow>(
      `SELECT snapshot_json FROM games WHERE id = ?;`,
      [gameId]
    );

    return row ? parseJson<GameState>(row.snapshot_json) : null;
  }

  async saveGame(game: GameState, options: SaveGameOptions = {}): Promise<void> {
    const markAsCurrent = options.markAsCurrent ?? false;

    await this.database.transaction(async (transaction) => {
      await this.saveGameInTransaction(transaction, game);

      if (markAsCurrent) {
        await this.saveSettingInTransaction(transaction, currentGameIdKey, game.id);
      }
    });
  }

  async saveCurrentGame(game: GameState): Promise<void> {
    await this.saveGame(game, { markAsCurrent: true });
  }

  async clearCurrentGame(): Promise<void> {
    await this.database.run(`DELETE FROM app_settings WHERE key = ?;`, [
      currentGameIdKey
    ]);
  }

  async pushUndoSnapshot(params: {
    gameId: string;
    snapshot: GameState;
    reason: string;
    strongCheckpoint?: boolean;
  }): Promise<void> {
    await this.database.run(
      `INSERT INTO game_undo_snapshots (
        game_id,
        snapshot_json,
        reason,
        strong_checkpoint,
        created_at
      ) VALUES (?, ?, ?, ?, ?);`,
      [
        params.gameId,
        JSON.stringify(params.snapshot),
        params.reason,
        params.strongCheckpoint ? 1 : 0,
        this.now()
      ]
    );
  }

  async listUndoSnapshots(gameId: string, limit = 20): Promise<UndoSnapshot[]> {
    const rows = await this.database.all<UndoSnapshotRow>(
      `SELECT id, game_id, snapshot_json, reason, strong_checkpoint, created_at
       FROM game_undo_snapshots
       WHERE game_id = ?
       ORDER BY id DESC
       LIMIT ?;`,
      [gameId, limit]
    );

    return rows.map(mapUndoSnapshot);
  }

  async popUndoSnapshot(gameId: string): Promise<GameState | null> {
    return this.database.transaction(async (transaction) => {
      const row = await transaction.get<UndoSnapshotRow>(
        `SELECT id, game_id, snapshot_json, reason, strong_checkpoint, created_at
         FROM game_undo_snapshots
         WHERE game_id = ?
         ORDER BY id DESC
         LIMIT 1;`,
        [gameId]
      );

      if (!row) {
        return null;
      }

      await transaction.run(`DELETE FROM game_undo_snapshots WHERE id = ?;`, [
        row.id
      ]);

      return parseJson<GameState>(row.snapshot_json);
    });
  }

  async saveLastGameSetup(setup: LastGameSetup): Promise<void> {
    await this.saveSetting(lastGameSetupKey, setup);
  }

  async loadLastGameSetup(): Promise<LastGameSetup | null> {
    return this.loadSetting<LastGameSetup>(lastGameSetupKey);
  }

  private async saveGameInTransaction(
    transaction: SqlDatabase,
    game: GameState
  ): Promise<void> {
    const now = this.now();

    await transaction.run(
      `INSERT INTO games (id, status, result, snapshot_json, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         status = excluded.status,
         result = excluded.result,
         snapshot_json = excluded.snapshot_json,
         updated_at = excluded.updated_at;`,
      [game.id, game.status, game.result, JSON.stringify(game), now, now]
    );
  }

  private async saveSetting(key: string, value: unknown): Promise<void> {
    await this.database.transaction(async (transaction) => {
      await this.saveSettingInTransaction(transaction, key, value);
    });
  }

  private async saveSettingInTransaction(
    transaction: SqlDatabase,
    key: string,
    value: unknown
  ): Promise<void> {
    await transaction.run(
      `INSERT INTO app_settings (key, value_json, updated_at)
       VALUES (?, ?, ?)
       ON CONFLICT(key) DO UPDATE SET
         value_json = excluded.value_json,
         updated_at = excluded.updated_at;`,
      [key, JSON.stringify(value), this.now()]
    );
  }

  private async loadSetting<T>(key: string): Promise<T | null> {
    const row = await this.database.get<SettingRow>(
      `SELECT value_json FROM app_settings WHERE key = ?;`,
      [key]
    );

    return row ? parseJson<T>(row.value_json) : null;
  }
}

function mapUndoSnapshot(row: UndoSnapshotRow): UndoSnapshot {
  return {
    id: row.id,
    gameId: row.game_id,
    snapshot: parseJson<GameState>(row.snapshot_json),
    reason: row.reason,
    strongCheckpoint: row.strong_checkpoint === 1,
    createdAt: row.created_at
  };
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}
