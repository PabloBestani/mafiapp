import { describe, expect, it } from "vitest";

import {
  completeWithCivilians,
  roleDefinitions,
  validateDeckConfiguration
} from "./roles";

describe("role catalog", () => {
  it("keeps the V1 role limits from the specs", () => {
    expect(roleDefinitions.mafioso.maxCopies).toBe(5);
    expect(roleDefinitions.detective.maxCopies).toBe(3);
    expect(roleDefinitions.medico.maxCopies).toBe(3);
    expect(roleDefinitions.prostituta.maxCopies).toBe(1);
    expect(roleDefinitions.abuela.maxCopies).toBe(1);
    expect(roleDefinitions.romeo.maxCopies).toBe(1);
    expect(roleDefinitions.julieta.maxCopies).toBe(1);
    expect(roleDefinitions.civil.maxCopies).toBe(7);
  });

  it("rejects role counts above the V1 maximum", () => {
    const validation = validateDeckConfiguration(
      {
        mafioso: 6,
        civil: 1
      },
      7
    );

    expect(validation.valid).toBe(false);
    expect(validation.valid ? [] : validation.roleErrors).toEqual([
      { roleId: "mafioso", count: 6, max: 5 }
    ]);
  });

  it("fills missing cards with civilians up to the V1 civil limit", () => {
    const deck = completeWithCivilians({ mafioso: 2, civil: 1 }, 5);

    expect(deck).toEqual({ mafioso: 2, civil: 3 });
  });
});
