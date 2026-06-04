import { getAliveSeatOrder } from "./seating";
import type { PlayerId, PlayerState } from "./types";

export type VoteDirection = "clockwise" | "counterclockwise";
export type VoteMap = Partial<Record<PlayerId, PlayerId>>;

export type VotingOutcome =
  | { kind: "PENDING"; emittedVotes: number }
  | { kind: "TIE"; emittedVotes: number; tiedPlayerIds: PlayerId[] }
  | {
      kind: "DEFENSE";
      emittedVotes: number;
      defendantId: PlayerId;
      votes: number;
    }
  | {
      kind: "EXECUTION";
      emittedVotes: number;
      executedId: PlayerId;
      votes: number;
      reasons: Array<"OVERWHELMING_MAJORITY" | "ALREADY_DEFENDED">;
    };

export function buildVotingOrder(
  players: readonly PlayerState[],
  startId: PlayerId,
  direction: VoteDirection
): PlayerId[] {
  const aliveOrder = getAliveSeatOrder(players);
  const startIndex = aliveOrder.findIndex((player) => player.id === startId);

  if (startIndex === -1) {
    return aliveOrder.map((player) => player.id);
  }

  return aliveOrder.map((_, offset) => {
    const step = direction === "clockwise" ? offset : -offset;
    const index = (startIndex + step + aliveOrder.length) % aliveOrder.length;

    return aliveOrder[index]?.id;
  }).filter((id): id is PlayerId => Boolean(id));
}

export function castVoteWithLoverLink(
  players: readonly PlayerState[],
  currentVotes: VoteMap,
  voterId: PlayerId,
  targetId: PlayerId
): VoteMap {
  const voter = players.find((player) => player.id === voterId && player.alive);

  if (!voter) {
    return currentVotes;
  }

  if (targetId === voter.id) {
    return currentVotes;
  }

  const nextVotes: VoteMap = {
    ...currentVotes,
    [voter.id]: targetId
  };

  if (voter.roleId === "romeo" || voter.roleId === "julieta") {
    const partner = players.find(
      (player) =>
        player.alive &&
        player.id !== voter.id &&
        (player.roleId === "romeo" || player.roleId === "julieta")
    );

    if (partner) {
      if (partner.id === targetId) {
        return currentVotes;
      }

      nextVotes[partner.id] = targetId;
    }
  }

  return nextVotes;
}

export function resolveVotingOutcome(
  aliveVoterIds: readonly PlayerId[],
  votes: VoteMap,
  defendedToday: ReadonlySet<PlayerId>
): VotingOutcome {
  const emittedVotes = aliveVoterIds.filter((voterId) => votes[voterId]).length;

  if (emittedVotes === 0) {
    return { kind: "PENDING", emittedVotes };
  }

  const counts = new Map<PlayerId, number>();

  aliveVoterIds.forEach((voterId) => {
    const targetId = votes[voterId];

    if (targetId) {
      counts.set(targetId, (counts.get(targetId) ?? 0) + 1);
    }
  });

  const ranked = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  const [top] = ranked;

  if (!top) {
    return { kind: "PENDING", emittedVotes };
  }

  const [topPlayerId, topVotes] = top;
  const tiedPlayerIds = ranked
    .filter(([, count]) => count === topVotes)
    .map(([playerId]) => playerId);

  if (tiedPlayerIds.length > 1) {
    return { kind: "TIE", emittedVotes, tiedPlayerIds };
  }

  const overwhelmingThreshold = Math.ceil(emittedVotes * 0.7);
  const reasons: Array<"OVERWHELMING_MAJORITY" | "ALREADY_DEFENDED"> = [];

  if (topVotes >= overwhelmingThreshold) {
    reasons.push("OVERWHELMING_MAJORITY");
  }

  if (defendedToday.has(topPlayerId)) {
    reasons.push("ALREADY_DEFENDED");
  }

  if (reasons.length > 0) {
    return {
      kind: "EXECUTION",
      emittedVotes,
      executedId: topPlayerId,
      votes: topVotes,
      reasons
    };
  }

  return {
    kind: "DEFENSE",
    emittedVotes,
    defendantId: topPlayerId,
    votes: topVotes
  };
}
