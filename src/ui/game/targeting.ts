import type { NightActions } from "../../domain/night";
import type { PlayerId, PlayerState, RoleId } from "../../domain/types";

export interface TargetOption {
  player: PlayerState;
  disabledReason: string | null;
}

export interface TargetGroups {
  alive: TargetOption[];
  dead: TargetOption[];
}

export function getNightActionTarget(
  actions: NightActions,
  roleId: RoleId
): PlayerId | null {
  if (roleId === "prostituta") return actions.prostitution?.targetId ?? null;
  if (roleId === "mafioso") return actions.mafiaAttack?.targetId ?? null;
  if (roleId === "medico") return actions.doctorProtect?.targetId ?? null;
  if (roleId === "detective") return actions.detectiveInvestigate?.targetId ?? null;

  return null;
}

export function setNightActionTarget(
  actions: NightActions,
  roleId: RoleId,
  targetId: PlayerId
): NightActions {
  if (roleId === "prostituta") return { ...actions, prostitution: { targetId } };
  if (roleId === "mafioso") return { ...actions, mafiaAttack: { targetId } };
  if (roleId === "medico") return { ...actions, doctorProtect: { targetId } };
  if (roleId === "detective") return { ...actions, detectiveInvestigate: { targetId } };

  return actions;
}

export function nightActionTargetGroups(
  players: readonly PlayerState[],
  roleId: RoleId,
  actorIds: readonly PlayerId[]
): TargetGroups {
  return splitTargets(
    orderedPlayers(players).map((player) => ({
      player,
      disabledReason: nightActionDisabledReason(player, roleId, actorIds)
    }))
  );
}

export function voteTargetGroups(
  players: readonly PlayerState[],
  voterId: PlayerId
): TargetGroups {
  const voter = players.find((player) => player.id === voterId);
  const forcedVotePartner = voter && isLover(voter)
    ? players.find((player) => player.alive && player.id !== voter.id && isLover(player))
    : null;

  return splitTargets(
    orderedPlayers(players).map((player) => ({
      player,
      disabledReason: !player.alive
        ? "Muerto"
        : player.id === voterId
          ? "Sin autovoto"
          : forcedVotePartner?.id === player.id
            ? "Forzaría autovoto"
          : null
    }))
  );
}

export function loverPoisonTargetGroups(
  players: readonly PlayerState[],
  loverId: PlayerId
): TargetGroups {
  return splitTargets(
    orderedPlayers(players).map((player) => ({
      player,
      disabledReason: loverPoisonDisabledReason(player, loverId)
    }))
  );
}

function nightActionDisabledReason(
  player: PlayerState,
  roleId: RoleId,
  actorIds: readonly PlayerId[]
): string | null {
  if (!player.alive) {
    return "Muerto";
  }

  if (roleId === "prostituta" && actorIds.includes(player.id)) {
    return "Es quien actúa";
  }

  if (roleId === "mafioso" && actorIds.length === 1 && actorIds[0] === player.id) {
    return "No puede automatarse";
  }

  if (roleId === "detective" && actorIds.includes(player.id)) {
    return "No puede autoinvestigarse";
  }

  return null;
}

function loverPoisonDisabledReason(player: PlayerState, loverId: PlayerId): string | null {
  if (!player.alive) {
    return "Muerto";
  }

  if (player.id === loverId) {
    return "Es quien elige";
  }

  if (isLover(player)) {
    return "Vínculo amoroso";
  }

  return null;
}

function isLover(player: PlayerState): boolean {
  return player.roleId === "romeo" || player.roleId === "julieta";
}

function splitTargets(options: TargetOption[]): TargetGroups {
  return {
    alive: options.filter((option) => option.player.alive),
    dead: options.filter((option) => !option.player.alive)
  };
}

function orderedPlayers(players: readonly PlayerState[]): PlayerState[] {
  return players.slice().sort((a, b) => a.seatIndex - b.seatIndex);
}
