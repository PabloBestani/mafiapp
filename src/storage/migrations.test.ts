import { describe, expect, it } from "vitest";

import { getLatestSchemaVersion, runMigrations } from "./migrations";
import { NodeSqliteDriver } from "./testing/nodeSqliteDriver";

describe("storage migrations", () => {
  it("applies all migrations idempotently on the same SQLite database", async () => {
    const database = new NodeSqliteDriver();

    await runMigrations(database, () => "2026-06-03T23:10:00.000Z");
    await runMigrations(database, () => "2026-06-03T23:11:00.000Z");

    const migrations = await database.all<{ version: number; name: string }>(
      `SELECT version, name FROM schema_migrations ORDER BY version;`
    );
    const userVersion = await database.get<{ user_version: number }>(
      `PRAGMA user_version;`
    );
    const tables = await database.all<{ name: string }>(
      `SELECT name
       FROM sqlite_master
       WHERE type = 'table'
       ORDER BY name;`
    );

    expect(migrations).toEqual([
      { version: 1, name: "initial_offline_storage" }
    ]);
    expect(userVersion?.user_version).toBe(getLatestSchemaVersion());
    expect(tables.map((table) => table.name)).toEqual([
      "app_settings",
      "game_undo_snapshots",
      "games",
      "players",
      "schema_migrations",
      "sqlite_sequence"
    ]);
  });
});
