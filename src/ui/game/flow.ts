import { completeWithCivilians, roleDefinitions, validateDeckConfiguration } from "../../data/roles";
import { formatPlayerNames, gendered } from "../../domain/copy";
import { castVoteWithLoverLink, resolveVotingOutcome, type VoteMap } from "../../domain/voting";
import type {
  GameResult,
  GameState,
  PlayerId,
  PlayerProfile,
  PlayerState,
  PrivateLogEntry,
  RoleId
} from "../../domain/types";
import type { DeathRecord, NightResolution } from "../../domain/night";
import { evaluateVictory } from "../../domain/victory";

export const setupRoleOrder: RoleId[] = [
  "mafioso",
  "prostituta",
  "medico",
  "detective",
  "abuela",
  "romeo",
  "julieta",
  "civil"
];

export const firstNightIdentificationOrder: RoleId[] = [
  "abuela",
  "romeo",
  "julieta",
  "prostituta",
  "mafioso",
  "medico",
  "detective"
];

export const nightActionOrder: RoleId[] = [
  "prostituta",
  "mafioso",
  "medico",
  "detective"
];

export interface RoleStep {
  roleId: RoleId;
  requiredCount: number;
  selectedIds: PlayerId[];
}

export interface NewGameDraft {
  selectedPlayerIds: PlayerId[];
  seatingOrder: PlayerId[];
  deck: Partial<Record<RoleId, number>>;
}

export interface VotingSession {
  order: PlayerId[];
  index: number;
  votes: VoteMap;
  defendedToday: PlayerId[];
  rerolled: boolean;
}

export interface LynchResolution {
  players: PlayerState[];
  deaths: DeathRecord[];
  publicNarration: string;
  result: GameResult;
}

export function createEmptyDraft(): NewGameDraft {
  return {
    selectedPlayerIds: [],
    seatingOrder: [],
    deck: {}
  };
}

export function createDraftFromGame(game: GameState): NewGameDraft {
  const orderedPlayers = game.players
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex);

  return {
    selectedPlayerIds: orderedPlayers.map((player) => player.id),
    seatingOrder: orderedPlayers.map((player) => player.id),
    deck: { ...game.deck }
  };
}

export function toggleSelectedPlayer(
  draft: NewGameDraft,
  playerId: PlayerId
): NewGameDraft {
  const selected = draft.selectedPlayerIds.includes(playerId);
  const selectedPlayerIds = selected
    ? draft.selectedPlayerIds.filter((id) => id !== playerId)
    : [...draft.selectedPlayerIds, playerId];
  const seatingOrder = selected
    ? draft.seatingOrder.filter((id) => id !== playerId)
    : [...draft.seatingOrder, playerId];

  return {
    ...draft,
    selectedPlayerIds,
    seatingOrder
  };
}

export function moveSeat(
  seatingOrder: PlayerId[],
  playerId: PlayerId,
  direction: -1 | 1
): PlayerId[] {
  const index = seatingOrder.indexOf(playerId);
  const targetIndex = index + direction;

  if (index === -1 || targetIndex < 0 || targetIndex >= seatingOrder.length) {
    return seatingOrder;
  }

  const next = [...seatingOrder];
  const currentValue = next[index] as PlayerId;
  const targetValue = next[targetIndex] as PlayerId;
  next[index] = targetValue;
  next[targetIndex] = currentValue;

  return next;
}

export function moveSeatToIndex(
  seatingOrder: PlayerId[],
  playerId: PlayerId,
  targetIndex: number
): PlayerId[] {
  const currentIndex = seatingOrder.indexOf(playerId);
  const nextIndex = Math.max(0, Math.min(seatingOrder.length - 1, targetIndex));

  if (currentIndex === -1 || currentIndex === nextIndex) {
    return seatingOrder;
  }

  const next = [...seatingOrder];
  const [moved] = next.splice(currentIndex, 1);

  if (!moved) {
    return seatingOrder;
  }

  next.splice(nextIndex, 0, moved);

  return next;
}

export function movePlayerSeat(
  game: GameState,
  playerId: PlayerId,
  direction: -1 | 1,
  now: () => string
): GameState {
  const orderedIds = game.players
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex)
    .map((player) => player.id);
  const movedIds = moveSeat(orderedIds, playerId, direction);
  const movedNames = movedIds
    .map((id) => game.players.find((player) => player.id === id)?.name ?? id)
    .join(", ");
  const nextPlayers = game.players.map((player) => ({
    ...player,
    seatIndex: movedIds.indexOf(player.id)
  }));

  return appendPrivateEvent(
    { ...game, players: nextPlayers },
    "SEATING_ORDER_CHANGED",
    `Dios corrigió el orden de asiento: ${movedNames}.`,
    now
  );
}

