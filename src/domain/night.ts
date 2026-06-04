import { roleDefinitions } from "../data/roles";
import { evaluateVictory } from "./victory";
import { pickClosestToTarget } from "./seating";
import type { GameResult, PlayerId, PlayerState, RoleId } from "./types";

export interface NightActions {
  prostitution?: {
    targetId: PlayerId;
  };
  mafiaAttack?: {
    targetId: PlayerId;
  };
  doctorProtect?: {
    targetId: PlayerId;
  };
  detectiveInvestigate?: {
    targetId: PlayerId;
  };
  loverPoison?: {
    loverId: PlayerId;
    targetId: PlayerId;
  };
}

export interface DetectiveResult {
  targetId: PlayerId;
  result: "MAFIOSO" | "NO_MAFIOSO";
  truthful: boolean;
  invertedByInhibition: boolean;
}

export type DeathType = "COMMON_MURDER" | "LINK" | "POISON";
export type DeathSource = "MAFIA" | "GRANDMA" | "ROMEO_JULIETA";

export interface DeathRecord {
  playerId: PlayerId;
  type: DeathType;
  source: DeathSource;
}

interface CommonKillAttempt {
  targetId: PlayerId;
  source: Exclude<DeathSource, "ROMEO_JULIETA">;
}

export interface NightResolutionInput {
  players: readonly PlayerState[];
  actions: NightActions;
  random?: () => number;
}

export interface NightResolution {
  players: PlayerState[];
  deaths: DeathRecord[];
  savedIds: PlayerId[];
  inhibitedIds: PlayerId[];
  protectedId: PlayerId | null;
  detectiveResult: DetectiveResult | null;
  pendingLoverPoison: { loverId: PlayerId } | null;
  privateEvents: string[];
  publicNarration: string;
  result: GameResult;
}

export function resolveNight(input: NightResolutionInput): NightResolution {
  const random = input.random ?? Math.random;
  const players = clonePlayers(input.players);
  const privateEvents: string[] = [];
  const deaths: DeathRecord[] = [];
  const savedIds = new Set<PlayerId>();
  const inhibitedIds = new Set<PlayerId>();
  const commonKillAttempts: CommonKillAttempt[] = [];
  let protectedId: PlayerId | null = null;
  let detectiveResult: DetectiveResult | null = null;
  let pendingLoverPoison: { loverId: PlayerId } | null = null;

  const prostitute = findAliveRole(players, "prostituta")[0];
  const prostitutionTarget = getAlivePlayer(players, input.actions.prostitution?.targetId);

  if (
    prostitute &&
    prostitutionTarget &&
    prostitutionTarget.id !== prostitute.id
  ) {
    inhibitedIds.add(prostitutionTarget.id);
    privateEvents.push(`${prostitute.name} inhibio a ${prostitutionTarget.name}.`);
  }

  const grandma = findAliveRole(players, "abuela")[0] ?? null;
  const grandmaInhibited = grandma ? inhibitedIds.has(grandma.id) : false;

  const enabledMafias = getEnabledActors(players, "mafioso", inhibitedIds);
  const mafiaTarget = getAlivePlayer(players, input.actions.mafiaAttack?.targetId);

  if (mafiaTarget && enabledMafias.length > 0) {
    if (enabledMafias.length === 1 && enabledMafias[0]?.id === mafiaTarget.id) {
      privateEvents.push("El ultimo Mafioso vivo no puede matarse a si mismo.");
    } else if (grandma && mafiaTarget.id === grandma.id && !grandmaInhibited) {
      addGrandmaShot(
        players,
        enabledMafias,
        grandma.id,
        commonKillAttempts,
        privateEvents,
        random,
        "Mafia"
      );
    } else {
      commonKillAttempts.push({ targetId: mafiaTarget.id, source: "MAFIA" });
      privateEvents.push(`La Mafia intento matar a ${mafiaTarget.name}.`);
    }
  }

  const enabledDoctors = getEnabledActors(players, "medico", inhibitedIds);
  const doctorTarget = getAlivePlayer(players, input.actions.doctorProtect?.targetId);

  if (doctorTarget && enabledDoctors.length > 0) {
    if (grandma && doctorTarget.id === grandma.id && !grandmaInhibited) {
      privateEvents.push(
        "Los Medicos apuntaron a la Abuela; la proteccion no se aplica."
      );
      addGrandmaShot(
        players,
        enabledDoctors,
        grandma.id,
        commonKillAttempts,
        privateEvents,
        random,
        "Medicos"
      );
    } else {
      protectedId = doctorTarget.id;
      privateEvents.push(`Los Medicos protegieron a ${doctorTarget.name}.`);
    }
  }

  detectiveResult = resolveDetectiveAction(
    players,
    input.actions.detectiveInvestigate?.targetId,
    inhibitedIds,
    grandma,
    grandmaInhibited,
    commonKillAttempts,
    privateEvents,
    random
  );

  applyCommonKills(
    players,
    commonKillAttempts,
    protectedId,
    grandma,
    grandmaInhibited,
    deaths,
    savedIds,
    privateEvents
  );

  const loverResolution = resolveLoverLink(
    players,
    deaths,
    inhibitedIds,
    input.actions.loverPoison,
    privateEvents
  );
  pendingLoverPoison = loverResolution.pendingLoverPoison;

  return {
    players,
    deaths,
    savedIds: Array.from(savedIds),
    inhibitedIds: Array.from(inhibitedIds),
    protectedId,
    detectiveResult,
    pendingLoverPoison,
    privateEvents,
    publicNarration: buildPublicNarration(players, deaths),
    result: evaluateVictory(players)
  };
}

