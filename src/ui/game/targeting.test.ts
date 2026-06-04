import { describe, expect, it } from "vitest";

import type { PlayerState, RoleId } from "../../domain/types";
import {
  loverPoisonTargetGroups,
  nightActionTargetGroups,
  voteTargetGroups
} from "./targeting";

describe("targeting", () => {
  it("keeps dead players visible and disabled", () => {
    const groups = nightActionTargetGroups(
      [
        player("mafioso", "mafioso", 0),
        player("civil", "civil", 1, false)
      ],
      "mafioso",
      ["mafioso"]
    );

    expect(groups.dead).toMatchObject([
      { player: { id: "civil" }, disabledReason: "Muerto" }
    ]);
  });

  it("explains role-specific disabled night targets", () => {
    expect(
      nightActionTargetGroups(
        [
          player("prostituta", "prostituta", 0),
          player("civil", "civil", 1)
        ],
        "prostituta",
        ["prostituta"]
      ).alive
    ).toMatchObject([
      { player: { id: "prostituta" }, disabledReason: "Es quien actúa" },
      { player: { id: "civil" }, disabledReason: null }
    ]);

    expect(
      nightActionTargetGroups(
        [
          player("mafioso", "mafioso", 0),
          player("civil", "civil", 1)
        ],
        "mafioso",
        ["mafioso"]
      ).alive[0]
    ).toMatchObject({ player: { id: "mafioso" }, disabledReason: "No puede automatarse" });

    expect(
      nightActionTargetGroups(
        [
          player("detective", "detective", 0),
          player("civil", "civil", 1)
        ],
        "detective",
        ["detective"]
      ).alive[0]
    ).toMatchObject({ player: { id: "detective" }, disabledReason: "No puede autoinvestigarse" });
  });

  it("blocks direct and forced autovote targets", () => {
    const groups = voteTargetGroups(
      [
        player("romeo", "romeo", 0),
        player("julieta", "julieta", 1),
        player("civil", "civil", 2)
      ],
      "romeo"
    );

    expect(groups.alive).toMatchObject([
      { player: { id: "romeo" }, disabledReason: "Sin autovoto" },
      { player: { id: "julieta" }, disabledReason: "Forzaría autovoto" },
      { player: { id: "civil" }, disabledReason: null }
    ]);
  });

  it("blocks lover poison on lovers and shows dead players", () => {
    const groups = loverPoisonTargetGroups(
      [
        player("romeo", "romeo", 0, false),
        player("julieta", "julieta", 1),
        player("civil", "civil", 2)
      ],
      "julieta"
    );

    expect(groups.alive).toMatchObject([
      { player: { id: "julieta" }, disabledReason: "Es quien elige" },
      { player: { id: "civil" }, disabledReason: null }
    ]);
    expect(groups.dead).toMatchObject([
      { player: { id: "romeo" }, disabledReason: "Muerto" }
    ]);
  });
});

function player(id: string, roleId: RoleId, seatIndex: number, alive = true): PlayerState {
  return {
    id,
    name: id,
    gender: "hombre",
    roleId,
    alive,
    seatIndex
  };
}
