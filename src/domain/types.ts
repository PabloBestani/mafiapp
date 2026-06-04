export const roleIds = [
  "civil",
  "mafioso",
  "medico",
  "detective",
  "abuela",
  "romeo",
  "julieta",
  "prostituta"
] as const;

export type RoleId = (typeof roleIds)[number];

export type PlayerId = string;

export type PlayerKind = "frequent" | "guest";

export type PlayerGender = "hombre" | "mujer";

export type Team = "pueblo" | "mafia";

export type GameStatus =
  | "SETUP"
  | "FIRST_NIGHT_IDENTIFICATION_AND_ACTIONS"
  | "NIGHT_ACTIONS"
  | "NIGHT_RESOLUTION_PREVIEW"
  | "NIGHT_RESOLUTION_CONFIRMED"
  | "DAY_DISCUSSION"
  | "DAY_VOTING"
  | "DAY_DEFENSE"
  | "DAY_VOTE_CHANGES"
  | "DAY_EXECUTION_CONFIRMED"
  | "GAME_OVER";

export type GameResult =
  | "PUEBLO"
  | "MAFIA"
  | "EMPATE"
  | "SIN_RESULTADO"
  | "CANCELADA";

export type NightActionKind =
  | "none"
  | "mafia-kill"
  | "doctor-protect"
  | "detective-investigate"
  | "prostitute-inhibit"
  | "passive";

export interface RoleDefinition {
  id: RoleId;
  name: string;
  team: Team;
  strictMafia: boolean;
  countsAsNonMafiaAlive: boolean;
  nightAction: NightActionKind;
  identifiesOnFirstNight: boolean;
  groupAction: boolean;
  callOrder: number | null;
  maxCopies: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  gender: PlayerGender;
  roleId?: RoleId;
  alive: boolean;
  seatIndex: number;
  publicStates?: string[];
  secretStates?: string[];
}

export interface PlayerProfile {
  id: PlayerId;
  name: string;
  kind: PlayerKind;
  gender: PlayerGender;
  createdAt: string;
  updatedAt: string;
}

export interface LastGameSetup {
  activePlayerIds: PlayerId[];
  seatingOrder: PlayerId[];
  deck: Partial<Record<RoleId, number>>;
}

export interface GameState {
  id: string;
  status: GameStatus;
  day: number;
  night: number;
  players: PlayerState[];
  deck: Partial<Record<RoleId, number>>;
  privateLog: PrivateLogEntry[];
  publicLog: string[];
  result: GameResult;
}

export type PrivateLogEvent =
  | "ROLE_ASSIGNED"
  | "NIGHT_ACTION_REGISTERED"
  | "NIGHT_EFFECT_APPLIED"
  | "PLAYER_DIED"
  | "PLAYER_SAVED"
  | "PLAYER_INHIBITED"
  | "INVESTIGATION_RESULT"
  | "SEATING_ORDER_CHANGED"
  | "VOTING_ORDER_GENERATED"
  | "VOTING_ORDER_REROLLED"
  | "VOTE_CAST"
  | "VOTE_CHANGED"
  | "PLAYER_DEFENDED"
  | "LYNCH_CONFIRMED"
  | "UNDO"
  | "MANUAL_CORRECTION"
  | "WIN_CONDITION_EVALUATED"
  | "GAME_CANCELLED";

export interface PrivateLogEntry {
  id: string;
  event: PrivateLogEvent;
  message: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
