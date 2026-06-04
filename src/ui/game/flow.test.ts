import { describe, expect, it } from "vitest";

import type { GameState, PlayerProfile, PlayerState, RoleId } from "../../domain/types";
import {
  applyConfirmedLynch,
  applyDefense,
  applyLynch,
  assignRole,
  buildFirstNightSteps,
  canInferCivilians,
  canStartGame,
  castCurrentVote,
  completeDraftWithCivilians,
  createEmptyDraft,
  createGameFromDraft,
  createVotingSession,
  inferCivilianRoles,
  moveSeat,
  rerollVotingSession,
  setRoleCount,
  toggleSelectedPlayer
} from "./flow";

const now = () => "2026-06-04T00:00:00.000Z";

describe("setup flow", () => {
  it("selects players, moves seats and completes missing cards with civilians", () => {
    let draft = createEmptyDraft();

    draft = toggleSelectedPlayer(draft, "p1");
    draft = toggleSelectedPlayer(draft, "p2");
    draft = setRoleCount(draft, "mafioso", 1);
    draft = completeDraftWithCivilians(draft);

    expect(draft.selectedPlayerIds).toEqual(["p1", "p2"]);
    expect(moveSeat(draft.seatingOrder, "p2", -1)).toEqual(["p2", "p1"]);
    expect(draft.deck).toEqual({ mafioso: 1, civil: 1 });
    expect(canStartGame(draft)).toBe(true);
  });

  it("creates a setup game from a valid draft", () => {
    const players = createProfiles(2);
    const draft = {
      selectedPlayerIds: ["p1", "p2"],
      seatingOrder: ["p2", "p1"],
      deck: { mafioso: 1, civil: 1 } satisfies Partial<Record<RoleId, number>>
    };

    const game = createGameFromDraft("game-1", players, draft, now);

    expect(game.status).toBe("SETUP");
    expect(game.players.map((player) => [player.id, player.seatIndex])).toEqual([
      ["p2", 0],
      ["p1", 1]
    ]);
  });
});

describe("first night flow", () => {
  it("assigns called roles and infers civilians", () => {
    const baseGame = createGame();
    const assignedMafia = assignRole(baseGame, "mafioso", ["p1"], now);

    expect(buildFirstNightSteps(baseGame.deck, assignedMafia.players)).toEqual([
      { roleId: "mafioso", requiredCount: 1, selectedIds: ["p1"] }
    ]);
    expect(canInferCivilians(assignedMafia)).toBe(true);

    const inferred = inferCivilianRoles(assignedMafia, now);

    expect(inferred.status).toBe("NIGHT_ACTIONS");
    expect(inferred.players.map((player) => player.roleId)).toEqual([
      "mafioso",
      "civil"
    ]);
  });
});

describe("voting flow", () => {
  it("rerolls only before votes and casts current votes in order", () => {
    const game = createGameWithRoles([
      ["p1", "civil"],
      ["p2", "civil"],
      ["p3", "civil"]
    ]);
    const first = createVotingSession(game.players, () => 0);
    const rerolled = rerollVotingSession(game.players, first, () => 0.9);
    const voted = castCurrentVote(game.players, rerolled, "p3");

    expect(rerolled.rerolled).toBe(true);
    expect(Object.values(voted.votes)).toContain("p3");
    expect(rerollVotingSession(game.players, voted, () => 0)).toBe(voted);
  });

  it("records defended players", () => {
    const session = applyDefense(createVotingSession(createGame().players, () => 0), "p2");

    expect(session.defendedToday).toEqual(["p2"]);
  });
});

describe("lynch flow", () => {
  it("applies Romeo and Julieta day link with poison before evaluating victory", () => {
    const game = createGameWithRoles([
      ["p1", "romeo"],
      ["p2", "julieta"],
      ["p3", "mafioso"],
      ["p4", "civil"]
    ]);

    const lynch = applyLynch(game, "p1", "p4", now);
    const confirmed = applyConfirmedLynch(game, lynch, now);

    expect(lynch.deaths).toEqual([
      { playerId: "p1", type: "COMMON_MURDER", source: "LYNCH" },
      { playerId: "p2", type: "LINK", source: "ROMEO_JULIETA" },
      { playerId: "p4", type: "POISON", source: "ROMEO_JULIETA" }
    ]);
    expect(confirmed.status).toBe("MAFIA" === confirmed.result ? "GAME_OVER" : confirmed.status);
  });
});

function createProfiles(count: number): PlayerProfile[] {
  return Array.from({ length: count }, (_, index) => {
    const id = `p${index + 1}`;

    return {
      id,
      name: id,
      kind: "frequent",
      createdAt: now(),
      updatedAt: now()
    };
  });
}

function createGame(): GameState {
  return {
    id: "game-1",
    status: "FIRST_NIGHT_IDENTIFICATION_AND_ACTIONS",
    day: 0,
    night: 1,
    players: [
      player("p1", 0),
      player("p2", 1)
    ],
    deck: { mafioso: 1, civil: 1 },
    privateLog: [],
    publicLog: [],
    result: "SIN_RESULTADO"
  };
}

function createGameWithRoles(roles: Array<[string, RoleId]>): GameState {
  return {
    ...createGame(),
    players: roles.map(([id, roleId], index) => player(id, index, roleId)),
    deck: roles.reduce<Partial<Record<RoleId, number>>>((deck, [, roleId]) => {
      deck[roleId] = (deck[roleId] ?? 0) + 1;
      return deck;
    }, {})
  };
}

function player(id: string, seatIndex: number, roleId?: RoleId): PlayerState {
  return roleId
    ? { id, name: id, alive: true, seatIndex, roleId }
    : { id, name: id, alive: true, seatIndex };
}