export function setRoleCount(
  draft: NewGameDraft,
  roleId: RoleId,
  count: number
): NewGameDraft {
  const max = roleDefinitions[roleId].maxCopies;
  const nextCount = Math.max(0, Math.min(max, count));

  return {
    ...draft,
    deck: {
      ...draft.deck,
      [roleId]: nextCount
    }
  };
}

export function completeDraftWithCivilians(draft: NewGameDraft): NewGameDraft {
  return {
    ...draft,
    deck: completeWithCivilians(draft.deck, draft.selectedPlayerIds.length)
  };
}

export function canStartGame(draft: NewGameDraft): boolean {
  return (
    draft.selectedPlayerIds.length > 0 &&
    draft.seatingOrder.length === draft.selectedPlayerIds.length &&
    validateDeckConfiguration(draft.deck, draft.selectedPlayerIds.length).valid
  );
}

export function createGameFromDraft(
  id: string,
  players: PlayerProfile[],
  draft: NewGameDraft,
  now: () => string
): GameState {
  if (!canStartGame(draft)) {
    throw new Error("Draft must be valid before creating a game.");
  }

  const activePlayers = draft.seatingOrder.map<PlayerState>((playerId, seatIndex) => {
    const profile = players.find((candidate) => candidate.id === playerId);

    if (!profile) {
      throw new Error(`Missing player ${playerId}.`);
    }

      return {
        id: profile.id,
        name: profile.name,
        gender: profile.gender,
        alive: true,
        seatIndex
      };
  });

  return {
    id,
    status: "SETUP",
    day: 0,
    night: 0,
    players: activePlayers,
    deck: draft.deck,
    privateLog: [
      createPrivateLog(id, 0, "SEATING_ORDER_CHANGED", "Partida creada.", now)
    ],
    publicLog: [],
    result: "SIN_RESULTADO"
  };
}

export function buildFirstNightSteps(
  deck: Partial<Record<RoleId, number>>,
  players: readonly PlayerState[]
): RoleStep[] {
  return firstNightIdentificationOrder
    .map((roleId) => ({
      roleId,
      requiredCount: deck[roleId] ?? 0,
      selectedIds: players
        .filter((player) => player.roleId === roleId)
        .map((player) => player.id)
    }))
    .filter((step) => step.requiredCount > 0);
}

export function assignRole(
  game: GameState,
  roleId: RoleId,
  playerIds: readonly PlayerId[],
  now: () => string
): GameState {
  const assignedIds = new Set(playerIds);
  const nextPlayers = game.players.map((player) => {
    if (player.roleId === roleId && !assignedIds.has(player.id)) {
      const { roleId: _roleId, ...playerWithoutRole } = player;
      return playerWithoutRole;
    }

    if (assignedIds.has(player.id)) {
      return { ...player, roleId };
    }

    return player;
  });

  return appendPrivateEvent(
    { ...game, players: nextPlayers },
    "ROLE_ASSIGNED",
    formatRoleAssignment(nextPlayers, roleId, playerIds),
    now
  );
}

export function correctPlayerRole(
  game: GameState,
  playerId: PlayerId,
  roleId: RoleId,
  now: () => string
): GameState {
  const player = game.players.find((candidate) => candidate.id === playerId);
  const nextPlayers = game.players.map((candidate) =>
    candidate.id === playerId ? { ...candidate, roleId } : candidate
  );

  return appendPrivateEvent(
    { ...game, players: nextPlayers },
    "MANUAL_CORRECTION",
    `Dios corrigió el rol de ${player?.name ?? playerId} a ${roleDefinitions[roleId].name}.`,
    now
  );
}

export function togglePlayerAlive(
  game: GameState,
  playerId: PlayerId,
  now: () => string
): GameState {
  const player = game.players.find((candidate) => candidate.id === playerId);
  const nextPlayers = game.players.map((candidate) =>
    candidate.id === playerId ? { ...candidate, alive: !candidate.alive } : candidate
  );
  const nextAlive = nextPlayers.find((candidate) => candidate.id === playerId)?.alive;

  return appendPrivateEvent(
    { ...game, players: nextPlayers },
    "MANUAL_CORRECTION",
    `Dios corrigió el estado de ${player?.name ?? playerId}: ${nextAlive ? gendered(player, "vivo", "viva") : gendered(player, "muerto", "muerta")}.`,
    now
  );
}

export function addPrivateNote(
  game: GameState,
  note: string,
  now: () => string
): GameState {
  return appendPrivateEvent(
    game,
    "MANUAL_CORRECTION",
    `Nota de Dios: ${note.trim()}`,
    now
  );
}

