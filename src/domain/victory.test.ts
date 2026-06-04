import { describe, expect, it } from "vitest";

import type { PlayerState, RoleId } from "./types";
import { countVictoryActors, evaluateVictory } from "./victory";

function player(id: string, roleId: RoleId, alive = true): PlayerState {
  return {
    id,
    name: id,
    roleId,
    alive,
    seatIndex: Number(id.replace(/\D/g, "")) || 0
  };
}

describe("victory", () => {
  it("counts the prostitute as non-mafia alive for mafia parity", () => {
    const players = [
      player("p1", "mafioso"),
      player("p2", "civil"),
      player("p3", "prostituta")
    ];

    expect(countVictoryActors(players)).toEqual({
      alivePlayers: 3,
      strictMafiaAlive: 1,
      nonMafiaAlive: 2
    });
    expect(evaluateVictory(players)).toBe("SIN_RESULTADO");
  });

  it("lets mafia win when strict mafias reach parity with pueblo plus prostitute", () => {
    const players = [
      player("p1", "mafioso"),
      player("p2", "mafioso"),
      player("p3", "civil"),
      player("p4", "prostituta")
    ];

    expect(evaluateVictory(players)).toBe("MAFIA");
  });

  it("lets pueblo win when no strict mafia remains even if prostitute is alive", () => {
    const players = [player("p1", "prostituta"), player("p2", "civil")];

    expect(evaluateVictory(players)).toBe("PUEBLO");
  });

  it("returns empate when everybody died in the same evaluation window", () => {
    const players = [
      player("p1", "mafioso", false),
      player("p2", "civil", false)
    ];

    expect(evaluateVictory(players)).toBe("EMPATE");
  });
});
