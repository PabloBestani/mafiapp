import type { PlayerGender, PlayerKind, PlayerProfile } from "../domain/types";
import type { SqlDatabase } from "./sqlDriver";

export interface PlayerRepository {
  listPlayers(): Promise<PlayerProfile[]>;
  getPlayer(playerId: string): Promise<PlayerProfile | null>;
  savePlayer(player: PlayerProfile): Promise<void>;
  renamePlayer(playerId: string, name: string): Promise<void>;
  setPlayerGender(playerId: string, gender: PlayerGender): Promise<void>;
  deletePlayer(playerId: string): Promise<void>;
}

interface PlayerRow {
  id: string;
  name: string;
  kind: PlayerKind;
  gender: PlayerGender;
  created_at: string;
  updated_at: string;
}

export class SQLitePlayerRepository implements PlayerRepository {
  constructor(
    private readonly database: SqlDatabase,
    private readonly now: () => string = () => new Date().toISOString()
  ) {}

  async listPlayers(): Promise<PlayerProfile[]> {
    const rows = await this.database.all<PlayerRow>(
      `SELECT id, name, kind, gender, created_at, updated_at
       FROM players
       WHERE deleted_at IS NULL
       ORDER BY lower(name), created_at;`
    );

    return rows.map(mapPlayer);
  }

  async getPlayer(playerId: string): Promise<PlayerProfile | null> {
    const row = await this.database.get<PlayerRow>(
      `SELECT id, name, kind, gender, created_at, updated_at
       FROM players
       WHERE id = ? AND deleted_at IS NULL;`,
      [playerId]
    );

    return row ? mapPlayer(row) : null;
  }

  async savePlayer(player: PlayerProfile): Promise<void> {
    await this.database.run(
      `INSERT INTO players (id, name, kind, gender, created_at, updated_at, deleted_at)
       VALUES (?, ?, ?, ?, ?, ?, NULL)
       ON CONFLICT(id) DO UPDATE SET
         name = excluded.name,
         kind = excluded.kind,
         gender = excluded.gender,
         updated_at = excluded.updated_at,
         deleted_at = NULL;`,
      [player.id, player.name, player.kind, player.gender, player.createdAt, player.updatedAt]
    );
  }

  async renamePlayer(playerId: string, name: string): Promise<void> {
    await this.database.run(
      `UPDATE players
       SET name = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [name, this.now(), playerId]
    );
  }

  async setPlayerGender(playerId: string, gender: PlayerGender): Promise<void> {
    await this.database.run(
      `UPDATE players
       SET gender = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [gender, this.now(), playerId]
    );
  }

  async deletePlayer(playerId: string): Promise<void> {
    await this.database.run(
      `UPDATE players
       SET deleted_at = ?, updated_at = ?
       WHERE id = ? AND deleted_at IS NULL;`,
      [this.now(), this.now(), playerId]
    );
  }
}

function mapPlayer(row: PlayerRow): PlayerProfile {
  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    gender: row.gender,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
