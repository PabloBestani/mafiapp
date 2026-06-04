import {
  createSchemaMigrationTableStatement,
  createSchemaStatements,
  schemaMigrationTable,
  schemaVersion
} from "./schema";
import type { SqlDatabase } from "./sqlDriver";

export interface Migration {
  version: number;
  name: string;
  statements: readonly string[];
}

interface AppliedMigrationRow {
  version: number;
}

export const migrations: readonly Migration[] = [
  {
    version: 1,
    name: "initial_offline_storage",
    statements: createSchemaStatements
  }
] as const;

export async function runMigrations(
  database: SqlDatabase,
  now: () => string = () => new Date().toISOString()
): Promise<void> {
  await database.exec("PRAGMA foreign_keys = ON;");
  await database.exec(createSchemaMigrationTableStatement);

  const appliedRows = await database.all<AppliedMigrationRow>(
    `SELECT version FROM ${schemaMigrationTable};`
  );
  const appliedVersions = new Set(appliedRows.map((row) => row.version));

  for (const migration of migrations) {
    if (appliedVersions.has(migration.version)) {
      continue;
    }

    await database.transaction(async (transaction) => {
      for (const statement of migration.statements) {
        await transaction.exec(statement);
      }

      await transaction.run(
        `INSERT INTO ${schemaMigrationTable} (version, name, applied_at)
         VALUES (?, ?, ?);`,
        [migration.version, migration.name, now()]
      );
      await transaction.exec(`PRAGMA user_version = ${migration.version};`);
    });
  }
}

export function getLatestSchemaVersion(): number {
  return schemaVersion;
}
