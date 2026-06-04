import { describe, expect, it } from "vitest";

import type { PlayerState, RoleId } from "./types";
import {
  buildVotingOrder,
  castVoteWithLoverLink,
  resolveVotingOutcome
} from "./voting";

function player(id: string, roleId: RoleId, seatIndex: number): PlayerState {
  return {
    id,
    name: id,
    roleId,
    alive: true,
    seatIndex
  };
}

describe("voting", () => {
  const players = [
    player("p1", "civil", 0),
    player("p2", "civil", 1),
    player("p3", "civil", 2),
    player("p4", "civil", 3),
    player("p5", "civil", 4)
  ];

  it("builds circular voting order in both directions", () => {
    expect(buildVotingOrder(players, "p2", "clockwise")).toEqual([
      "p2",
      "p3",
      "p4",
      "p5",
      "p1"
    ]);
    expect(buildVotingOrder(players, "p2", "counterclockwise")).toEqual([
      "p2",
      "p1",
      "p5",
      "p4",
      "p3"
    ]);
  });

  it("requires 70 percent rounded up for immediate execution", () => {
    expect(
      resolveVotingOutcome(
        ["p1", "p2", "p3", "p4", "p5"],
        { p1: "p5", p2: "p5", p3: "p5", p4: "p1", p5: "p2" },
        new Set()
      )
    ).toEqual({
      kind: "DEFENSE",
      emittedVotes: 5,
      defendantId: "p5",
      votes: 3
    });

    expect(
      resolveVotingOutcome(
        ["p1", "p2", "p3", "p4", "p5"],
        { p1: "p5", p2: "p5", p3: "p5", p4: "p5", p5: "p1" },
        new Set()
      )
    ).toMatchObject({
      kind: "EXECUTION",
      executedId: "p5",
      votes: 4,
      reasons: ["OVERWHELMING_MAJORITY"]
    });
  });

  it("executes a player that already defended today", () => {
    expect(
      resolveVotingOutcome(
        ["p1", "p2", "p3"],
        { p1: "p3", p2: "p3", p3: "p1" },
        new Set(["p3"])
      )
    ).toMatchObject({
      kind: "EXECUTION",
      executedId: "p3",
      reasons: ["ALREADY_DEFENDED"]
    });
  });

  it("detects ties", () => {
    expect(
      resolveVotingOutcome(
        ["p1", "p2", "p3", "p4"],
        { p1: "p3", p2: "p3", p3: "p4", p4: "p4" },
        new Set()
      )
    ).toEqual({
      kind: "TIE",
      emittedVotes: 4,
      tiedPlayerIds: ["p3", "p4"]
    });
  });

  it("forces Romeo and Julieta to share votes without autovote", () => {
    const lovers = [
      player("romeo", "romeo", 0),
      player("julieta", "julieta", 1),
      player("civil", "civil", 2)
    ];

    const firstVote = castVoteWithLoverLink(lovers, {}, "romeo", "civil");
    const changedVote = castVoteWithLoverLink(
      lovers,
      firstVote,
      "julieta",
      "romeo"
    );

    expect(firstVote).toEqual({ romeo: "civil", julieta: "civil" });
    expect(changedVote).toEqual(firstVote);
  });

  it("rejects direct and forced autovotes", () => {
    const lovers = [
      player("romeo", "romeo", 0),
      player("julieta", "julieta", 1),
      player("civil", "civil", 2)
    ];

    expect(castVoteWithLoverLink(players, {}, "p1", "p1")).toEqual({});
    expect(castVoteWithLoverLink(lovers, {}, "romeo", "julieta")).toEqual({});
  });
});