export function inferCivilianRoles(game: GameState, now: () => string): GameState {
  const previousCivilianIds = new Set(
    game.players
      .filter((player) => player.roleId === "civil")
      .map((player) => player.id)
  );
  const nextPlayers = game.players.map((player) =>
    player.roleId ? player : { ...player, roleId: "civil" as const }
  );
  const inferredCivilians = nextPlayers.filter(
    (player) => player.roleId === "civil" && !previousCivilianIds.has(player.id)
  );

  return appendPrivateEvent(
    {
      ...game,
      status: "NIGHT_ACTIONS",
      night: Math.max(game.night, 1),
      players: nextPlayers
    },
    "ROLE_ASSIGNED",
    inferredCivilians.length > 0
      ? `${formatPlayerNames(inferredCivilians)} ${inferredCivilians.length === 1 ? "queda" : "quedan"} como ${roleNameForCount("civil", inferredCivilians.length)}.`
      : "No quedaban Civiles por cerrar.",
    now
  );
}

export function canInferCivilians(game: GameState): boolean {
  return firstNightIdentificationOrder.every((roleId) => {
    const required = game.deck[roleId] ?? 0;
    const assigned = game.players.filter((player) => player.roleId === roleId).length;

    return assigned === required;
  });
}

export function buildNightActionSteps(game: GameState): RoleStep[] {
  return nightActionOrder
    .map((roleId) => ({
      roleId,
      requiredCount: game.deck[roleId] ?? 0,
      selectedIds: []
    }))
    .filter((step) => step.requiredCount > 0);
}

export function applyNightResolution(
  game: GameState,
  resolution: NightResolution,
  now: () => string
): GameState {
  let withPrivateEvents: GameState = {
    ...game,
    players: resolution.players,
    publicLog: [...game.publicLog, resolution.publicNarration],
    result: resolution.result,
    status: resolution.result === "SIN_RESULTADO" ? "DAY_DISCUSSION" : "GAME_OVER",
    day: resolution.result === "SIN_RESULTADO" ? Math.max(game.day, 1) : game.day
  };

  for (const message of resolution.privateEvents) {
    withPrivateEvents = appendPrivateEvent(
      withPrivateEvents,
      "NIGHT_EFFECT_APPLIED",
      message,
      now
    );
  }

  return appendPrivateEvent(
    withPrivateEvents,
    "WIN_CONDITION_EVALUATED",
    `Resultado: ${resolution.result}.`,
    now
  );
}

export function createVotingSession(
  players: readonly PlayerState[],
  random: () => number = Math.random
): VotingSession {
  const alive = players
    .filter((player) => player.alive)
    .slice()
    .sort((a, b) => a.seatIndex - b.seatIndex);
  const startIndex = alive.length === 0 ? 0 : Math.floor(random() * alive.length);
  const clockwise = random() >= 0.5;
  const rotated = alive.map((_, offset) => {
    const step = clockwise ? offset : -offset;
    const index = (startIndex + step + alive.length) % alive.length;

    return alive[index]?.id;
  });

  return {
    order: rotated.filter((id): id is PlayerId => Boolean(id)),
    index: 0,
    votes: {},
    defendedToday: [],
    rerolled: false
  };
}

export function rerollVotingSession(
  players: readonly PlayerState[],
  current: VotingSession,
  random: () => number = Math.random
): VotingSession {
  if (current.rerolled || current.index > 0 || Object.keys(current.votes).length > 0) {
    return current;
  }

  return {
    ...createVotingSession(players, random),
    rerolled: true
  };
}

export function castCurrentVote(
  players: readonly PlayerState[],
  session: VotingSession,
  targetId: PlayerId
): VotingSession {
  const voterId = session.order[session.index];

  if (!voterId) {
    return session;
  }

  return {
    ...session,
    votes: castVoteWithLoverLink(players, session.votes, voterId, targetId),
    index: Math.min(session.index + 1, session.order.length)
  };
}

export function changeVote(
  players: readonly PlayerState[],
  session: VotingSession,
  voterId: PlayerId,
  targetId: PlayerId
): VotingSession {
  return {
    ...session,
    votes: castVoteWithLoverLink(players, session.votes, voterId, targetId),
    index: session.order.length
  };
}

export function getVotingOutcome(session: VotingSession) {
  return resolveVotingOutcome(
    session.order,
    session.votes,
    new Set(session.defendedToday)
  );
}

export function applyDefense(session: VotingSession, defendantId: PlayerId): VotingSession {
  return {
    ...session,
    defendedToday: session.defendedToday.includes(defendantId)
      ? session.defendedToday
      : [...session.defendedToday, defendantId]
  };
}

export function resetVoteChangeCycle(session: VotingSession): VotingSession {
  return {
    ...session,
    index: session.order.length
  };
}

