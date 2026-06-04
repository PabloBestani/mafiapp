import type { PlayerId, PlayerState } from "./types";

export function getAliveSeatOrder(players: readonly PlayerState[]): PlayerState[] {
  return players
    .filter((player) => player.alive)
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex);
}

export function circularDistance(
  players: readonly PlayerState[],
  fromId: PlayerId,
  toId: PlayerId
): number {
  const aliveOrder = getAliveSeatOrder(players);
  const fromIndex = aliveOrder.findIndex((player) => player.id === fromId);
  const toIndex = aliveOrder.findIndex((player) => player.id === toId);

  if (fromIndex === -1 || toIndex === -1) {
    return Number.POSITIVE_INFINITY;
  }

  const clockwise = (toIndex - fromIndex + aliveOrder.length) % aliveOrder.length;
  const counterClockwise =
    (fromIndex - toIndex + aliveOrder.length) % aliveOrder.length;

  return Math.min(clockwise, counterClockwise);
}

export function pickClosestToTarget(
  players: readonly PlayerState[],
  candidates: readonly PlayerState[],
  targetId: PlayerId,
  random: () => number = Math.random
): PlayerState | null {
  if (candidates.length === 0) {
    return null;
  }

  const ranked = candidates
    .map((candidate) => ({
      candidate,
      distance: circularDistance(players, candidate.id, targetId)
    }))
    .sort((a, b) => {
      if (a.distance !== b.distance) {
        return a.distance - b.distance;
      }

      return a.candidate.seatIndex - b.candidate.seatIndex;
    });

  const bestDistance = ranked[0]?.distance;
  const tied = ranked.filter((entry) => entry.distance === bestDistance);
  const index = Math.min(Math.floor(random() * tied.length), tied.length - 1);

  return tied[index]?.candidate ?? null;
}
