import { roleDefinitions } from "../data/roles";
import type { GameResult, PlayerState } from "./types";

export interface VictoryCounts {
  alivePlayers: number;
  strictMafiaAlive: number;
  nonMafiaAlive: number;
}

export function countVictoryActors(players: readonly PlayerState[]): VictoryCounts {
  return players.reduce<VictoryCounts>(
    (counts, player) => {
      if (!player.alive || !player.roleId) {
        return counts;
      }

      const role = roleDefinitions[player.roleId];

      return {
        alivePlayers: counts.alivePlayers + 1,
        strictMafiaAlive: counts.strictMafiaAlive + (role.strictMafia ? 1 : 0),
        nonMafiaAlive:
          counts.nonMafiaAlive + (role.countsAsNonMafiaAlive ? 1 : 0)
      };
    },
    {
      alivePlayers: 0,
      strictMafiaAlive: 0,
      nonMafiaAlive: 0
    }
  );
}

export function evaluateVictory(players: readonly PlayerState[]): GameResult {
  const counts = countVictoryActors(players);

  if (counts.alivePlayers === 0) {
    return "EMPATE";
  }

  if (counts.strictMafiaAlive === 0) {
    return "PUEBLO";
  }

  if (counts.strictMafiaAlive >= counts.nonMafiaAlive) {
    return "MAFIA";
  }

  return "SIN_RESULTADO";
}
