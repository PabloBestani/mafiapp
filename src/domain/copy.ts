import type { PlayerState } from "./types";

export function formatPlayerNames(players: readonly Pick<PlayerState, "name">[]): string {
  const names = players.map((player) => player.name);

  if (names.length === 0) return "";
  if (names.length === 1) return names[0] as string;
  if (names.length === 2) return `${names[0]} y ${names[1]}`;

  return `${names.slice(0, -1).join(", ")} y ${names[names.length - 1]}`;
}

export function pluralVerb(
  players: readonly unknown[],
  singular: string,
  plural: string
): string {
  return players.length === 1 ? singular : plural;
}

export function gendered(
  player: Pick<PlayerState, "gender"> | undefined,
  masculine: string,
  feminine: string
): string {
  return player?.gender === "mujer" ? feminine : masculine;
}
