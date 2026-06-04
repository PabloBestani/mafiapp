import type { RoleDefinition, RoleId } from "../domain/types";

export const roleDefinitions: Record<RoleId, RoleDefinition> = {
  civil: {
    id: "civil",
    name: "Civil",
    team: "pueblo",
    strictMafia: false,
    countsAsNonMafiaAlive: true,
    nightAction: "none",
    identifiesOnFirstNight: false,
    groupAction: false,
    callOrder: null,
    maxCopies: 7
  },
  mafioso: {
    id: "mafioso",
    name: "Mafioso",
    team: "mafia",
    strictMafia: true,
    countsAsNonMafiaAlive: false,
    nightAction: "mafia-kill",
    identifiesOnFirstNight: true,
    groupAction: true,
    callOrder: 4,
    maxCopies: 5
  },
  medico: {
    id: "medico",
    name: "Medico",
    team: "pueblo",
    strictMafia: false,
    countsAsNonMafiaAlive: true,
    nightAction: "doctor-protect",
    identifiesOnFirstNight: true,
    groupAction: true,
    callOrder: 5,
    maxCopies: 3
  },
  detective: {
    id: "detective",
    name: "Detective",
    team: "pueblo",
    strictMafia: false,
    countsAsNonMafiaAlive: true,
    nightAction: "detective-investigate",
    identifiesOnFirstNight: true,
    groupAction: true,
    callOrder: 6,
    maxCopies: 3
  },
  abuela: {
    id: "abuela",
    name: "Abuela con Escopeta",
    team: "pueblo",
    strictMafia: false,
    countsAsNonMafiaAlive: true,
    nightAction: "passive",
    identifiesOnFirstNight: true,
    groupAction: false,
    callOrder: 1,
    maxCopies: 1
  },
  romeo: {
    id: "romeo",
    name: "Romeo",
    team: "pueblo",
    strictMafia: false,
    countsAsNonMafiaAlive: true,
    nightAction: "none",
    identifiesOnFirstNight: true,
    groupAction: false,
    callOrder: 2,
    maxCopies: 1
  },
  julieta: {
    id: "julieta",
    name: "Julieta",
    team: "pueblo",
    strictMafia: false,
    countsAsNonMafiaAlive: true,
    nightAction: "none",
    identifiesOnFirstNight: true,
    groupAction: false,
    callOrder: 2,
    maxCopies: 1
  },
  prostituta: {
    id: "prostituta",
    name: "Prostituta",
    team: "mafia",
    strictMafia: false,
    countsAsNonMafiaAlive: true,
    nightAction: "prostitute-inhibit",
    identifiesOnFirstNight: true,
    groupAction: false,
    callOrder: 3,
    maxCopies: 1
  }
};

export const roleCallOrder: RoleId[] = [
  "abuela",
  "romeo",
  "julieta",
  "prostituta",
  "mafioso",
  "medico",
  "detective",
  "civil"
];

export type DeckValidation =
  | { valid: true; totalCards: number; playerCount: number }
  | {
      valid: false;
      totalCards: number;
      playerCount: number;
      missingCards: number;
      extraCards: number;
      roleErrors: Array<{ roleId: RoleId; count: number; max: number }>;
    };

export function getRoleDefinition(roleId: RoleId): RoleDefinition {
  return roleDefinitions[roleId];
}

export function countDeckCards(deck: Partial<Record<RoleId, number>>): number {
  return Object.values(deck).reduce((sum, count) => sum + (count ?? 0), 0);
}

export function validateDeckConfiguration(
  deck: Partial<Record<RoleId, number>>,
  playerCount: number
): DeckValidation {
  const totalCards = countDeckCards(deck);
  const roleErrors = roleCallOrder.flatMap((roleId) => {
    const count = deck[roleId] ?? 0;
    const max = roleDefinitions[roleId].maxCopies;

    return count > max ? [{ roleId, count, max }] : [];
  });
  const valid = totalCards === playerCount && roleErrors.length === 0;

  if (valid) {
    return { valid: true, totalCards, playerCount };
  }

  return {
    valid: false,
    totalCards,
    playerCount,
    missingCards: Math.max(playerCount - totalCards, 0),
    extraCards: Math.max(totalCards - playerCount, 0),
    roleErrors
  };
}

export function completeWithCivilians(
  deck: Partial<Record<RoleId, number>>,
  playerCount: number
): Partial<Record<RoleId, number>> {
  const currentCivilCount = deck.civil ?? 0;
  const missingCards = Math.max(playerCount - countDeckCards(deck), 0);
  const nextCivilCount = Math.min(
    currentCivilCount + missingCards,
    roleDefinitions.civil.maxCopies
  );

  return {
    ...deck,
    civil: nextCivilCount
  };
}
