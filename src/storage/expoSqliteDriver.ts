import * as SQLite from "expo-sqlite";
import type { SQLiteBindParams, SQLiteDatabase } from "expo-sqlite";

import { runMigrations } from "./migrations";
import type { SqlDatabase, SqlParams } from "./sqlDriver";

type ExpoDatabaseLike = Pick<
  SQLiteDatabase,
  | "execAsync"
  | "runAsync"
  | "getFirstAsync"
  | "getAllAsync"
  | "withExclusiveTransactionAsync"
>;

export class ExpoSqliteDriver implements SqlDatabase {
  constructor(private readonly database: ExpoDatabaseLike) {}

  async exec(source: string): Promise<void> {
    await this.database.execAsync(source);
  }

  async run(source: string, params: SqlParams = []): Promise<void> {
    await this.database.runAsync(source, toExpoParams(params));
  }

  async get<T>(source: string, params: SqlParams = []): Promise<T | null> {
    return this.database.getFirstAsync<T>(source, toExpoParams(params));
  }

  async all<T>(source: string, params: SqlParams = []): Promise<T[]> {
    return this.database.getAllAsync<T>(source, toExpoParams(params));
  }

  async transaction<T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> {
    let result: T | undefined;

    await this.database.withExclusiveTransactionAsync(async (transaction) => {
      result = await task(new ExpoSqliteDriver(transaction));
    });

    return result as T;
  }
}

export async function openMafiappDatabase(
  databaseName = "mafiapp.db"
): Promise<SqlDatabase> {
  const database = await SQLite.openDatabaseAsync(databaseName);
  const driver = new ExpoSqliteDriver(database);
  await runMigrations(driver);

  return driver;
}

function toExpoParams(params: SqlParams): SQLiteBindParams {
  return Array.isArray(params) ? [...params] : params;
}
