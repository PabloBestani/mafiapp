import { describe, expect, it } from "vitest";

import { resolveNight } from "./night";
import type { PlayerState, RoleId } from "./types";

function player(
  id: string,
  roleId: RoleId,
  seatIndex: number,
  alive = true
): PlayerState {
  return {
    id,
    name: id,
    gender: "hombre",
    roleId,
    alive,
    seatIndex
  };
}

describe("night resolution", () => {
  it("does not let the doctor group save a doctor shot for protecting grandma", () => {
    const resolution = resolveNight({
      players: [
        player("abuela", "abuela", 0),
        player("medico", "medico", 1),
        player("civil", "civil", 2)
      ],
      actions: {
        doctorProtect: { targetId: "abuela" }
      },
      random: () => 0
    });

    expect(resolution.protectedId).toBeNull();
    expect(resolution.deaths).toEqual([
      { playerId: "medico", type: "COMMON_MURDER", source: "GRANDMA" }
    ]);
    expect(resolution.players.find((next) => next.id === "medico")?.alive).toBe(
      false
    );
    expect(resolution.players.find((next) => next.id === "abuela")?.alive).toBe(
      true
    );
  });

  it("lets a doctor protection save the target of a grandma shot from another group", () => {
    const resolution = resolveNight({
      players: [
        player("abuela", "abuela", 0),
        player("mafioso", "mafioso", 1),
        player("medico", "medico", 2)
      ],
      actions: {
        mafiaAttack: { targetId: "abuela" },
        doctorProtect: { targetId: "mafioso" }
      },
      random: () => 0
    });

    expect(resolution.deaths).toEqual([]);
    expect(resolution.savedIds).toEqual(["mafioso"]);
    expect(resolution.players.find((next) => next.id === "mafioso")?.alive).toBe(
      true
    );
  });

  it("inverts a lone inhibited detective investigation", () => {
    const resolution = resolveNight({
      players: [
        player("detective", "detective", 0),
        player("prostituta", "prostituta", 1),
        player("mafioso", "mafioso", 2)
      ],
      actions: {
        prostitution: { targetId: "detective" },
        detectiveInvestigate: { targetId: "mafioso" }
      }
    });

    expect(resolution.detectiveResult).toEqual({
      targetId: "mafioso",
      result: "NO_MAFIOSO",
      truthful: false,
      invertedByInhibition: true
    });
  });

  it("keeps a group detective investigation truthful if one detective is inhibited", () => {
    const resolution = resolveNight({
      players: [
        player("detective1", "detective", 0),
        player("detective2", "detective", 1),
        player("prostituta", "prostituta", 2),
        player("mafioso", "mafioso", 3)
      ],
      actions: {
        prostitution: { targetId: "detective1" },
        detectiveInvestigate: { targetId: "mafioso" }
      }
    });

    expect(resolution.detectiveResult).toMatchObject({
      targetId: "mafioso",
      result: "MAFIOSO",
      truthful: true,
      invertedByInhibition: false
    });
  });

  it("rejects detective self-investigation", () => {
    const resolution = resolveNight({
      players: [
        player("detective", "detective", 0),
        player("civil", "civil", 1)
      ],
      actions: {
        detectiveInvestigate: { targetId: "detective" }
      }
    });

    expect(resolution.detectiveResult).toBeNull();
    expect(resolution.privateEvents).toContain(
      "El Detective no puede investigarse a sí mismo."
    );
  });

  it("resolves Romeo and Julieta link death plus poison", () => {
    const resolution = resolveNight({
      players: [
        player("romeo", "romeo", 0),
        player("julieta", "julieta", 1),
        player("mafioso", "mafioso", 2),
        player("civil", "civil", 3)
      ],
      actions: {
        mafiaAttack: { targetId: "romeo" },
        loverPoison: { loverId: "julieta", targetId: "civil" }
      }
    });

    expect(resolution.deaths).toEqual([
      { playerId: "romeo", type: "COMMON_MURDER", source: "MAFIA" },
      { playerId: "julieta", type: "LINK", source: "ROMEO_JULIETA" },
      { playerId: "civil", type: "POISON", source: "ROMEO_JULIETA" }
    ]);
    expect(resolution.pendingLoverPoison).toBeNull();
  });

  it("prevents a night poison if the surviving lover was inhibited", () => {
    const resolution = resolveNight({
      players: [
        player("romeo", "romeo", 0),
        player("julieta", "julieta", 1),
        player("prostituta", "prostituta", 2),
        player("mafioso", "mafioso", 3),
        player("civil", "civil", 4)
      ],
      actions: {
        prostitution: { targetId: "julieta" },
        mafiaAttack: { targetId: "romeo" },
        loverPoison: { loverId: "julieta", targetId: "civil" }
      }
    });

    expect(resolution.deaths).toEqual([
      { playerId: "romeo", type: "COMMON_MURDER", source: "MAFIA" },
      { playerId: "julieta", type: "LINK", source: "ROMEO_JULIETA" }
    ]);
    expect(resolution.players.find((next) => next.id === "civil")?.alive).toBe(
      true
    );
  });
});