function clonePlayers(players: readonly PlayerState[]): PlayerState[] {
  return players.map((player) => {
    const clone: PlayerState = { ...player };

    if (player.publicStates) {
      clone.publicStates = [...player.publicStates];
    }

    if (player.secretStates) {
      clone.secretStates = [...player.secretStates];
    }

    return clone;
  });
}

function getAlivePlayer(
  players: readonly PlayerState[],
  playerId: PlayerId | undefined
): PlayerState | null {
  if (!playerId) {
    return null;
  }

  return players.find((player) => player.id === playerId && player.alive) ?? null;
}

function findAliveRole(players: readonly PlayerState[], roleId: RoleId): PlayerState[] {
  return players.filter((player) => player.alive && player.roleId === roleId);
}

function getEnabledActors(
  players: readonly PlayerState[],
  roleId: RoleId,
  inhibitedIds: ReadonlySet<PlayerId>
): PlayerState[] {
  return findAliveRole(players, roleId).filter(
    (player) => !inhibitedIds.has(player.id)
  );
}

function addGrandmaShot(
  players: readonly PlayerState[],
  candidates: readonly PlayerState[],
  grandmaId: PlayerId,
  commonKillAttempts: CommonKillAttempt[],
  privateEvents: string[],
  random: () => number,
  sourceLabel: string
) {
  const victim = pickClosestToTarget(players, candidates, grandmaId, random);

  if (!victim) {
    return;
  }

  commonKillAttempts.push({ targetId: victim.id, source: "GRANDMA" });
  privateEvents.push(
    `La Abuela disparo contra ${victim.name} porque ${sourceLabel} la apunto.`
  );
}

function resolveDetectiveAction(
  players: readonly PlayerState[],
  targetId: PlayerId | undefined,
  inhibitedIds: ReadonlySet<PlayerId>,
  grandma: PlayerState | null,
  grandmaInhibited: boolean,
  commonKillAttempts: CommonKillAttempt[],
  privateEvents: string[],
  random: () => number
): DetectiveResult | null {
  const target = getAlivePlayer(players, targetId);
  const aliveDetectives = findAliveRole(players, "detective");
  const enabledDetectives = aliveDetectives.filter(
    (player) => !inhibitedIds.has(player.id)
  );

  if (!target || aliveDetectives.length === 0) {
    return null;
  }

  const truthful = enabledDetectives.length > 0;
  const truth = isStrictMafia(target);
  const reportedTruth = truthful ? truth : !truth;

  if (grandma && target.id === grandma.id && !grandmaInhibited && truthful) {
    addGrandmaShot(
      players,
      enabledDetectives,
      grandma.id,
      commonKillAttempts,
      privateEvents,
      random,
      "Detective"
    );
  }

  privateEvents.push(
    `Investigacion sobre ${target.name}: ${
      reportedTruth ? "Mafioso" : "No Mafioso"
    }.`
  );

  return {
    targetId: target.id,
    result: reportedTruth ? "MAFIOSO" : "NO_MAFIOSO",
    truthful,
    invertedByInhibition: !truthful
  };
}

