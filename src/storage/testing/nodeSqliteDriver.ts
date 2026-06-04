import { DatabaseSync } from "node:sqlite";

import type { SqlDatabase, SqlParams, SqlValue } from "../sqlDriver";

export class NodeSqliteDriver implements SqlDatabase {
  constructor(private readonly database = new DatabaseSync(":memory:")) {}

  async exec(source: string): Promise<void> {
    this.database.exec(source);
  }

  async run(source: string, params: SqlParams = []): Promise<void> {
    const statement = this.database.prepare(source);

    if (Array.isArray(params)) {
      statement.run(...params);
      return;
    }

    statement.run(params);
  }

  async get<T>(source: string, params: SqlParams = []): Promise<T | null> {
    const statement = this.database.prepare(source);

    if (Array.isArray(params)) {
      return (statement.get(...params) as T | undefined) ?? null;
    }

    return (statement.get(params) as T | undefined) ?? null;
  }

  async all<T>(source: string, params: SqlParams = []): Promise<T[]> {
    const statement = this.database.prepare(source);

    if (Array.isArray(params)) {
      return statement.all(...params) as T[];
    }

    return statement.all(params) as T[];
  }

  async transaction<T>(task: (database: SqlDatabase) => Promise<T>): Promise<T> {
    this.database.exec("BEGIN IMMEDIATE;");

    try {
      const result = await task(this);
      this.database.exec("COMMIT;");

      return result;
    } catch (error) {
      this.database.exec("ROLLBACK;");
      throw error;
    }
  }
}
