import { describe, it, expect } from "vitest";
import { getEffectiveOwner } from "./store-db";

describe("getEffectiveOwner", () => {
  it("returns owner_id when set", () => {
    const row = {
      owner_id: "00000000-0000-4000-8000-000000000001",
      preserved_owner_id: null,
    };
    expect(getEffectiveOwner(row)).toBe("00000000-0000-4000-8000-000000000001");
  });

  it("returns preserved_owner_id when owner_id is null (deleted user)", () => {
    const row = {
      owner_id: null,
      preserved_owner_id: "00000000-0000-4000-8000-000000000002",
    };
    expect(getEffectiveOwner(row)).toBe("00000000-0000-4000-8000-000000000002");
  });

  it("returns null when both are null", () => {
    const row = { owner_id: null, preserved_owner_id: null };
    expect(getEffectiveOwner(row)).toBe(null);
  });

  it("prefers owner_id over preserved_owner_id when both set", () => {
    const row = {
      owner_id: "aaaaaaaa-0000-4000-8000-000000000001",
      preserved_owner_id: "bbbbbbbb-0000-4000-8000-000000000002",
    };
    expect(getEffectiveOwner(row)).toBe("aaaaaaaa-0000-4000-8000-000000000001");
  });

  it("accepts row without preserved_owner_id (legacy shape)", () => {
    const row = { owner_id: "00000000-0000-4000-8000-000000000001" };
    expect(getEffectiveOwner(row)).toBe("00000000-0000-4000-8000-000000000001");
  });
});
