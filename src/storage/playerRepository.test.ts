import { describe, expect, it } from "vitest";

import { runMigrations } from "./migrations";
import { SQLitePlayerRepository } from "./playerRepository";
import { NodeSqliteDriver } from "./testing/nodeSqliteDriver";

describe("SQLitePlayerRepository", () => {
  it("creates, renames, lists and soft-deletes local players", async () => {
    const database = new NodeSqliteDriver();
    await runMigrations(database, () => "2026-06-03T23:10:00.000Z");
    const repository = new SQLitePlayerRepository(
      database,
      () => "2026-06-03T23:12:00.000Z"
    );

    await repository.savePlayer({
      id: "p1",
      name: "Pablo",
      kind: "frequent",
      gender: "hombre",
      createdAt: "2026-06-03T23:10:00.000Z",
      updatedAt: "2026-06-03T23:10:00.000Z"
    });
    await repository.renamePlayer("p1", "Pablo B.");
    await repository.setPlayerGender("p1", "mujer");

    expect(await repository.getPlayer("p1")).toEqual({
      id: "p1",
      name: "Pablo B.",
      kind: "frequent",
      gender: "mujer",
      createdAt: "2026-06-03T23:10:00.000Z",
      updatedAt: "2026-06-03T23:12:00.000Z"
    });

    await repository.deletePlayer("p1");

    expect(await repository.listPlayers()).toEqual([]);
    expect(await repository.getPlayer("p1")).toBeNull();
  });
});
