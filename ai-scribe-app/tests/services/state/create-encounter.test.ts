import { describe, it, expect } from "vitest";
import { createEncounter } from "@/services/state/create-encounter";

describe("createEncounter", () => {
  it("creates an encounter with correct defaults", () => {
    const encounter = createEncounter("temp-1");
    expect(encounter.id).toBe("temp-1");
    expect(encounter.label).toBeNull();
    expect(encounter.autolabel).toBeNull();
    expect(encounter.context).toBeNull();
    expect(encounter.draftNotes).toEqual([]);
    expect(encounter.isPersisted).toBe(false);
  });

  it("produces a valid ISO timestamp for created", () => {
    const encounter = createEncounter("temp-1");
    expect(() => new Date(encounter.created)).not.toThrow();
    expect(new Date(encounter.created).toISOString()).toBe(encounter.created);
  });

  it("sets modified equal to created", () => {
    const encounter = createEncounter("temp-1");
    expect(encounter.modified).toBe(encounter.created);
  });

  it("uses the provided context", () => {
    const encounter = createEncounter("temp-2", "patient context");
    expect(encounter.context).toBe("patient context");
    expect(encounter.id).toBe("temp-2");
  });

  it("produces recent timestamps", () => {
    const before = new Date();
    const encounter = createEncounter("temp-3");
    const after = new Date();

    const createdTime = new Date(encounter.created).getTime();
    expect(createdTime).toBeGreaterThanOrEqual(before.getTime());
    expect(createdTime).toBeLessThanOrEqual(after.getTime());
  });
});