function applyCommonKills(
  players: PlayerState[],
  attempts: readonly CommonKillAttempt[],
  protectedId: PlayerId | null,
  grandma: PlayerState | null,
  grandmaInhibited: boolean,
  deaths: DeathRecord[],
  savedIds: Set<PlayerId>,
  privateEvents: string[]
) {
  const targets = new Map<PlayerId, CommonKillAttempt>();

  attempts.forEach((attempt) => {
    targets.set(attempt.targetId, attempt);
  });

  targets.forEach((attempt, targetId) => {
    const target = getAlivePlayer(players, targetId);

    if (!target) {
      return;
    }

    if (target.id === protectedId) {
      savedIds.add(target.id);
      privateEvents.push(`${target.name} fue salvado por los Medicos.`);
      return;
    }

    if (grandma && target.id === grandma.id && !grandmaInhibited) {
      savedIds.add(target.id);
      privateEvents.push("La Abuela resistio un asesinato comun por su blindaje.");
      return;
    }

    target.alive = false;
    deaths.push({ playerId: target.id, type: "COMMON_MURDER", source: attempt.source });
    privateEvents.push(`${target.name} murio por asesinato comun.`);
  });
}

function resolveLoverLink(
  players: PlayerState[],
  deaths: DeathRecord[],
  inhibitedIds: ReadonlySet<PlayerId>,
  loverPoison: NightActions["loverPoison"],
  privateEvents: string[]
): { pendingLoverPoison: { loverId: PlayerId } | null } {
  const lovers = players.filter(
    (player) => player.roleId === "romeo" || player.roleId === "julieta"
  );
  const commonDeadLovers = deaths.filter((death) => {
    const deadPlayer = players.find((player) => player.id === death.playerId);

    return (
      death.type === "COMMON_MURDER" &&
      (deadPlayer?.roleId === "romeo" || deadPlayer?.roleId === "julieta")
    );
  });

  if (commonDeadLovers.length !== 1) {
    return { pendingLoverPoison: null };
  }

  const survivor = lovers.find((lover) => lover.alive);

  if (!survivor) {
    return { pendingLoverPoison: null };
  }

  survivor.alive = false;
  deaths.push({
    playerId: survivor.id,
    type: "LINK",
    source: "ROMEO_JULIETA"
  });
  privateEvents.push(`${survivor.name} murio por vinculo de Romeo y Julieta.`);

  if (inhibitedIds.has(survivor.id)) {
    privateEvents.push(`${survivor.name} estaba inhibido y no enveneno.`);
    return { pendingLoverPoison: null };
  }

  if (!loverPoison || loverPoison.loverId !== survivor.id) {
    return { pendingLoverPoison: { loverId: survivor.id } };
  }

  const target = getAlivePlayer(players, loverPoison.targetId);

  if (!target || target.id === survivor.id || isLover(target)) {
    return { pendingLoverPoison: { loverId: survivor.id } };
  }

  target.alive = false;
  deaths.push({
    playerId: target.id,
    type: "POISON",
    source: "ROMEO_JULIETA"
  });
  privateEvents.push(`${survivor.name} enveneno a ${target.name}.`);

  return { pendingLoverPoison: null };
}

function isStrictMafia(player: PlayerState): boolean {
  return Boolean(player.roleId && roleDefinitions[player.roleId].strictMafia);
}

function isLover(player: PlayerState): boolean {
  return player.roleId === "romeo" || player.roleId === "julieta";
}

function buildPublicNarration(
  players: readonly PlayerState[],
  deaths: readonly DeathRecord[]
): string {
  const deadNames = deaths
    .map((death) => players.find((player) => player.id === death.playerId)?.name)
    .filter((name): name is string => Boolean(name));

  if (deadNames.length === 0) {
    return "La ciudad despierta.\nNo murio nadie.";
  }

  if (deadNames.length === 1) {
    return `La ciudad despierta.\nMurio ${deadNames[0]}.`;
  }

  return `La ciudad despierta.\nMurieron ${deadNames.join(", ")}.`;
}
