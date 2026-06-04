import { completeWithCivilians, roleDefinitions, validateDeckConfiguration } from "../../data/roles";
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
    `${roleDefinitions[roleId].name}: ${playerIds.length} asignado(s).`,
    now
  );
}

export function inferCivilianRoles(game: GameState, now: () => string): GameState {
  const nextPlayers = game.players.map((player) =>
    player.roleId ? player : { ...player, roleId: "civil" as const }
  );

  return appendPrivateEvent(
    {
      ...game,
      status: "NIGHT_ACTIONS",
      night: Math.max(game.night, 1),
      players: nextPlayers
    },
    "ROLE_ASSIGNED",
    "Civiles inferidos automáticamente.",
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
      requiredCount: game.players.filter(
        (player) => player.alive && player.roleId === roleId
      ).length,
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
    return `Fue linchado ${names[0]}.`;
  }

  return `Fueron linchados ${names.join(", ")}.`;
}

function findPlayerName(players: readonly PlayerState[], playerId: PlayerId): string {
  return players.find((player) => player.id === playerId)?.name ?? playerId;
}
