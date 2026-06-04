import { describe, expect, it } from "vitest";

import type { GameState } from "../domain/types";
import { runMigrations } from "../storage/migrations";
import { SQLiteGameRepository } from "../storage/sqliteGameRepository";
import { NodeSqliteDriver } from "../storage/testing/nodeSqliteDriver";
import { extractLastGameSetup, GameAutosaveService } from "./autosave";

describe("GameAutosaveService", () => {
  it("autosaves, resumes and records last setup", async () => {
    const service = await setupService();
    const game = createGame("game-1");

    await service.saveCurrentGame(game);

    expect(await service.resumeCurrentGame()).toEqual(game);
    expect(await service.loadLastGameSetup()).toEqual(extractLastGameSetup(game));
  });

  it("stores previous state for undo and restores it as current", async () => {
    const service = await setupService();
    const previousGame = createGame("game-1");
    const nextGame: GameState = {
      ...previousGame,
      status: "DAY_DISCUSSION",
      day: 1
    };

    await service.saveCurrentGame(previousGame);
    await service.saveCurrentGame(nextGame, {
      previousGame,
      reason: "confirm-night",
      strongCheckpoint: true
    });

    expect(await service.resumeCurrentGame()).toEqual(nextGame);
    expect(await service.undoLastAction("game-1")).toEqual(previousGame);
    expect(await service.resumeCurrentGame()).toEqual(previousGame);
  });
});

async function setupService() {
  const database = new NodeSqliteDriver();
  await runMigrations(database, () => "2026-06-03T23:10:00.000Z");
  const repository = new SQLiteGameRepository(
    database,
    () => "2026-06-03T23:10:00.000Z"
  );

  return new GameAutosaveService(repository);
}

function createGame(id: string): GameState {
  return {
    id,
    status: "NIGHT_ACTIONS",
    day: 0,
    night: 1,
    players: [
      {
        id: "p1",
        name: "Pablo",
        roleId: "mafioso",
        alive: true,
        seatIndex: 0
      },
      {
        id: "p2",
        name: "Sofi",
        roleId: "civil",
        alive: true,
        seatIndex: 1
      }
    ],
    deck: { mafioso: 1, civil: 1 },
    privateLog: [],
    publicLog: [],
    result: "SIN_RESULTADO"
  };
}
