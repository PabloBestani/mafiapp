import { validateDeckConfiguration } from "../data/roles";
import { createSetupGame } from "../domain/game";
import type { GameState, PlayerState, RoleId } from "../domain/types";

export function startSetupGame(params: {
  id: string;
  players: PlayerState[];
  deck: Partial<Record<RoleId, number>>;
}): GameState {
  const validation = validateDeckConfiguration(params.deck, params.players.length);

  if (!validation.valid) {
    throw new Error("Deck configuration must match active players before setup.");
  }

  return createSetupGame(params.id, params.players, params.deck);
}