export function applyLynch(
  game: GameState,
  executedId: PlayerId,
  poisonTargetId: PlayerId | null,
  now: () => string
): LynchResolution {
  const players = game.players.map((player) => ({ ...player }));
  const deaths: DeathRecord[] = [];
  const executed = players.find((player) => player.id === executedId && player.alive);

  if (!executed) {
    return {
      players,
      deaths,
      publicNarration: "No hubo linchamiento.",
      result: evaluateVictory(players)
    };
  }

  executed.alive = false;
  deaths.push({ playerId: executed.id, type: "COMMON_MURDER", source: "LYNCH" });

  if (executed.roleId === "romeo" || executed.roleId === "julieta") {
    const partner = players.find(
      (player) =>
        player.alive &&
        (player.roleId === "romeo" || player.roleId === "julieta") &&
        player.id !== executed.id
    );

    if (partner) {
      partner.alive = false;
      deaths.push({
        playerId: partner.id,
        type: "LINK",
        source: "ROMEO_JULIETA"
      });

      const poisonTarget = poisonTargetId
        ? players.find((player) => player.id === poisonTargetId && player.alive)
        : null;

      if (poisonTarget && poisonTarget.id !== partner.id) {
        poisonTarget.alive = false;
        deaths.push({
          playerId: poisonTarget.id,
          type: "POISON",
          source: "ROMEO_JULIETA"
        });
      }
    }
  }

  void now;

  return {
    players,
    deaths,
    publicNarration: buildDayPublicNarration(players, deaths),
    result: evaluateVictory(players)
  };
}

export function applyConfirmedLynch(
  game: GameState,
  lynch: LynchResolution,
  now: () => string
): GameState {
  const deadNames = lynch.deaths.map((death) => findPlayerName(lynch.players, death.playerId));
  const nextStatus = lynch.result === "SIN_RESULTADO" ? "NIGHT_ACTIONS" : "GAME_OVER";

  return appendPrivateEvent(
    {
      ...game,
      players: lynch.players,
      publicLog: [...game.publicLog, lynch.publicNarration],
      status: nextStatus,
      night: nextStatus === "NIGHT_ACTIONS" ? game.night + 1 : game.night,
      result: lynch.result
    },
    "LYNCH_CONFIRMED",
    `Linchamiento confirmado: ${deadNames.join(", ")}. Resultado: ${lynch.result}.`,
    now
  );
}

export function appendPrivateEvent(
  game: GameState,
  event: PrivateLogEntry["event"],
  message: string,
  now: () => string
): GameState {
  return {
    ...game,
    privateLog: [
      ...game.privateLog,
      createPrivateLog(game.id, game.privateLog.length, event, message, now)
    ]
  };
}

function createPrivateLog(
  gameId: string,
  index: number,
  event: PrivateLogEntry["event"],
  message: string,
  now: () => string
): PrivateLogEntry {
  return {
    id: `${gameId}:log:${index + 1}`,
    event,
    message,
    createdAt: now()
  };
}

function buildDayPublicNarration(
  players: readonly PlayerState[],
  deaths: readonly DeathRecord[]
): string {
  const names = deaths.map((death) => findPlayerName(players, death.playerId));

  if (names.length === 0) {
    return "No hubo linchamiento.";
  }

  if (names.length === 1) {
    const player = players.find((candidate) => candidate.id === deaths[0]?.playerId);
    return `${names[0]} ${gendered(player, "fue linchado", "fue linchada")}.`;
  }

  return `Murieron por votación ${names.join(", ")}.`;
}

function formatRoleAssignment(
  players: readonly PlayerState[],
  roleId: RoleId,
  playerIds: readonly PlayerId[]
): string {
  const assignedPlayers = players.filter((player) => playerIds.includes(player.id));

  if (assignedPlayers.length === 0) {
    return `${roleNameForCount(roleId, 1)}: sin asignar.`;
  }

  return `${formatPlayerNames(assignedPlayers)} ${assignedPlayers.length === 1 ? "es" : "son"} ${roleNameForCount(roleId, assignedPlayers.length)}.`;
}

function roleNameForCount(roleId: RoleId, count: number): string {
  if (count === 1) {
    return roleDefinitions[roleId].name;
  }

  if (roleId === "mafioso") return "Mafiosos";
  if (roleId === "medico") return "Médicos";
  if (roleId === "detective") return "Detectives";
  if (roleId === "civil") return "Civiles";
  if (roleId === "abuela") return "Abuelas";
  if (roleId === "prostituta") return "Prostitutas";

  return roleDefinitions[roleId].name;
}

function findPlayerName(players: readonly PlayerState[], playerId: PlayerId): string {
  return players.find((player) => player.id === playerId)?.name ?? playerId;
}
