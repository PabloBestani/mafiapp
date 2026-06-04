export const schemaVersion = 1;

export const schemaMigrationTable = "schema_migrations";

export const createSchemaMigrationTableStatement = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  applied_at TEXT NOT NULL
);
`;

export const createSchemaStatements = [
  `CREATE TABLE IF NOT EXISTS players (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    kind TEXT NOT NULL CHECK (kind IN ('frequent', 'guest')),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    deleted_at TEXT
  );`,
  `CREATE TABLE IF NOT EXISTS games (
    id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL,
    result TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS game_undo_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    game_id TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,
    reason TEXT NOT NULL,
    strong_checkpoint INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_game_undo_snapshots_game_id_id
    ON game_undo_snapshots (game_id, id DESC);`,
  `CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY NOT NULL,
    value_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );`
] as const;
