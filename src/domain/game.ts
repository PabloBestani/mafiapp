import type { GameState, PlayerState, RoleId } from "./types";

export function createSetupGame(
  id: string,
  players: PlayerState[],
  deck: Partial<Record<RoleId, number>>
): GameState {
  return {
    id,
    status: "SETUP",
    day: 0,
    night: 0,
    players,
    deck,
    privateLog: [],
    publicLog: [],
    result: "SIN_RESULTADO"
  };
}

export function cancelGame(game: GameState): GameState {
  return {
    ...game,
    status: "GAME_OVER",
    result: "CANCELADA",
    privateLog: [
      ...game.privateLog,
      {
        id: `${game.id}:cancelled:${game.privateLog.length + 1}`,
        event: "GAME_CANCELLED",
        message: "Dios canceló la partida.",
        createdAt: new Date().toISOString()
      }
    ]
  };
}
