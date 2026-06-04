import { describe, expect, it } from "vitest";

import type { GameState, PlayerState, RoleId } from "../domain/types";
import { runMigrations } from "./migrations";
import { SQLiteGameRepository } from "./sqliteGameRepository";
import { NodeSqliteDriver } from "./testing/nodeSqliteDriver";

describe("SQLiteGameRepository", () => {
  it("saves, marks and resumes the current game", async () => {
    const { repository } = await setupRepository();
    const game = createGame("game-1");

    await repository.saveCurrentGame(game);

    expect(await repository.loadCurrentGame()).toEqual(game);
    expect(await repository.loadGame("game-1")).toEqual(game);
  });

  it("clears only the current game pointer", async () => {
    const { repository } = await setupRepository();
    const game = createGame("game-1");

    await repository.saveCurrentGame(game);
    await repository.clearCurrentGame();

    expect(await repository.loadCurrentGame()).toBeNull();
    expect(await repository.loadGame("game-1")).toEqual(game);
  });

  it("pushes, lists and pops undo snapshots in reverse order", async () => {
    const { repository } = await setupRepository();
    const initialGame = createGame("game-1");
    const nextGame = {
      ...initialGame,
      status: "DAY_DISCUSSION" as const,
      day: 1
    };

    await repository.saveCurrentGame(initialGame);
    await repository.pushUndoSnapshot({
      gameId: nextGame.id,
      snapshot: initialGame,
      reason: "night-confirmed",
      strongCheckpoint: true
    });
    await repository.saveCurrentGame(nextGame);

    const snapshots = await repository.listUndoSnapshots("game-1");
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      gameId: "game-1",
      snapshot: initialGame,
      reason: "night-confirmed",
      strongCheckpoint: true
    });

    expect(await repository.popUndoSnapshot("game-1")).toEqual(initialGame);
    expect(await repository.popUndoSnapshot("game-1")).toBeNull();
  });

  it("stores the last reusable game setup", async () => {
    const { repository } = await setupRepository();
    const setup = {
      activePlayerIds: ["p1", "p2"],
      seatingOrder: ["p2", "p1"],
      deck: { mafioso: 1, civil: 1 } satisfies Partial<Record<RoleId, number>>
    };

    await repository.saveLastGameSetup(setup);

    expect(await repository.loadLastGameSetup()).toEqual(setup);
  });
});

async function setupRepository() {
  const database = new NodeSqliteDriver();
  await runMigrations(database, () => "2026-06-03T23:10:00.000Z");

  return {
    database,
    repository: new SQLiteGameRepository(
      database,
      () => "2026-06-03T23:10:00.000Z"
    )
  };
}

function createGame(id: string): GameState {
  const players: PlayerState[] = [
    createPlayer("p1", "Pablo", "mafioso", 0),
    createPlayer("p2", "Sofi", "civil", 1)
  ];

  return {
    id,
    status: "NIGHT_ACTIONS",
    day: 0,
    night: 1,
    players,
    deck: {
      mafioso: 1,
      civil: 1
    },
    privateLog: [],
    publicLog: [],
    result: "SIN_RESULTADO"
  };
}

function createPlayer(
  id: string,
  name: string,
  roleId: RoleId,
  seatIndex: number
): PlayerState {
  return {
    id,
    name,
    roleId,
    alive: true,
    seatIndex
  };
}
