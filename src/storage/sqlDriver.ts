export type SqlValue = string | number | null;
export type SqlParams = SqlValue[] | Record<string, SqlValue>;

export interface SqlDatabase {
  exec(source: string): Promise<void>;
  run(source: string, params?: SqlParams): Promise<void>;
  get<T>(source: string, params?: SqlParams): Promise<T | null>;
  all<T>(source: string, params?: SqlParams): Promise<T[]>;
  transaction<T>(task: (database: SqlDatabase) => Promise<T>): Promise<T>;
}
